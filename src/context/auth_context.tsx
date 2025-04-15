import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  handleIncomingRedirect,
  getDefaultSession,
  login as solidLogin,
} from "@inrupt/solid-client-authn-browser";
import { AuthSession, Provider } from '../types/auth';
import '../styles/login.css'

interface AuthContextType {
  session: AuthSession;
  login: (provider: Provider) => Promise<void>;
  logout: () => Promise<void>;
}

const initialSession: AuthSession = {
  isLoggedIn: false,
  webId: null,
  provider: null
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<AuthSession>(initialSession);

  useEffect(() => {
    handleIncomingRedirect({
      restorePreviousSession: true
    }).then((info) => {
      if (info?.webId) {
        setSession(prev => ({
          ...prev,
          isLoggedIn: true,
          webId: info.webId || null,
        }));
      }
    });
  }, []);

  const login = async (provider: Provider): Promise<void> => {
    try {
      await solidLogin({
        oidcIssuer: provider.url,
        redirectUrl: window.location.href,
        clientName: "Your App Name"
      });
      setSession(prev => ({
        ...prev,
        provider
      }));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    const session = getDefaultSession();
    await session.logout();
    setSession(initialSession);
  };

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};