import { AppText, AppTextInput } from './app-font-text';

// Proxy avoids `export *`, which eagerly reads deprecated react-native getters
// (PushNotificationIOS, Clipboard, etc.) and floods LogBox with warnings.
const ReactNative = require('react-native-original') as Record<string | symbol, unknown>;

module.exports = new Proxy(ReactNative, {
  get(target, prop) {
    if (prop === 'Text') return AppText;
    if (prop === 'TextInput') return AppTextInput;
    return target[prop];
  },
});
