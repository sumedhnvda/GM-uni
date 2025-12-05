import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeRegressor
import random
import os
from datetime import datetime

# Base prices (from the original repo)
BASE_PRICES = {
    "Paddy": 1245.5, "Arhar": 3200, "Bajra": 1175, "Barley": 980, "Copra": 5100,
    "Cotton": 3600, "Sesamum": 4200, "Gram": 2800, "Groundnut": 3700, "Jowar": 1520,
    "Maize": 1175, "Masoor": 2800, "Moong": 3500, "Niger": 3500, "Ragi": 1500,
    "Rape": 2500, "Jute": 1675, "Safflower": 2500, "Soyabean": 2200, "Sugarcane": 2250,
    "Sunflower": 3700, "Urad": 4300, "Wheat": 1350
}

# Annual rainfall (from the original repo)
ANNUAL_RAINFALL = [29, 21, 37.5, 30.7, 52.6, 150, 299, 251.7, 179.2, 70.5, 39.8, 10.9]

class CommodityModel:
    def __init__(self, csv_path):
        self.name = os.path.basename(csv_path).split('.')[0]
        dataset = pd.read_csv(csv_path)
        self.X = dataset.iloc[:, :-1].values
        self.Y = dataset.iloc[:, 3].values
        
        depth = random.randrange(7, 18)
        self.regressor = DecisionTreeRegressor(max_depth=depth)
        self.regressor.fit(self.X, self.Y)

    def predict(self, month, year, rainfall):
        if year >= 2019:
            fsa = np.array([month, year, rainfall]).reshape(1, 3)
            return self.regressor.predict(fsa)[0]
        else:
            # Fallback for historical data if needed (simplified from original)
            return 0 

class PredictionService:
    def __init__(self):
        self.models = {}
        self.data_dir = "app/data"
        self._load_models()

    def _load_models(self):
        if not os.path.exists(self.data_dir):
            print(f"Data directory {self.data_dir} not found.")
            return

        for filename in os.listdir(self.data_dir):
            if filename.endswith(".csv"):
                path = os.path.join(self.data_dir, filename)
                model = CommodityModel(path)
                self.models[model.name.lower()] = model

    def get_supported_crops(self):
        return list(self.models.keys())

    def get_forecast(self, crop_name):
        crop_name = crop_name.lower()
        if crop_name not in self.models:
            return None

        model = self.models[crop_name]
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        forecasts = []
        for i in range(1, 7): # Next 6 months
            if current_month + i <= 12:
                m, y = current_month + i, current_year
                r = ANNUAL_RAINFALL[m - 1]
            else:
                m, y = current_month + i - 12, current_year + 1
                r = ANNUAL_RAINFALL[m - 1]
            
            predicted_wpi = model.predict(m, y, r)
            base_price = BASE_PRICES.get(crop_name.capitalize(), 1000) # Default base if not found
            estimated_price = (predicted_wpi * base_price) / 100
            
            forecasts.append({
                "month": datetime(y, m, 1).strftime("%b %Y"),
                "price": round(estimated_price, 2),
                "wpi": round(predicted_wpi, 2)
            })
            
        return forecasts

prediction_service = PredictionService()
