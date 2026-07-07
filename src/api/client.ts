import { Platform } from 'react-native';

// Android emulator can't see the host's localhost — it lives behind 10.0.2.2.
// A physical device needs your machine's LAN IP here instead.
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const PORT = 4000;

export const API_BASE_URL = `http://${HOST}:${PORT}`;
export const WS_URL = `ws://${HOST}:${PORT}/ws`;

export type ServerFabAction = {
  key: string;
  icon: string;
  label: string;
  color: string;
  enabled: boolean;
};

export type ServerFabConfig = {
  version: number;
  updatedAt: number;
  actions: ServerFabAction[];
};
