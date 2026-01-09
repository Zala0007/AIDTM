# Operations Research Model - Clinker Optimization

This folder contains the complete OR model broken down into individual Python cells for easier execution and debugging.

## Prerequisites

Install required packages:
```bash
pip install pyomo pandas numpy matplotlib seaborn scikit-learn
```

For the CBC solver:
- **Linux/Colab**: `apt-get install -y coinor-cbc`
- **Windows**: Download from [COIN-OR](https://www.coin-or.org/download/binary/Cbc/)
- **Mac**: `brew install cbc`

## Execution Order

Run the files in numerical order:

1. **01_setup_environment.py** - Install packages and import libraries
2. **02_upload_files.py** - Upload files (Colab only, skip for local)
3. **03_load_data.py** - Load all CSV files
4. **04_data_quality_check.py** - Verify data integrity
5. **05_feasibility_check.py** - Check capacity vs demand
6. **06_model_setup.py** - Prepare sets and parameters
7. **07_model_definition.py** - Create and solve the model
8. **08_solution_validation.py** - Validate results
9. **09_stress_test.py** - Test with +30% demand
10. **10_diagnostic_report.py** - Generate output and visualizations

## Data Files Required

The following CSV files should be in the `../real_data/` directory:
- ClinkerDemand.csv
- ClinkerCapacity.csv
- LogisticsIUGU.csv
- IUGUOpeningStock.csv
- IUGUClosingStock.csv
- IUGUType.csv
- ProductionCost.csv
- IUGUConstraint.csv

## Output Files

- **Optimization_Output.csv** - Detailed shipment results
- **optimization_results.png** - Visualization of shipments

## Model Features

- Multi-period clinker distribution optimization
- Minimizes unmet demand
- Handles inventory constraints
- Supports multiple transport modes
- Stress testing capability

## Notes

- Update the `data_dir` path in `03_load_data.py` to match your data location
- Each file can be run independently once dependencies are loaded
- The model uses CBC solver (open-source MILP solver)
