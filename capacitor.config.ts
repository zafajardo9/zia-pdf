import type { CapacitorConfig } from '@capacitor/cli';
import brand from './brand.config.json';

const config: CapacitorConfig = {
  appId: brand.appId,
  appName: brand.name,
  webDir: 'dist'
};

export default config;
