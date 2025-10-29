/**
 * Environment-aware module loader for Lambda layers and local node_modules
 * Handles dependency loading across different runtime environments
 */

/**
 * Detect current execution environment
 * @returns {string} Environment type: 'lambda', 'cli', or 'test'
 */
function detectEnvironment() {
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return 'lambda'
  }
  if (process.env.NODE_ENV === 'test') {
    return 'test'
  }
  return 'cli'
}

/**
 * Require modules from Lambda layers or local node_modules based on environment
 * @param {string} moduleName - The module name to require
 * @param {object} options - Optional configuration
 * @param {boolean} options.required - Whether the module is required (default: true)
 * @returns {any} The required module
 * @throws {Error} If module cannot be loaded and is required
 */
function layerRequire(moduleName, options = {}) {
  const { required = true } = options
  const environment = detectEnvironment()
  
  let module = null
  let lastError = null

  try {
    if (environment === 'lambda') {
      // Try Lambda layer path first
      try {
        module = require(`/opt/nodejs/node_modules/${moduleName}`)
      } catch (layerError) {
        lastError = layerError
        // Fallback to local node_modules in Lambda (shouldn't normally happen)
        module = require(moduleName)
      }
    } else {
      // CLI or test environment - use local node_modules
      module = require(moduleName)
    }
  } catch (error) {
    lastError = error
    
    if (required) {
      const errorMessage = `Failed to load module '${moduleName}' in ${environment} environment: ${error.message}`
      
      if (environment === 'lambda') {
        throw new Error(`${errorMessage}\n\nThis may indicate:\n- Lambda layer is not properly configured\n- Module is not included in the layer\n- Layer path is incorrect`)
      } else {
        throw new Error(`${errorMessage}\n\nThis may indicate:\n- Module is not installed (run 'npm install')\n- Module name is incorrect\n- Dependencies are missing`)
      }
    }
  }

  return module
}

/**
 * Validate that a dependency can be loaded
 * @param {string} moduleName - Module name to validate
 * @returns {boolean} True if module can be loaded
 */
function validateDependency(moduleName) {
  try {
    layerRequire(moduleName, { required: false })
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get information about the current environment and available modules
 * @returns {object} Environment information
 */
function getEnvironmentInfo() {
  const environment = detectEnvironment()
  
  return {
    environment,
    isLambda: environment === 'lambda',
    isCLI: environment === 'cli',
    isTest: environment === 'test',
    lambdaFunction: process.env.AWS_LAMBDA_FUNCTION_NAME || null,
    nodeVersion: process.version,
    platform: process.platform
  }
}

module.exports = layerRequire
module.exports.detectEnvironment = detectEnvironment
module.exports.validateDependency = validateDependency
module.exports.getEnvironmentInfo = getEnvironmentInfo