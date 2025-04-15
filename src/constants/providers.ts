import { Provider } from '../types/auth';

export const SOLID_PROVIDERS: Provider[] = [
  {
    id: 'inrupt',
    name: 'Inrupt',
    url: 'https://login.inrupt.com',
    logo: 'inrupt-logo.png'
  },
  {
    id: 'solidcommunity',
    name: 'Solid Community NET',
    url: 'https://solidcommunity.net',
    logo: 'solid-community-logo.png'
  },
  {
    id: 'solid-community',
    name: 'Solid Community',
    url: 'https://solid.community',
    logo: 'solid-logo.png'
  },
  {
    id: 'community-solid-server',
    name: 'Community Solid Server',
    url: 'https://solid-dev.itsnoon.net',
    logo: ''
  }
];