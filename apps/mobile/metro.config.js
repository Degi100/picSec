const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Monorepo Root
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo Packages einbinden
config.watchFolders = [monorepoRoot];

// node_modules an beiden Stellen suchen
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
