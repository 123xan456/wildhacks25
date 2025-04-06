import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff, TrendingUp, FileText, Search, Briefcase } from 'lucide-react';
import './stocker.css';
import ApiService from './ApiService';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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
    stocks: [], // Will store simple stock symbols during selection
    fullNameStocks: {}, // Will map symbol to full name for later use
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
  const [portfolioDetails, setPortfolioDetails] = useState({}); // Store details for all portfolio stocks
  
  // Stock verification and historical data states
  const [isVerifyingStock, setIsVerifyingStock] = useState(false);
  const [stockVerificationResult, setStockVerificationResult] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [chartTimeframe, setChartTimeframe] = useState('1W'); // 1W, 1M, 6M, 1Y
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [stockDetails, setStockDetails] = useState(null); // Store company name and other details

  // Popular stocks for quick selection
  const popularStocks = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 
    'TSLA', 'NVDA', 'JPM', 'V', 'WMT'
  ];

  // Use an effect to load stock details when portfolio changes
  useEffect(() => {
    if (portfolio.length > 0 && isAuthenticated) {
      fetchPortfolioDetails(portfolio);
    }
  }, [isAuthenticated]); // Only run when authentication state changes

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
      // Remove the stock
      setFormData({
        ...formData,
        stocks: formData.stocks.filter(s => s !== stock),
        // Also remove from fullNameStocks if it exists
        fullNameStocks: { 
          ...formData.fullNameStocks,
          [stock]: undefined 
        }
      });
    } else {
      // Add the stock - verify and get company name
      setIsVerifyingStock(true);
      
      ApiService.verifyStockSymbol(stock)
        .then(result => {
          if (result.valid) {
            const fullNameFormat = result.name !== stock ? 
              `${stock} | ${result.name}` : stock;
            
            setFormData(prev => ({
              ...prev,
              stocks: [...prev.stocks, stock], // Add simple symbol for selection UI
              fullNameStocks: {
                ...prev.fullNameStocks,
                [stock]: fullNameFormat // Store the full display format for later use
              }
            }));
            
            setStockVerificationResult({
              success: true,
              message: `${stock} (${result.name}) added successfully.`,
              stockInfo: result
            });
          } else {
            setStockVerificationResult({
              success: false,
              message: `${stock} could not be verified as a valid stock symbol.`
            });
          }
        })
        .catch(error => {
          console.error("Error verifying stock:", error);
          setStockVerificationResult({
            success: false,
            message: "Error occurred while verifying the stock symbol."
          });
        })
        .finally(() => {
          setIsVerifyingStock(false);
          // Clear verification result after 3 seconds
          setTimeout(() => {
            setStockVerificationResult(null);
          }, 3000);
        });
    }
  };

  // Add custom stock
  const addCustomStock = async () => {
    if (!formData.customStock) return;
    
    const stockSymbol = formData.customStock.toUpperCase().trim();
    
    if (!formData.stocks.includes(stockSymbol)) {
      // Verify the stock exists using Polygon API
      setIsVerifyingStock(true);
      
      try {
        const verificationResult = await ApiService.verifyStockSymbol(stockSymbol);
        
        if (verificationResult.valid) {
          // Create the full display format
          const fullNameFormat = verificationResult.name !== stockSymbol ? 
            `${stockSymbol} | ${verificationResult.name}` : stockSymbol;
          
          setFormData({
            ...formData,
            stocks: [...formData.stocks, stockSymbol], // Add simple symbol for UI
            fullNameStocks: {
              ...formData.fullNameStocks,
              [stockSymbol]: fullNameFormat // Store full format for later use
            },
            customStock: ''
          });
          
          setStockVerificationResult({
            success: true,
            message: `${stockSymbol} (${verificationResult.name}) added successfully.`,
            stockInfo: verificationResult
          });
        } else {
          setStockVerificationResult({
            success: false,
            message: `${stockSymbol} could not be verified as a valid stock symbol.`
          });
        }
      } catch (error) {
        console.error("Error verifying stock:", error);
        setStockVerificationResult({
          success: false,
          message: "Error occurred while verifying the stock symbol."
        });
      } finally {
        setIsVerifyingStock(false);
        // Clear verification result after 3 seconds
        setTimeout(() => {
          setStockVerificationResult(null);
        }, 3000);
      }
    } else {
      setStockVerificationResult({
        success: false,
        message: `${stockSymbol} is already in your portfolio.`
      });
      
      // Clear verification result after 3 seconds
      setTimeout(() => {
        setStockVerificationResult(null);
      }, 3000);
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
              setPortfolio([]); // Empty portfolio for new users
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
            
            // Get the stocks from the backend (should already be in full name format)
            const dbStocks = result.user.stocks || [];
            
            // Convert the stocks from MongoDB to our object format with symbol and fullName
            const portfolioData = dbStocks.map(stockText => {
              if (stockText.includes(' | ')) {
                // It's already in the combined format
                const [symbol, companyName] = stockText.split(' | ');
                return {
                  symbol,
                  fullName: stockText
                };
              } else {
                // Legacy data that only has the symbol
                return {
                  symbol: stockText,
                  fullName: stockText
                };
              }
            });
            
            setPortfolio(portfolioData);
            
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
      // Create array of full display names for MongoDB
      const stocksWithNames = formData.stocks.map(symbol => {
        // Use full name format if available, otherwise just the symbol
        return formData.fullNameStocks[symbol] || symbol;
      });
      
      // Save stocks with full names to MongoDB
      const stocksResult = await ApiService.updateStocks(
        currentUser.username,
        stocksWithNames
      );
      
      // Save frequency preferences to MongoDB
      const frequencyResult = await ApiService.updateFrequency(
        currentUser.username,
        formData.frequency
      );
      
      if (stocksResult.success && frequencyResult.success) {
        // Create portfolio with full display names
        const portfolioWithNames = formData.stocks.map(symbol => {
          const fullName = formData.fullNameStocks[symbol];
          return { symbol, fullName: fullName || symbol };
        });
        
        // Update local portfolio state with the combined data
        setPortfolio(portfolioWithNames);
        
        // Update the current user data
        setCurrentUser({
          ...currentUser,
          stocks: stocksWithNames, // Now we store full names in the backend
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
    // Extract symbols and create fullNameStocks mapping from current portfolio
    const symbols = [];
    const fullNameMap = {};
    
    portfolio.forEach(item => {
      if (typeof item === 'string') {
        symbols.push(item);
      } else {
        symbols.push(item.symbol);
        if (item.fullName) {
          fullNameMap[item.symbol] = item.fullName;
        }
      }
    });
    
    setFormData({
      ...formData,
      stocks: symbols,
      fullNameStocks: fullNameMap,
      frequency: currentUser?.frequency || 'daily'
    });
    setShowPortfolioForm(true);
    setStep(1);
  };

  // Handle analysis for a specific stock
  const analyzeStock = async (stockSymbol) => {
    setSelectedStock(stockSymbol);
    setIsAnalyzing(true);
    setHistoricalData([]); // Clear previous data
    
    // Find the stock details from portfolio if available
    const stockItem = portfolio.find(item => 
      (typeof item === 'string' ? item : item.symbol) === stockSymbol
    );
    
    // If we have a full name, use it directly instead of making another API call
    if (stockItem && typeof stockItem !== 'string' && stockItem.fullName) {
      if (stockItem.fullName.includes(' | ')) {
        const [symbol, companyName] = stockItem.fullName.split(' | ');
        setStockDetails({
          symbol: stockSymbol,
          name: companyName
        });
      } else {
        // Just set the symbol if no company name is available
        setStockDetails({
          symbol: stockSymbol,
          name: stockSymbol
        });
      }
    } else {
      // If we don't have the company name, fetch it
      try {
        const stockInfo = await ApiService.verifyStockSymbol(stockSymbol);
        if (stockInfo.valid) {
          setStockDetails({
            symbol: stockSymbol,
            name: stockInfo.name || stockSymbol,
            market: stockInfo.market
          });
        } else {
          // If verification fails, just use the symbol
          setStockDetails({
            symbol: stockSymbol,
            name: stockSymbol
          });
        }
      } catch (detailsError) {
        console.error("Error fetching stock details:", detailsError);
        // Use symbol as fallback
        setStockDetails({
          symbol: stockSymbol,
          name: stockSymbol
        });
      }
    }
    
    try {
      // Fetch historical data for the stock
      await fetchHistoricalData(stockSymbol, chartTimeframe);
      
      // Call your FastAPI backend
      const response = await fetch('http://localhost:8000/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stock: stockSymbol })
      });
      const data = await response.json();
      
      // Use the data from your backend in the analysis
      setAnalysisResults({
        stock: stockSymbol,
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
        stock: stockSymbol,
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

  // Fetch historical stock data based on timeframe
  const fetchHistoricalData = async (symbol, timeframe) => {
    setIsLoadingChart(true);
    setHistoricalData([]); // Clear previous data
    
    try {
      // Calculate date range based on timeframe
      const endDate = new Date();
      let startDate = new Date();
      
      switch(timeframe) {
        case '1W':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '1M':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case '6M':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1Y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7); // Default to 1W
      }
      
      // Format dates for API
      const formatDate = (date) => {
        return date.toISOString().split('T')[0];
      };
      
      const from = formatDate(startDate);
      const to = formatDate(endDate);
      
      // Fetch data from Polygon API via your service
      const data = await ApiService.getHistoricalData(symbol, from, to);
      
      // Only update if we got data back
      if (data && data.length > 0) {
        setHistoricalData(data);
      } else {
        console.warn(`No data returned for ${symbol} from ${from} to ${to}`);
        setHistoricalData([]); // Set empty array to clearly indicate no data
      }
    } catch (error) {
      console.error("Error fetching historical data:", error);
      setHistoricalData([]);
    } finally {
      setIsLoadingChart(false);
    }
  };

  // Reset form to start again
  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      stocks: [],
      fullNameStocks: {},
      customStock: '',
      frequency: 'daily'
    });
    setStep(1);
    setAccountCreated(false);
    setAnalysisResults({});
    setSelectedStock(null);
    setShowPortfolioForm(false);
  };
  
  // Determine chart color based on price trend (green for up, red for down)
  const determineChartColor = (data) => {
    if (!data || data.length < 2) return 'rgb(75, 192, 192)'; // Default teal if not enough data
    
    const firstPrice = data[0].c; // First closing price
    const lastPrice = data[data.length - 1].c; // Last closing price
    
    return lastPrice >= firstPrice ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'; // Green if up or equal, red if down
  };
  
  // Add opacity to a color string
  const addOpacity = (colorString, opacity) => {
    if (colorString.startsWith('rgb(')) {
      const rgbValues = colorString.match(/\d+/g);
      return `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, ${opacity})`;
    }
    return colorString; // Return original if not rgb format
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
              {[...portfolio].sort((a, b) => {
                // Sort by symbol if dealing with objects
                const symbolA = typeof a === 'string' ? a : a.symbol;
                const symbolB = typeof b === 'string' ? b : b.symbol;
                return symbolA.localeCompare(symbolB);
              }).map(stock => {
                // Extract symbol and display name
                const symbol = typeof stock === 'string' ? stock : stock.symbol;
                const displayName = typeof stock === 'string' ? 
                  stock : 
                  (stock.fullName || symbol);
                
                return (
                  <div key={symbol} className="portfolio-stock-item">
                    <div className="stock-info">
                      <span className="stock-name">{displayName}</span>
                    </div>
                    <button 
                      className="analyze-button"
                      onClick={() => {
                        setActiveTab('analysis');
                        analyzeStock(symbol);
                      }}
                    >
                      <TrendingUp size={16} />
                      <span>Analyze</span>
                    </button>
                  </div>
                );
              })}
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
                  disabled={isVerifyingStock}
                />
                <button
                  type="button"
                  onClick={addCustomStock}
                  className="add-button"
                  disabled={isVerifyingStock || !formData.customStock}
                >
                  {isVerifyingStock ? 'Verifying...' : 'Add'}
                </button>
              </div>
              
              {stockVerificationResult && (
                <div className={`verification-message ${stockVerificationResult.success ? 'success' : 'error'}`}>
                  {stockVerificationResult.message}
                </div>
              )}
            </div>
            
            {formData.stocks.length > 0 && (
              <div className="form-field">
                <label className="field-label">Selected Stocks</label>
                <div className="selected-stocks-container">
                  {[...formData.stocks].sort((a, b) => {
                    // Sort by symbol if dealing with objects
                    const symbolA = typeof a === 'string' ? a : a.symbol;
                    const symbolB = typeof b === 'string' ? b : b.symbol;
                    return symbolA.localeCompare(symbolB);
                  }).map(stock => {
                    // Extract symbol for key and display
                    const symbol = typeof stock === 'string' ? stock : stock.symbol;
                    const displayText = typeof stock === 'string' ? 
                      stock : 
                      (stock.symbol); // Just show symbol in the chips for cleaner UI
                    
                    return (
                      <div key={symbol} className="selected-stock">
                        {displayText}
                        <button 
                          type="button" 
                          onClick={() => toggleStock(stock)}
                          className="remove-stock"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
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
                {[...portfolio].sort((a, b) => {
                  // Sort by symbol
                  const symbolA = typeof a === 'string' ? a : a.symbol;
                  const symbolB = typeof b === 'string' ? b : b.symbol;
                  return symbolA.localeCompare(symbolB);
                }).map(stock => {
                  // Extract symbol and display name
                  const symbol = typeof stock === 'string' ? stock : stock.symbol;
                  const displayName = typeof stock === 'string' ? 
                    stock : 
                    (stock.fullName || symbol);
                  
                  return (
                    <button
                      key={symbol}
                      className="stock-button analysis-stock-button"
                      onClick={() => analyzeStock(symbol)}
                    >
                      <span className="stock-button-symbol">{symbol}</span>
                      {displayName !== symbol && displayName.includes(' | ') && (
                        <span className="stock-button-company">{displayName.split(' | ')[1]}</span>
                      )}
                    </button>
                  );
                })}
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
              <h3>
                {selectedStock}
                {stockDetails && stockDetails.name && stockDetails.name !== selectedStock && (
                  <span className="company-name"> | {stockDetails.name}</span>
                )}
              </h3>
              <div className={`prediction-badge ${analysisResults.sentiment}`}>
                {analysisResults.prediction}
              </div>
            </div>
            
            {/* Historical Stock Chart */}
            <div className="stock-chart-section">
              <h4 className="section-subtitle">Historical Performance</h4>
              
              <div className="chart-timeframe-controls">
                {['1W', '1M', '6M', '1Y'].map(timeframe => (
                  <button
                    key={timeframe}
                    className={`timeframe-button ${chartTimeframe === timeframe ? 'active' : ''}`}
                    onClick={() => {
                      setChartTimeframe(timeframe);
                      fetchHistoricalData(selectedStock, timeframe);
                    }}
                    disabled={isLoadingChart}
                  >
                    {timeframe}
                  </button>
                ))}
              </div>
              
              <div className="chart-container">
                {isLoadingChart ? (
                  <div className="loading-chart">
                    <div className="loading-spinner"></div>
                    <p>Loading chart data...</p>
                  </div>
                ) : historicalData.length > 0 ? (
                  <Line
                    data={{
                      labels: historicalData.map(dataPoint => {
                        // Convert timestamp to date string (assuming timestamp is in milliseconds)
                        const date = new Date(dataPoint.t);
                        return date.toLocaleDateString();
                      }),
                      datasets: [
                        {
                          label: ' ', // Empty label 
                          data: historicalData.map(dataPoint => dataPoint.c), // Closing price
                          borderColor: determineChartColor(historicalData),
                          backgroundColor: addOpacity(determineChartColor(historicalData), 0.2),
                          tension: 0.1,
                          fill: true
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false, // Hide legend since we only have one dataset
                        },
                        title: {
                          display: true,
                          text: `${selectedStock}${stockDetails?.name && stockDetails.name !== selectedStock ? ` | ${stockDetails.name}` : ''} - ${chartTimeframe} Historical Price`
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: false,
                          title: {
                            display: true,
                            text: 'Price ($)'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Date'
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="no-chart-data">
                    <p>No historical data available for this timeframe.</p>
                  </div>
                )}
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
                  setHistoricalData([]);
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

  // Fetch details for all stocks in portfolio
  const fetchPortfolioDetails = async (stocks) => {
    const details = { ...portfolioDetails }; // Start with existing details
    const newStocks = stocks.filter(stock => !details[stock]); // Only fetch for new stocks
    
    // Show loading indicator if fetching many stocks
    if (newStocks.length > 3) {
      setIsLoading(true);
    }
    
    for (const stock of newStocks) {
      try {
        const stockInfo = await ApiService.verifyStockSymbol(stock);
        if (stockInfo.valid) {
          details[stock] = {
            symbol: stock,
            name: stockInfo.name || stock,
            market: stockInfo.market
          };
        } else {
          // Add placeholder if verification fails
          details[stock] = { symbol: stock, name: stock };
        }
      } catch (error) {
        console.error(`Error fetching details for ${stock}:`, error);
        // Add a fallback entry with just the symbol
        details[stock] = { symbol: stock, name: stock };
      }
    }
    
    // Set the updated portfolio details with both existing and new stock info
    setPortfolioDetails(details);
    
    if (newStocks.length > 3) {
      setIsLoading(false);
    }
  };

  return isAuthenticated ? renderMainApp() : renderAuthForm();
};

export default EnhancedStockApp;