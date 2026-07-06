const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const shimPath = path.resolve(projectRoot, 'lib/react-native-font-shim.ts');
const appFontTextPath = path.resolve(projectRoot, 'lib/app-font-text.tsx');
const reactNativeOriginal = path.resolve(projectRoot, 'node_modules/react-native');

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  'react-native-original': reactNativeOriginal,
};

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = normalizePath(context.originModulePath);
  const project = normalizePath(projectRoot);
  const isAppSource = origin.startsWith(project);
  const usesNativeReactNative =
    origin === normalizePath(shimPath) || origin === normalizePath(appFontTextPath);

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
