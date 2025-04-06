from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv
import json
from bson import json_util

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