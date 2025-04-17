import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth_context';
import { SOLID_PROVIDERS } from '../constants/providers';
import { Provider } from '../types/auth';
import '../styles/login.css';

const LoginComponent: React.FC = () => {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session.isLoggedIn) {
      navigate('/dashboard');
    }
  }, [session.isLoggedIn, navigate]);

  const handleLogin = async () => {
    if (!selectedProvider) {
      setError('Please select a provider');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await login(selectedProvider);
    } catch (err) {
      setError('Failed to login. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>SOLID POD Explorer</h1>
        <p className="subtitle">Select your identity provider to continue</p>

        <div className="providers-grid">
          {SOLID_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              className={`provider-button ${selectedProvider?.id === provider.id ? 'selected' : ''}`}
              onClick={() => setSelectedProvider(provider)}
              disabled={isLoading}
            >
              {provider.logo && (
                <img 
                  src={provider.logo} 
                  alt={provider.name} 
                  className="provider-logo"
                />
              )}
              <span>{provider.name}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button
          className="login-button"
          onClick={handleLogin}
          disabled={!selectedProvider || isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </div>
  );
};

export default LoginComponent;