/**
 * Callback registry for dependent components
 * This allows dependent components (like TableConfigurator) to register
 * their save functions so they can be executed when the parent's Next button is clicked
 */

// Registry to store callbacks by component type
const callbackRegistry = {
  tableConfigurator: null,
  filterConfigurator: null,
};

/**
 * Register a save callback for a dependent component
 * @param {string} componentType - Type of component ('tableConfigurator' or 'filterConfigurator')
 * @param {Function} callback - The save function to register
 */
export const registerDependentComponentCallback = (componentType, callback) => {
  if (componentType && callback) {
    callbackRegistry[componentType] = callback;
  }
};

/**
 * Unregister a save callback for a dependent component
 * @param {string} componentType - Type of component to unregister
 */
export const unregisterDependentComponentCallback = (componentType) => {
  if (componentType) {
    callbackRegistry[componentType] = null;
  }
};

/**
 * Get a registered callback for a dependent component
 * @param {string} componentType - Type of component to get callback for
 * @returns {Function|null} - The registered callback or null
 */
export const getDependentComponentCallback = (componentType) => {
  return callbackRegistry[componentType] || null;
};

/**
 * Execute all registered callbacks sequentially
 * @returns {Promise<boolean>} - Returns true if all callbacks succeed, false otherwise
 */
export const executeAllDependentComponentCallbacks = async () => {
  const callbacks = Object.values(callbackRegistry).filter(Boolean);
  
  if (callbacks.length === 0) {
    return true; // No callbacks to execute
  }

  try {
    // Execute all callbacks sequentially
    for (const callback of callbacks) {
      const result = await callback();
      // If any callback returns false, stop execution and return false
      if (result === false) {
        return false;
      }
    }
    return true; // All callbacks succeeded
  } catch (error) {
    console.error("Error executing dependent component callbacks:", error);
    return false;
  }
};

/**
 * Clear all registered callbacks
 */
export const clearAllCallbacks = () => {
  Object.keys(callbackRegistry).forEach((key) => {
    callbackRegistry[key] = null;
  });
};

