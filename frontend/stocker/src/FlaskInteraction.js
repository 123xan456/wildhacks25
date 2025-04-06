import React, { useState, useEffect } from 'react';

// Base URL for API calls
const API_BASE_URL = 'http://localhost:8000/api';

// API Service object
export const ApiService = {
  // Test API connection
  testConnection: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/test`);
      return await response.json();
    } catch (error) {
      console.error('Error connecting to API:', error);
      throw error;
    }
  },

  // User signup
  signup: async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      return await response.json();
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  },

  // User signin
  signin: async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      return await response.json();
    } catch (error) {
      console.error('Signin error:', error);
      throw error;
    }
  },

  // Update user's selected stocks
  updateStocks: async (username, stocks) => {
    try {
      const response = await fetch(`${API_BASE_URL}/update_stocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, stocks }),
      });
      return await response.json();
    } catch (error) {
      console.error('Update stocks error:', error);
      throw error;
    }
  },

  // Update user's frequency preference
  updateFrequency: async (username, frequency) => {
    try {
      const response = await fetch(`${API_BASE_URL}/update_frequency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, frequency }),
      });
      return await response.json();
    } catch (error) {
      console.error('Update frequency error:', error);
      throw error;
    }
  },

  // Get user data
  getUserData: async (username) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user_data?username=${username}`);
      return await response.json();
    } catch (error) {
      console.error('Get user data error:', error);
      throw error;
    }
  }
};

// Demo component to test API connection
const FlaskInteraction = () => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Test the connection to the Flask backend
  useEffect(() => {
    ApiService.testConnection()
      .then(data => {
        setMessage(data.message);
      })
      .catch(error => {
        setMessage('Error connecting to Flask backend. Make sure it is running!');
        console.error('Error:', error);
      });
  }, []);

  return (
    <div className="flask-interaction">
      <h2>Flask API Interaction</h2>
      <p>Backend Status: {message || 'Connecting...'}</p>
    </div>
  );
};

export default FlaskInteraction; 