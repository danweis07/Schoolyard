// Learn more https://docs.expo.dev/guides/monorepos
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot]

// Resolve modules from project, then workspace
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

config.resolver.disableHierarchicalLookup = true

module.exports = withNativeWind(config, { input: './global.css' })
