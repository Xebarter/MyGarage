const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const shimPath = path.resolve(projectRoot, 'lib/react-native-font-shim.ts');
const googleSansTextPath = path.resolve(projectRoot, 'lib/google-sans-text.tsx');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isAppSource = context.originModulePath.startsWith(projectRoot);
  const usesNativeReactNative =
    context.originModulePath === shimPath || context.originModulePath === googleSansTextPath;

  if (moduleName === 'react-native' && isAppSource && !usesNativeReactNative) {
    return {
      filePath: shimPath,
      type: 'sourceFile',
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
