from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv
import json
from bson import json_util
from gemini_calls import scrape_formatting, model_setup
# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

# MongoDB Connection
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(mongo_uri)
db = client.stockerdb  # Database name

@app.route('/api/test', methods=['GET'])
def test_route():
    return jsonify({"message": "Flask backend is working!"})

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    print(f"Signup request: {json.dumps(data, indent=2)}")
    
    # Check if username already exists
    if db.users.find_one({"username": data['username']}):
        return jsonify({"success": False, "message": "Username already exists"}), 400
    
    # Create new user
    user = {
        "username": data['username'],
        "password": generate_password_hash(data['password']),
        "stocks": [],
        "frequency": "daily"  # Default frequency
    }
    
    db.users.insert_one(user)
    print(f"Created user: {data['username']}")
    
    return jsonify({"success": True, "message": "User created successfully"})

@app.route('/api/signin', methods=['POST'])
def signin():
    data = request.json
    print(f"Signin request: {json.dumps(data, indent=2)}")
    
    # Find user
    user = db.users.find_one({"username": data['username']})
    
    if not user or not check_password_hash(user['password'], data['password']):
        print(f"Login failed for user: {data['username']}")
        return jsonify({"success": False, "message": "Invalid username or password"}), 401
    
    # Return user data (excluding password)
    user_data = {
        "username": user['username'],
        "stocks": user.get('stocks', []),
        "frequency": user.get('frequency', 'daily') 
    }
    
    print(f"User logged in: {user_data['username']}")
    return jsonify({"success": True, "message": "Login successful", "user": user_data})

@app.route('/api/update_stocks', methods=['POST'])
def update_stocks():
    data = request.json
    print(f"Update stocks request: {json.dumps(data, indent=2)}")
    
    if not data.get('username'):
        print("Error: Missing username in update_stocks")
        return jsonify({"success": False, "message": "Username is required"}), 400
        
    if not isinstance(data.get('stocks'), list):
        print(f"Error: Invalid stocks format - {type(data.get('stocks'))}")
        return jsonify({"success": False, "message": "Stocks must be a list"}), 400
    
    # Update user's stocks
    result = db.users.update_one(
        {"username": data['username']},
        {"$set": {"stocks": data['stocks']}}
    )
    
    if result.matched_count == 0:
        print(f"Error: User not found - {data['username']}")
        return jsonify({"success": False, "message": "User not found"}), 404
        
    if result.modified_count == 1:
        print(f"Stocks updated for user: {data['username']}")
        return jsonify({"success": True, "message": "Stocks updated successfully"})
    else:
        print(f"No changes made to stocks for user: {data['username']}")
        return jsonify({"success": True, "message": "No changes were made"})

@app.route('/api/update_frequency', methods=['POST'])
def update_frequency():
    data = request.json
    print(f"Update frequency request: {json.dumps(data, indent=2)}")
    
    if not data.get('username'):
        print("Error: Missing username in update_frequency")
        return jsonify({"success": False, "message": "Username is required"}), 400
        
    if not data.get('frequency'):
        print("Error: Missing frequency value")
        return jsonify({"success": False, "message": "Frequency is required"}), 400
    
    # Update user's frequency preference
    result = db.users.update_one(
        {"username": data['username']},
        {"$set": {"frequency": data['frequency']}}
    )
    
    if result.matched_count == 0:
        print(f"Error: User not found - {data['username']}")
        return jsonify({"success": False, "message": "User not found"}), 404
        
    if result.modified_count == 1:
        print(f"Frequency updated for user: {data['username']}")
        return jsonify({"success": True, "message": "Update frequency set successfully"})
    else:
        print(f"No changes made to frequency for user: {data['username']}")
        return jsonify({"success": True, "message": "No changes were made"})

@app.route('/api/user_data', methods=['GET'])
def get_user_data():
    username = request.args.get('username')
    
    if not username:
        return jsonify({"success": False, "message": "Username is required"}), 400
    
    # Find user
    user = db.users.find_one({"username": username})
    
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    
    # Return user data (excluding password)
    user_data = {
        "username": user['username'],
        "stocks": user.get('stocks', []),
        "frequency": user.get('frequency', 'daily')
    }
    
    return jsonify({"success": True, "user": user_data})

