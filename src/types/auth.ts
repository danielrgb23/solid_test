export interface Provider {
    id: string;
    name: string;
    url: string;
    logo?: string;
  }
  
  export interface AuthSession {
    isLoggedIn: boolean;
    webId: string | null;
    provider: Provider | null;
  }