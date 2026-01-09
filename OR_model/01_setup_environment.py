"""
Cell 1: Environment Setup
Install required packages and import libraries
"""

# For Colab: Uncomment the following lines
# !pip install -q pyomo seaborn scikit-learn
# !apt-get install -y -qq coinor-cbc

import pyomo.environ as pyo
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pyomo.opt import SolverFactory
from sklearn.model_selection import train_test_split

print("Environment Ready")