@app.route('/api/predict', methods=['POST'])
def individual_prediction():
    model = model_setup()
    
    data = request.json
    stock_symbol = data['stock']
    #dictionary mapping source to prompt. groups of 5
    source_to_prompt, aggregated = scrape_formatting(stock_symbol, model)
    results = {}
    final_input = ""
    count = 1

    for source, prompt in source_to_prompt.items():
      individual_prompt = f""" You are an expert in the stock market and are responsible for informing clients about the potential impact of recent events on a particular stock. 
                              Here are step by step examples of how to generate the prediction based on each source of information:
                              Example 1:
                              Article 1: Information: ​In the 2024 U.S. presidential election, former President Donald Trump defeated Vice President Kamala Harris, securing 312 electoral votes to Harris's 226. Trump also won the popular vote with 49.8% against Harris's 48.3%. This victory marked Trump's return to the White House for a non-consecutive second term. ​
                              Article 2: BYD has opened a $490 million EV factory in Thailand and is building a $1 billion plant in Indonesia, set to finish by end of 2025. Each factory will produce 150,000 vehicles annually, supporting BYD’s plan to double overseas sales to over 800,000 units by 2025.
                              Prediction: Trump’s return could boost U.S. manufacturing and deregulation, potentially favoring Tesla. However, BYD’s aggressive global expansion may intensify EV competition. Combined, Tesla’s stock may face short-term optimism from policy shifts but long-term pressure from rising international rivals like BYD, possibly resulting in increased volatility and mixed investor sentiment.

                              Example 2:
                              Article 1: In the second quarter of fiscal 2025, NVIDIA reported record revenue of $30.0 billion, a 122% year-over-year increase, surpassing analyst expectations. Earnings per share reached $0.67, up 168% from the previous year. This growth was driven by strong demand for AI-related products, particularly in data centers. ​
                              Article 2: President Trump, since his January 2025 inauguration, has implemented a range of new tariffs, although specific details fall after my October 2024 knowledge cutoff. Prior to leaving office in 2021, Trump was known for aggressive tariff policies, particularly targeting China, steel, aluminum, and various European goods. ​
                              Prediction: NVIDIA’s record-breaking Q2 performance, driven by AI demand, suggests strong upward momentum. However, Trump’s new tariffs could disrupt global supply chains and raise costs, especially if China is targeted. Despite potential trade tensions, NVIDIA’s dominance in AI may sustain investor confidence, keeping its stock resilient with possible short-term fluctuations.                            

                              Now it's your turn. Given the information, write a 50-word prediction as to how that might affect {stock_symbol} in the short term.
                              {prompt}"""
      response = model.invoke(individual_prompt).content
      sentiment = model.invoke(f'Based on the following prediction, indicate whether the prediction is Positive, Negative, or Neutral. ONLY provide the word.\n{response}').content
      results[source] = (response, sentiment)
      final_input += f'Prediction {count}: {response}\nSentiment {count}: {sentiment} \n'
      count += 1

    final_prediction = model.invoke(f'From all the information provided, provide a 50-word final prediction about whether you think the {stock_symbol} stock will rise, fall, or remain the same and why:\n{final_input}').content
    final_sentiment = model.invoke(f'Based on the following prediction, indicate whether the prediction is Positive, Negative, or Neutral. ONLY provide the word.\n{final_prediction}').content

    aggregated['individual_predictions'] = results
    aggregated['final_prediction'] = (final_prediction, final_sentiment)
    return jsonify({"success": True, "results": aggregated})

# Debug endpoint to view all users (do not use in production)
@app.route('/api/debug/users', methods=['GET'])
def debug_users():
    users = list(db.users.find({}, {"password": 0}))  # Exclude passwords
    # Convert ObjectId to string for JSON serialization
    return json.loads(json_util.dumps(users))

# Debug endpoint to view specific user data
@app.route('/api/debug/user/<username>', methods=['GET'])
def debug_user(username):
    user = db.users.find_one({"username": username}, {"password": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404
    return json.loads(json_util.dumps(user))

if __name__ == '__main__':
    app.run(debug=True, port=8000) 