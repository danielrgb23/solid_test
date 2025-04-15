import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth_context';
import { SOLID_PROVIDERS } from '../constants/providers';
import { Provider } from '../types/auth';

const LoginComponent: React.FC = () => {
  const { session, login, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Redireciona para o dashboard se já estiver logado
    if (session.isLoggedIn) {
      navigate('/dashboard');
    }
  }, [session.isLoggedIn, navigate]);

  const handleLogin = async () => {
    if (!selectedProvider) {
      setError('Please select a provider');
      return;
    }

    try {
      setError('');
      await login(selectedProvider);
      // O redirecionamento acontecerá automaticamente pelo useEffect
    } catch (err) {
      setError('Failed to login. Please try again.');
    }
  };

  return (
    <div className="login-container">
      {!session.isLoggedIn ? (
        <div className="login-form">
          <h2>Choose your SOLID Provider</h2>
          <div className="providers-list">
            {SOLID_PROVIDERS.map((provider) => (
              <div
                key={provider.id}
                className={`provider-option ${selectedProvider?.id === provider.id ? 'selected' : ''}`}
                onClick={() => setSelectedProvider(provider)}
              >
                {provider.logo && (
                  <img
                    src={provider.logo}
                    alt={provider.name}
                    className="provider-logo"
                  />
                )}
                <span>{provider.name}</span>
              </div>
            ))}
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button
            onClick={handleLogin}
            disabled={!selectedProvider}
            className="login-button"
          >
            Login with {selectedProvider?.name || 'SOLID'}
          </button>
        </div>
      ) : (
        <div className="user-info">
          <p>Logged in as: {session.webId}</p>
          <p>Provider: {session.provider?.name}</p>
          <button onClick={logout} className="logout-button">
            Log out
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginComponent;