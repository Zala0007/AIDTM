"""
Master Script: Run All OR Model Cells
Execute all cells in sequence
"""

import os
import sys

# List of scripts in execution order
scripts = [
    "01_setup_environment.py",
    "02_upload_files.py",
    "03_load_data.py",
    "04_data_quality_check.py",
    "05_feasibility_check.py",
    "06_model_setup.py",
    "07_model_definition.py",
    "08_solution_validation.py",
    "09_stress_test.py",
    "10_diagnostic_report.py"
]

print("=" * 60)
print("CLINKER OPTIMIZATION - COMPLETE EXECUTION")
print("=" * 60)

for i, script in enumerate(scripts, 1):
    print(f"\n{'='*60}")
    print(f"Executing Cell {i}: {script}")
    print(f"{'='*60}\n")
    
    try:
        with open(script, 'r') as f:
            code = f.read()
            # Skip the docstring and comments
            exec(code, globals())
        print(f"✓ Cell {i} completed successfully")
    except FileNotFoundError:
        print(f"✗ Error: {script} not found")
        break
    except Exception as e:
        print(f"✗ Error in {script}: {str(e)}")
        print(f"Stopping execution at cell {i}")
        sys.exit(1)

print("\n" + "=" * 60)
print("ALL CELLS EXECUTED SUCCESSFULLY")
print("=" * 60)
