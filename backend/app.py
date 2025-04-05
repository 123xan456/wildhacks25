from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

@app.route('/api/test', methods=['GET'])
def test_route():
    return jsonify({"message": "Flask backend is working!"})

# Sample route that accepts data from frontend
@app.route('/api/process', methods=['POST'])
def process_data():
    data = request.json
    # Process the data with your Python logic here
    result = {"received": data, "processed": True}
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=8000) 