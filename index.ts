import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

// Polyfill Platform for libraries that use it without importing it
if (typeof global !== 'undefined') {
  (global as any).Platform = Platform;
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
