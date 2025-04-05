import React, { useState, useEffect } from 'react';

const FlaskInteraction = () => {
  const [message, setMessage] = useState('');
  const [inputData, setInputData] = useState('');
  const [responseData, setResponseData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Test the connection to the Flask backend
  useEffect(() => {
    fetch('http://localhost:8000/api/test')
      .then(response => response.json())
      .then(data => {
        setMessage(data.message);
      })
      .catch(error => {
        setMessage('Error connecting to Flask backend. Make sure it is running!');
        console.error('Error:', error);
      });
  }, []);

  // Handle sending data to the backend
  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    
    fetch('http://localhost:8000/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: inputData }),
    })
      .then(response => response.json())
      .then(data => {
        setResponseData(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error:', error);
        setLoading(false);
      });
  };

  return (
    <div className="flask-interaction">
      <h2>Flask API Interaction</h2>
      <p>Backend Status: {message || 'Connecting...'}</p>
      
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="inputData">Enter data to send to Flask backend:</label>
          <input
            type="text"
            id="inputData"
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Send to Backend'}
        </button>
      </form>
      
      {responseData && (
        <div className="response">
          <h3>Response from Backend:</h3>
          <pre>{JSON.stringify(responseData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default FlaskInteraction; 