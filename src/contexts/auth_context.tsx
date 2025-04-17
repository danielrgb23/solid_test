import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  handleIncomingRedirect,
  getDefaultSession,
  login as solidLogin,
  fetch as solidFetch,
  Session
} from "@inrupt/solid-client-authn-browser";
import { AuthSession, AuthContextType, Provider } from '../types/auth';

const initialSession: AuthSession = {
  isLoggedIn: false,
  webId: null,
  provider: null,
  fetch: undefined
};

const AuthContext = createContext<AuthContextType>({
  session: initialSession,
  login: async () => {},
  logout: async () => {}
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<AuthSession>(initialSession);

  const handleSession = (solidSession: Session) => {
    setSession({
      isLoggedIn: solidSession.info.isLoggedIn,
      webId: solidSession.info.webId,
      provider: session.provider,
      fetch: solidSession.fetch
    });
  };

  useEffect(() => {
    // Restaurar sessão anterior ou lidar com redirecionamento após login
    handleIncomingRedirect({
      restorePreviousSession: true
    }).then((info) => {
      if (info?.webId) {
        const solidSession = getDefaultSession();
        handleSession(solidSession);
      }
    });
  }, []);

  const login = async (provider: Provider): Promise<void> => {
    try {
      // Atualiza o provedor antes do redirecionamento
      setSession(prev => ({
        ...prev,
        provider
      }));

      await solidLogin({
        oidcIssuer: provider.url,
        redirectUrl: window.location.href,
        clientName: "SOLID POD Explorer"
      });
    } catch (error) {
      console.error('Login failed:', error);
      setSession(initialSession);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const solidSession = getDefaultSession();
      await solidSession.logout();
      setSession(initialSession);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar o contexto de autenticação
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;