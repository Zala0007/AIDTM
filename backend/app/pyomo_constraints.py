"""
Pyomo constraint applicator for strategic IU/IUGU bounds parsed from IUGUConstraint.csv.

This utility mirrors the three-case logic used in the PuLP solver but is written for
Pyomo models that define a shipment decision variable ``X[iu, dst, mode, t]``.

Cases (per row):
  1) Global IU outbound: TRANSPORT CODE empty, IUGU CODE empty
     sum_{j,m} X[i,j,m,t]
  2) Mode-specific outbound: TRANSPORT CODE present, IUGU CODE empty
     sum_{j} X[i,j,m,t]
  3) Route-specific: TRANSPORT CODE present, IUGU CODE present
     X[i,j,m,t]

Bound types: L (>=), U (<=), E (=)

Additional handling:
  - Blank transport_code applies to all modes; if ``mode_fallback`` is provided,
    it will be used when no modes exist for the IU in the model index set.
  - Blank destination applies to all destinations reachable from the IU (derived
    from the index set of the decision variable).
  - Uses ConstraintList to allow multiple constraints per IU.
"""
from __future__ import annotations

from typing import Iterable, Sequence, Optional, List

import pandas as pd
from pydantic import BaseModel, Field
from pydantic import ConfigDict
from pyomo.environ import Constraint, ConstraintList


def _coerce_str(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    s = str(value).strip()
    return s or None


class IUGUConstraintSchema(BaseModel):
    """Validated representation of a constraint row (pydantic v2)."""

    model_config = ConfigDict(populate_by_name=True)

    iu_code: str = Field(..., alias="IU CODE")
    transport_code: Optional[str] = Field(None, alias="TRANSPORT CODE")
    iugu_code: Optional[str] = Field(None, alias="IUGU CODE")
    time_period: int = Field(..., alias="TIME PERIOD")
    bound_type: str = Field(..., alias="BOUND TYPEID")
    value: float = Field(..., alias="Value")


def apply_strategic_constraints(model, constraints_list: Sequence[IUGUConstraintSchema], *, mode_fallback: Sequence[str] | None = ("t1", "t2")) -> None:
    """Apply IU outbound constraints to a Pyomo model using the 3-case strategy.

    Expects a decision variable ``qty[iu, dst, mode, t]`` on the model.
    Safely skips rows whose indices are not present in the model sets.
    """

    if not hasattr(model, "qty"):
        raise AttributeError("Model must define decision variable 'qty' indexed by (iu, dst, mode, t)")

    try:
        index_keys: Iterable[tuple] = list(model.qty.keys())
    except Exception as exc:  # pragma: no cover
        raise RuntimeError("Unable to introspect model.qty indices") from exc

    dest_by_iu: dict[str, set[str]] = {}
    modes_by_iu: dict[str, set[str]] = {}
    periods: set[int] = set()
    for key in index_keys:
        if len(key) != 4:
            raise ValueError("model.qty must be indexed by 4 dimensions: (iu, dst, mode, t)")
        iu, dst, mode, t = key
        dest_by_iu.setdefault(str(iu), set()).add(str(dst))
        modes_by_iu.setdefault(str(iu), set()).add(str(mode))
        try:
            periods.add(int(t))
        except Exception:
            pass

    bound_map = {
        "L": lambda expr, val: expr >= val,
        "U": lambda expr, val: expr <= val,
        "E": lambda expr, val: expr == val,
        "G": lambda expr, val: expr >= val,  # legacy
    }

    for idx, row in enumerate(constraints_list):
        iu = row.iu_code
        t = row.time_period
        if iu not in dest_by_iu or t not in periods:
            continue

        bound_type = row.bound_type.strip().upper()
        if bound_type not in bound_map:
            continue

        mode_code = row.transport_code.strip().lower() if row.transport_code else None
        dst_code = row.iugu_code.strip() if row.iugu_code else None

        # Build mode set
        if mode_code:
            mode_set = {mode_code}
        else:
            mode_set = set(modes_by_iu.get(iu, [])) or set(mode_fallback or [])
        if not mode_set:
            continue

        # Build destination set
        if dst_code:
            dest_set = {dst_code}
        else:
            dest_set = dest_by_iu.get(iu, set())
        if not dest_set:
            continue

        op = bound_map[bound_type]

        # Case 1: IU only (no mode, no dest)
        if mode_code is None and dst_code is None:
            expr = sum(model.qty[iu, j, m, t] for j in dest_set for m in mode_set if (iu, j, m, t) in model.qty)
        # Case 2: IU + mode (no dest)
        elif mode_code is not None and dst_code is None:
            expr = sum(model.qty[iu, j, list(mode_set)[0], t] for j in dest_set if (iu, j, list(mode_set)[0], t) in model.qty)
        # Case 3: IU + mode + dest
        else:
            expr = model.qty[iu, dst_code, list(mode_set)[0], t] if (iu, dst_code, list(mode_set)[0], t) in model.qty else None

        if expr is None:
            continue

        cname = f"strat_con_{idx}"
        # Use add_component to avoid name collisions
        model.add_component(cname, Constraint(expr=op(expr, row.value)))

__all__ = ["apply_strategic_constraints"]
