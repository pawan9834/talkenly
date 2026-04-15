const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude native build directories from Metro's file watcher to prevent ENOENT errors on Windows
config.resolver.blockList = [
  ... (config.resolver.blockList || []),
  /android\/.*/,
  /ios\/.*/,
];

module.exports = config;
