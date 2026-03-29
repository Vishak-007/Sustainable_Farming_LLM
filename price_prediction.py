import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import sys
import json
import warnings
warnings.filterwarnings('ignore')

# 1. Create Simulated Dataset
def create_simulated_data(num_samples=500):
    """
    Creates a simulated dataset for crop prices with the required features.
    """
    np.random.seed(42)  # For reproducibility
    crops = ['Wheat', 'Rice', 'Tomato', 'Onion', 'Potato']
    levels = ['low', 'medium', 'high']
    seasons = ['Spring', 'Summer', 'Monsoon', 'Autumn', 'Winter']
    
    data = {
        'crop': np.random.choice(crops, num_samples),
        'demand': np.random.choice(levels, num_samples),
        'supply': np.random.choice(levels, num_samples),
        'rainfall': np.random.choice(levels, num_samples),
        'season': np.random.choice(seasons, num_samples)
    }
    
    # Generate 10 days of previous prices
    for i in range(1, 11):
        data[f'price_day_{i}'] = np.random.uniform(20, 100, num_samples)
        
    df = pd.DataFrame(data)
    
    # Target: Next day price (simulated based on logic)
    # If demand is high and supply is low, price generally goes up.
    # Base it mainly on the last day's price (day 10)
    base_price = df['price_day_10']
    
    multiplier = np.ones(num_samples)
    multiplier = np.where(df['demand'] == 'high', multiplier * 1.1, multiplier)
    multiplier = np.where(df['demand'] == 'low', multiplier * 0.9, multiplier)
    multiplier = np.where(df['supply'] == 'low', multiplier * 1.1, multiplier)
    multiplier = np.where(df['supply'] == 'high', multiplier * 0.9, multiplier)
    
    # Add some noise to make it realistic
    df['next_day_price'] = base_price * multiplier + np.random.normal(0, 2, num_samples)
    
    return df

# 2. Preprocess and Train Model
def train_model():
    """
    Loads data, preprocesses it, and trains the RandomForest model.
    """
    df = create_simulated_data()
    
    # Encoding categorical variables
    label_encoders = {}
    cat_columns = ['crop', 'demand', 'supply', 'rainfall', 'season']
    
    for col in cat_columns:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col])
        label_encoders[col] = le
        
    X = df.drop('next_day_price', axis=1)
    y = df['next_day_price']
    
    # Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Initialize and train RandomForestRegressor
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    return model, label_encoders, X.columns

# Train model globally to avoid retraining on every prediction call
# In a real app, you would train offline and load the saved model (.pkl)
print("Training model...", file=sys.stderr)
MODEL, ENCODERS, FEATURE_COLS = train_model()
print("Model trained successfully!", file=sys.stderr)

# 3. Main Prediction Function
def predict_price(input_data):
    """
    Predicts the next day's price and determines the trend based on input factors.
    
    Args:
    input_data (dict): Dictionary containing:
        - crop (str)
        - last_10_day_prices (list of floats)
        - demand (str): 'low', 'medium', 'high'
        - supply (str): 'low', 'medium', 'high'
        - rainfall (str): 'low', 'medium', 'high'
        - season (str)
        - transport_cost (str): 'low', 'medium', 'high'
        - diesel_price (float): Fuel price per liter
        - distance_to_market (float): Distance in km
        - market_tier (str): 'Tier 1 (Metro)', 'Tier 2', 'Local Village'
        
    Returns:
    dict: { "predicted_price": float, "trend": str, "reason": str }
    """
    try:
        # Create a dataframe for the input
        input_df = pd.DataFrame([{
            'crop': input_data['crop'],
            'demand': input_data['demand'],
            'supply': input_data['supply'],
            'rainfall': input_data['rainfall'],
            'season': input_data['season']
        }])
        
        # Add the 10 days prices
        for i in range(1, 11):
            input_df[f'price_day_{i}'] = input_data['last_10_day_prices'][i-1]
            
        # Reorder columns to match the training data exactly
        input_df = input_df[FEATURE_COLS]
        
        # Encode categorical inputs using the fitted encoders
        for col in ['crop', 'demand', 'supply', 'rainfall', 'season']:
            # Handle unseen labels gracefully
            if input_data[col] in ENCODERS[col].classes_:
                input_df[col] = ENCODERS[col].transform([input_data[col]])
            else:
                # Default to the first class if unknown string is provided
                input_df[col] = ENCODERS[col].transform([ENCODERS[col].classes_[0]])
        
        # Make the prediction
        predicted_price = MODEL.predict(input_df)[0]
        
        # Determine trend
        last_price = input_data['last_10_day_prices'][-1]
        trend = "Increase" if predicted_price > last_price else "Decrease"
        
        # Generate simple reason based on dominant factors
        reason_parts = []
        if input_data['demand'] == 'high':
            reason_parts.append("high demand")
        elif input_data['demand'] == 'low':
            reason_parts.append("low demand")
            
        if input_data['supply'] == 'low':
            reason_parts.append("low market supply")
        elif input_data['supply'] == 'high':
            reason_parts.append("excess supply")
            
        if not reason_parts:
            # Fallback generic reason
            reason = f"Based on historical price trends and normal market conditions for {input_data['crop']}."
        else:
            reason = f"Price is expected to {trend.lower()} primarily due to {' and '.join(reason_parts)}."
            
        return {
            "predicted_price": int(round(predicted_price)),
            "trend": trend,
            "reason": reason
        }
        
    except Exception as e:
        return {"error": str(e)}

