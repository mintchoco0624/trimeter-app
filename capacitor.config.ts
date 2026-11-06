import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bsit4c.trimeter',
  appName: 'TriMeter',
  webDir: 'www',
  plugins: {
    StatusBar: { backgroundColor: '#24419B', style: 'DARK', overlaysWebView: false },
  },
};

export default config;
