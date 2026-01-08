from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Optional

from preprocess_data import build_initial_data


def _default_real_data_dir() -> Path:
    # backend/ -> repo_root/real_data
    here = Path(__file__).resolve().parent
    return here.parent / "real_data"


@lru_cache(maxsize=16)
def get_initial_data(
    *,
    T: int = 4,
    limit_plants: int = 240,
    limit_routes: int = 250,
    scenario_name: str = "Base",
    seed: int = 42,
    real_data_dir: Optional[str] = None,
) -> Dict[str, Any]:
    real_dir = Path(real_data_dir) if real_data_dir else _default_real_data_dir()

    return build_initial_data(
        real_data_dir=real_dir,
        T=T,
        limit_plants=limit_plants,
        limit_routes=limit_routes,
        scenario_name=scenario_name,
        seed=seed,
    )