# 4. Visualization Function
def plot_price_trend(input_data, predicted_price):
    """
    Plots a bar graph showing the last 10 days' prices and the predicted next day's price.
    """
    try:
        days = [f"Day {i}" for i in range(1, 11)] + ["Predicted\n(Day 11)"]
        prices = list(input_data['last_10_day_prices']) + [float(predicted_price)]
        
        plt.figure(figsize=(10, 6))
        # Use different colors for historical vs predicted
        colors = ['skyblue'] * 10 + ['orange' if predicted_price > prices[9] else 'lightgreen']
        
        bars = plt.bar(days, prices, color=colors)
        
        plt.title(f"Price Trend Analysis for {input_data['crop']}", fontsize=14)
        plt.xlabel("Days", fontsize=12)
        plt.ylabel("Price (₹)", fontsize=12)
        plt.xticks(rotation=45)
        
        # Add values on top of bars
        for bar in bars:
            yval = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2, yval + 0.5, f"₹{round(yval, 2)}", ha='center', va='bottom', fontsize=9)
            
        plt.tight_layout()
        plt.show()
    except Exception as e:
        print(f"Error generating plot: {e}")

# 5. Interactive Usage
if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == '--json':
        try:
            input_data = json.loads(sys.argv[2])
            result = predict_price(input_data)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
        sys.exit(0)

    valid_crops = ['Wheat', 'Rice', 'Tomato', 'Onion', 'Potato']
    
    print("\n" + "="*50)
    print("🌾 CROP PRICE PREDICTOR SYSTEM 🌾")
    print("="*50)
    
    while True:
        print("\nAvailable crops to predict: " + ", ".join(valid_crops))
        selected_crop = input("Enter a crop name (or type 'exit' to quit): ").strip().capitalize()
        
        if selected_crop.lower() == 'exit':
            print("Exiting predictor. Have a great day!")
            break
            
        if selected_crop not in valid_crops:
            print(f"Invalid crop! Please choose from: {', '.join(valid_crops)}")
            continue
            
        print(f"\nAnalyzing market trends for {selected_crop}...")
        
        # Generate some randomized but reasonable inputs for the selected crop
        last_prices = np.random.uniform(30.0, 80.0, 10).tolist()
        last_prices.sort() # simulate an increasing trend or just use random
        
        sample_input: dict = {
            "crop": selected_crop,
            "last_10_day_prices": last_prices,
            "demand": np.random.choice(["low", "medium", "high"]),
            "supply": np.random.choice(["low", "medium", "high"]),
            "rainfall": np.random.choice(["low", "medium", "high"]),
            "season": "Summer"
        }
        
        result = predict_price(sample_input)
        
        print("\n--- Prediction Results ---")
        print(f"Crop: {sample_input['crop']}")
        print(f"Market Demand: {sample_input['demand'].capitalize()}")
        print(f"Market Supply: {sample_input['supply'].capitalize()}")
        
        last_prices_val = sample_input['last_10_day_prices']
        if isinstance(last_prices_val, list):
            print(f"Input Last Price (Day 10): ₹{round(last_prices_val[-1], 2)}")
            
        print(f"Predicted Next Day Price: ₹{result.get('predicted_price')}")
        print(f"Trend: {result.get('trend')}")
        print(f"Reason: {result.get('reason')}")
        
        # Show the plot
        if "predicted_price" in result:
            print("\n> Generating graph. Please close the graph window to continue to the next crop!")
            plot_price_trend(sample_input, result['predicted_price'])
