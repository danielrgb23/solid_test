export interface Provider {
  id: string;
  name: string;
  url: string;
  logo?: string;
}

export interface AuthSession {
  isLoggedIn: boolean;
  webId: string | null | undefined;
  provider: Provider | null;
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export interface AuthContextType {
  session: AuthSession;
  login: (provider: Provider) => Promise<void>;
  logout: () => Promise<void>;
}