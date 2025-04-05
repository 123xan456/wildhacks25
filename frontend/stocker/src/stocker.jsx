import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff, TrendingUp, FileText, Search, Briefcase } from 'lucide-react';
import './stocker.css';
import ApiService from './ApiService';

const EnhancedStockApp = () => {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // Store current user info
  const [isLoading, setIsLoading] = useState(false); // Loading state for API calls
  
  // Main app states
  const [activeTab, setActiveTab] = useState('portfolio');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    stocks: [],
    customStock: '',
    frequency: 'daily'
  });
  const [errors, setErrors] = useState({});
  const [accountCreated, setAccountCreated] = useState(false);
  
  // Portfolio and analysis states
  const [portfolio, setPortfolio] = useState([]);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [analysisResults, setAnalysisResults] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  // Popular stocks for quick selection
  const popularStocks = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 
    'TSLA', 'NVDA', 'JPM', 'V', 'WMT'
  ];

  // Update form data
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear errors when user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  // Toggle stock selection
  const toggleStock = (stock) => {
    if (formData.stocks.includes(stock)) {
      setFormData({
        ...formData,
        stocks: formData.stocks.filter(s => s !== stock)
      });
    } else {
      setFormData({
        ...formData,
        stocks: [...formData.stocks, stock]
      });
    }
  };

  // Add custom stock
  const addCustomStock = () => {
    if (!formData.customStock) return;
    
    const stockSymbol = formData.customStock.toUpperCase().trim();
    
    if (!formData.stocks.includes(stockSymbol)) {
      setFormData({
        ...formData,
        stocks: [...formData.stocks, stockSymbol],
        customStock: ''
      });
    }
  };

  // Toggle between sign in and sign up modes
  const toggleAuthMode = () => {
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
    setErrors({});
  };

  // Validate authentication form
  const validateAuthForm = () => {
    const newErrors = {};

    if (authMode === 'signup') {
      if (!formData.username) newErrors.username = 'Username is required';
      if (formData.username && formData.username.length < 4) newErrors.username = 'Username must be at least 4 characters';
      
      if (!formData.password) newErrors.password = 'Password is required';
      if (formData.password && formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else {
      if (!formData.username) newErrors.username = 'Username is required';
      if (!formData.password) newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle authentication (sign in or sign up)
  const handleAuthentication = async () => {
    if (validateAuthForm()) {
      setIsLoading(true);
      try {
        if (authMode === 'signup') {
          // Sign up with API
          const result = await ApiService.signup(formData.username, formData.password);
          
          if (result.success) {
            setAccountCreated(true);
            // Store user information
            setCurrentUser({
              username: formData.username,
              stocks: [],
              frequency: 'daily'
            });
            
            // Simulate the account created effect before redirection
            setTimeout(() => {
              setIsAuthenticated(true);
              setPortfolio([]);
            }, 2000);
          } else {
            setErrors({ username: result.message || 'Error creating account' });
          }
        } else {
          // Sign in with API
          const result = await ApiService.signin(formData.username, formData.password);
          
          if (result.success) {
            // Set user info
            setCurrentUser(result.user);
            
            // Update portfolio and frequency
            setPortfolio(result.user.stocks || []);
            setFormData(prev => ({
              ...prev,
              frequency: result.user.frequency || 'daily'
            }));
            
            setIsAuthenticated(true);
          } else {
            setErrors({ password: result.message || 'Invalid login' });
          }
        }
      } catch (error) {
        console.error("Authentication error:", error);
        setErrors({ password: 'Error connecting to server' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Sign out functionality
  const handleSignOut = () => {
    setIsAuthenticated(false);
    setAuthMode('signin');
    setCurrentUser(null);
    resetForm();
  };

  // Validate current portfolio step
  const validateStep = () => {
    const newErrors = {};

    if (step === 1) {
      if (formData.stocks.length === 0) {
        newErrors.stocks = 'Please select at least one stock to track';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigate to next step in portfolio
  const nextStep = () => {
    if (validateStep()) {
      if (step < 2) {
        setStep(step + 1);
      } else {
        handlePortfolioSubmit();
      }
    }
  };

  // Go back to previous step
  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Handle portfolio form submission
  const handlePortfolioSubmit = async () => {
    if (!currentUser || !currentUser.username) return;
    
    setIsLoading(true);
    try {
      // Save stocks to MongoDB
      const stocksResult = await ApiService.updateStocks(
        currentUser.username,
        formData.stocks
      );
      
      // Save frequency preferences to MongoDB
      const frequencyResult = await ApiService.updateFrequency(
        currentUser.username,
        formData.frequency
      );
      
      if (stocksResult.success && frequencyResult.success) {
        // Update local portfolio state
        setPortfolio(formData.stocks);
        
        // Update the current user data
        setCurrentUser({
          ...currentUser,
          stocks: formData.stocks,
          frequency: formData.frequency
        });
        
        // Hide portfolio form
        setShowPortfolioForm(false);
        // Reset to step 1 for next time
        setStep(1);
      } else {
        console.error("Error saving portfolio:", stocksResult, frequencyResult);
      }
    } catch (error) {
      console.error("Error saving portfolio:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Edit portfolio - show the portfolio form with current stocks
  const editPortfolio = () => {
    // Use the current user's stocks if available
    const stocks = currentUser && currentUser.stocks ? currentUser.stocks : portfolio;
    
    setFormData({
      ...formData, 
      stocks: stocks,
      frequency: currentUser?.frequency || 'daily'
    });
    setShowPortfolioForm(true);
    setStep(1);
  };

  // Handle analysis for a specific stock
  const analyzeStock = async (stock) => {
    setSelectedStock(stock);
    setIsAnalyzing(true);
    
    try {
      // Call your FastAPI backend
      // CHANGE WITH API 
      const response = await fetch('http://localhost:8000/api/data', {
        method: 'POST', // Change to POST since you're sending data
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stock: stock }) // Pass the stock as JSON in the request body
      });
      const data = await response.json();
      
      // Use the data from your backend in the analysis
      setAnalysisResults({
        stock,
        externalFactors: data.externalFactors || ['Quarterly earnings report', 'New product launch', 'Industry regulation changes'],
        sentiment: data.sentiment || 'positive',
        prediction: data.prediction || 'Upward trend expected',
        articles: data.articles || [
          { title: 'Company Exceeds Quarterly Expectations', source: 'Financial Times', sentiment: 'Positive', summary: "Article Summary" },
          { title: 'New Product Line Announced', source: 'Tech Insider', sentiment: 'Positive', summary: "Article Summary" },
          { title: 'Market Analysis Shows Potential Risks', source: 'Market Watch', sentiment: 'Neutral', summary: "Article Summary" }
        ],
        summary: data.summary || "Based on recent performance and market trends, this stock shows positive indicators for growth in the coming period. Analyst sentiment is generally favorable."
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      // Fallback to default data if API fails
      setAnalysisResults({
        stock,
        externalFactors: ['Quarterly earnings report', 'New product launch', 'Industry regulation changes'],
        sentiment: 'positive',
        prediction: 'Upward trend expected',
        articles: [
          { title: 'Company Exceeds Quarterly Expectations', source: 'Financial Times', sentiment: 'Positive', summary: "Article Summary" },
          { title: 'New Product Line Announced', source: 'Tech Insider', sentiment: 'Positive', summary: "Article Summary" },
          { title: 'Market Analysis Shows Potential Risks', source: 'Market Watch', sentiment: 'Neutral', summary: "Article Summary" }
        ],
        summary: "Based on recent performance and market trends, this stock shows positive indicators for growth in the coming period. Analyst sentiment is generally favorable."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reset form to start again
  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      stocks: [],
      customStock: '',
      frequency: 'daily'
    });
    setStep(1);
    setAccountCreated(false);
    setAnalysisResults({});
    setSelectedStock(null);
    setShowPortfolioForm(false);
  };

  // Render error message component
  const ErrorMessage = ({ message }) => {
    if (!message) return null;
    return (
      <div className="error-message">
        <AlertCircle className="error-icon" />
        <span>{message}</span>
      </div>
    );
  };

  // Authentication Form (Sign In / Sign Up)
  const renderAuthForm = () => {
    if (accountCreated) {
      return (
        <div className="form-container">
          <div className="success-header">
            <CheckCircle className="success-icon" />
            <h2 className="success-title">Account Created Successfully!</h2>
            <p className="success-message">
              Redirecting to your dashboard...
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="form-container">
        <h2 className="form-title">{authMode === 'signin' ? 'Sign In' : 'Create Account'}</h2>
        
        <div className="form-field">
          <label className="field-label">Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className={`text-input ${errors.username ? 'error' : ''}`}
            placeholder="Enter your username"
            disabled={isLoading}
          />
          <ErrorMessage message={errors.username} />
        </div>
        
        <div className="form-field">
          <label className="field-label">Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`text-input ${errors.password ? 'error' : ''}`}
              placeholder="Enter your password"
              disabled={isLoading}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <ErrorMessage message={errors.password} />
        </div>
        
        {authMode === 'signup' && (
          <div className="form-field">
            <label className="field-label">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`text-input ${errors.confirmPassword ? 'error' : ''}`}
              placeholder="Confirm your password"
              disabled={isLoading}
            />
            <ErrorMessage message={errors.confirmPassword} />
          </div>
        )}
        
        <button
          type="button"
          onClick={handleAuthentication}
          className="primary-button full-width"
          style={{ marginBottom: '1rem' }}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
        </button>
        
        <div className="auth-switch">
          {authMode === 'signin' ? 
            "Don't have an account? " : 
            "Already have an account? "}
          <button 
            type="button" 
            onClick={toggleAuthMode}
            className="text-button"
            disabled={isLoading}
          >
            {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    );
  };

  // Main app with tabs for portfolio and analysis
  const renderMainApp = () => {
    return (
      <div className="app-container">
        <div className="app-header">
          <h1 className="app-title">Stock Prediction Dashboard</h1>
          <div className="user-section">
            <span className="username">{currentUser?.username || formData.username}</span>
            <button 
              type="button" 
              onClick={handleSignOut}
              className="sign-out-button"
            >
              Sign Out
            </button>
          </div>
        </div>
        
        <div className="app-tabs">
          <button 
            className={`tab-button ${activeTab === 'portfolio' ? 'active' : ''}`}
            onClick={() => setActiveTab('portfolio')}
          >
            <Briefcase size={18} />
            <span>Portfolio</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            <TrendingUp size={18} />
            <span>Analysis</span>
          </button>
        </div>
        
        <div className="tab-content">
          {activeTab === 'portfolio' && renderPortfolioTab()}
          {activeTab === 'analysis' && renderAnalysisTab()}
        </div>
      </div>
    );
  };

  // Portfolio management tab
  const renderPortfolioTab = () => {
    // Use the same rendering logic but with potentially updated data
    return (
      <div className="portfolio-container">
        <h2 className="section-title">Your Stock Portfolio</h2>
        
        {portfolio.length > 0 && !showPortfolioForm ? (
          <>
            <div className="stocks-list">
              {portfolio.map(stock => (
                <div key={stock} className="portfolio-stock-item">
                  <div className="stock-info">
                    <span className="stock-symbol">{stock}</span>
                  </div>
                  <button 
                    className="analyze-button"
                    onClick={() => {
                      setActiveTab('analysis');
                      analyzeStock(stock);
                    }}
                  >
                    <TrendingUp size={16} />
                    <span>Analyze</span>
                  </button>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={editPortfolio}
              className="primary-button"
              style={{ marginTop: '1rem' }}
            >
              Edit Portfolio
            </button>
          </>
        ) : (
          renderPortfolioForm()
        )}
      </div>
    );
  };

  // Portfolio creation/editing form
  const renderPortfolioForm = () => {
    return (
      <div className="portfolio-form">
        {step === 1 && (
          <>
            <p className="form-description">
              {portfolio.length > 0 ? 
                "Edit your portfolio by adding or removing stocks:" : 
                "Select stocks to add to your portfolio for analysis and predictions:"}
            </p>
            
            <div className="form-field">
              <label className="field-label">Popular Stocks</label>
              <div className="stocks-grid">
                {popularStocks.map(stock => (
                  <button
                    key={stock}
                    type="button"
                    onClick={() => toggleStock(stock)}
                    className={`stock-button ${formData.stocks.includes(stock) ? 'selected' : ''}`}
                  >
                    {stock}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="form-field">
              <label className="field-label">Add Custom Stock</label>
              <div className="input-with-button">
                <input
                  type="text"
                  name="customStock"
                  value={formData.customStock}
                  onChange={handleChange}
                  className="text-input custom-stock-input"
                  placeholder="Enter stock symbol"
                />
                <button
                  type="button"
                  onClick={addCustomStock}
                  className="add-button"
                >
                  Add
                </button>
              </div>
            </div>
            
            {formData.stocks.length > 0 && (
              <div className="form-field">
                <label className="field-label">Selected Stocks</label>
                <div className="selected-stocks-container">
                  {formData.stocks.map(stock => (
                    <div key={stock} className="selected-stock">
                      {stock}
                      <button 
                        type="button" 
                        onClick={() => toggleStock(stock)}
                        className="remove-stock"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <ErrorMessage message={errors.stocks} />
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="form-subtitle">Update Frequency</h3>
            <p className="form-description">How often would you like to receive stock updates and predictions?</p>
            
            <div className="frequency-options">
              {['daily', 'weekly', 'bi-weekly', 'monthly'].map(option => (
                <label key={option} className="frequency-option">
                  <input
                    type="radio"
                    name="frequency"
                    value={option}
                    checked={formData.frequency === option}
                    onChange={handleChange}
                    className="radio-input"
                  />
                  <span className="option-text">{option.charAt(0).toUpperCase() + option.slice(1)}</span>
                </label>
              ))}
            </div>
          </>
        )}

        <div className="button-container">
          {portfolio.length > 0 && showPortfolioForm ? (
            <>
              <button
                type="button"
                onClick={() => setShowPortfolioForm(false)}
                className="secondary-button"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="primary-button"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : (step < 2 ? 'Next' : 'Save Portfolio')}
              </button>
            </>
          ) : (
            <>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="secondary-button"
                  disabled={isLoading}
                >
                  Back
                </button>
              ) : (
                <div></div>
              )}
              
              <button
                type="button"
                onClick={nextStep}
                className="primary-button"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : (step < 2 ? 'Next' : 'Save Portfolio')}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Analysis tab for stock predictions
  const renderAnalysisTab = () => {
    return (
      <div className="analysis-container">
        <h2 className="section-title">Stock Analysis & Predictions</h2>
        
        {!selectedStock ? (
          <div className="select-stock-prompt">
            <p>Select a stock from your portfolio to analyze.</p>
            {portfolio.length > 0 && (
              <div className="quick-select-stocks">
                {portfolio.map(stock => (
                  <button
                    key={stock}
                    className="stock-button"
                    onClick={() => analyzeStock(stock)}
                  >
                    {stock}
                  </button>
                ))}
              </div>
            )}
            
            {portfolio.length === 0 && (
              <button
                className="primary-button"
                onClick={() => setActiveTab('portfolio')}
              >
                Create Your Portfolio First
              </button>
            )}
          </div>
        ) : isAnalyzing ? (
          <div className="analysis-loading">
            <div className="loading-spinner"></div>
            <p>Analyzing {selectedStock}...</p>
            <p className="loading-detail">Gathering news and market data...</p>
          </div>
        ) : (
          <div className="analysis-results">
            <div className="stock-header">
              <h3>{selectedStock}</h3>
              <div className={`prediction-badge ${analysisResults.sentiment}`}>
                {analysisResults.prediction}
              </div>
            </div>
            
            <div className="analysis-section">
              <h4 className="section-subtitle">
                <Search size={16} />
                External Factors
              </h4>
              <ul className="factors-list">
                {analysisResults.externalFactors?.map((factor, index) => (
                  <li key={index}>{factor}</li>
                ))}
              </ul>
            </div>
            
            <div className="analysis-section">
              <h4 className="section-subtitle">
                <FileText size={16} />
                News Article Analysis
              </h4>
              <div className="articles-list">
                {analysisResults.articles?.map((article, index) => (
                  <div key={index} className={`article-item ${article.sentiment.toLowerCase()}`}>
                    <div className="article-title">{article.title}</div>
                    <div className="article-source">{article.source}</div>
                    <div className="article-sentiment">{article.sentiment}</div>
                    <div className="article-summary">{article.summary}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="prediction-summary">
              {analysisResults.summary}
            </div>
            
            <div className="analysis-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  setSelectedStock(null);
                  setAnalysisResults({});
                }}
              >
                Analyze Another Stock
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return isAuthenticated ? renderMainApp() : renderAuthForm();
};

export default EnhancedStockApp;