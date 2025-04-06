// Base URL for API calls
const API_BASE_URL = 'http://localhost:8000/api';

// Polygon API configuration 
const POLYGON_API_BASE_URL = 'https://api.polygon.io';
const POLYGON_API_KEY = 'Ipp3SKTtHg0TIEIRDUShlcm5tUNnyQKL'; // Only use when demo: Ipp3SKTtHg0TIEIRDUShlcm5tUNnyQKL

// API Service object
const ApiService = {
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
  },

  // Verify if a stock symbol exists using Polygon API
  verifyStockSymbol: async (symbol) => {
    try {
      const response = await fetch(`${POLYGON_API_BASE_URL}/v3/reference/tickers/${symbol}?apiKey=${POLYGON_API_KEY}`);
      
      if (!response.ok) {
        return { valid: false };
      }
      
      const data = await response.json();
      return { 
        valid: true, 
        name: data.results?.name || symbol,
        market: data.results?.market || 'Unknown'
      };
    } catch (error) {
      console.error('Stock verification error:', error);
      return { valid: false };
    }
  },

  // Get historical stock data for a specific timeframe
  getHistoricalData: async (symbol, from, to, timespan = 'day') => {
    try {
      // Format: YYYY-MM-DD
      const response = await fetch(
        `${POLYGON_API_BASE_URL}/v2/aggs/ticker/${symbol}/range/1/${timespan}/${from}/${to}?apiKey=${POLYGON_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Historical data error:', error);
      throw error;
    }
  },

  // Get stock details and latest price
  getStockDetails: async (symbol) => {
    try {
      const response = await fetch(
        `${POLYGON_API_BASE_URL}/v2/aggs/ticker/${symbol}/prev?apiKey=${POLYGON_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch stock details');
      }
      
      const data = await response.json();
      return data.results?.[0] || null;
    } catch (error) {
      console.error('Stock details error:', error);
      throw error;
    }
  }
};

export default ApiService; 