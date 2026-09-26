// This function is designed to override the default behavior of events in a browser,
//such as preventing the default action of a key press or stopping the event
//from propagating further up the DOM tree.
export const overrideSystemShortcut = (e) => {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) {
      e.stopPropagation();
    } else if (window.event) {
      window.event.cancelBubble = true; // IE-specific way to stop propagation
    }
  }
};

// This function removes duplicates from an array efficiently
export const removeDuplicate = (a) => {
  let seen = {};
  let out = [];
  let len = a.length;
  let j = 0;
  for (let i = 0; i < len; i++) {
    let item = a[i];
    if (seen[item] !== 1) {
      seen[item] = 1; // Mark the item as seen
      out[j++] = item; // Add the unique item to the output array
    }
  }
  return out;
};

// This recursive function ensures that keys are held down in the correct order to match a given shortcut.
export const checkAllHeldKeys = (
  shortcutKey,
  shortcutKeyRecursionIndex = 0,
  shortcutArray,
  heldKeysArray
) => {
  const shortcutIndexOfKey = shortcutArray.indexOf(shortcutKey);

  // Early exit if the key isn't even in the shortcut combination.
  if (shortcutArray?.indexOf(shortcutKey) < 0) return false;

  // While holding down one of the keys, if another is to be let go, the shortcut
  // should be void. Shortcut keys must be held down in a specifc order.
  // This function is always called before a key is added to held keys on keydown,
  // this will ensure that heldKeys only contains the prefixing keys
  //if pressed key is one of the shortcut but not in correct order then return false
  const comparisonIndex = Math.max(heldKeysArray?.length - 1, 0);
  if (
    heldKeysArray?.length &&
    heldKeysArray[comparisonIndex] !== shortcutArray[comparisonIndex]
  ) {
    return false;
  }

  // if shortcutKey is first item of shortcutArray
  // except if this is a recursive call
  if (shortcutIndexOfKey === 0) {
    // If this isn't the first iteration of this recursive function, and we're
    // recursively calling this function, we should always be checking the
    // currently held down keys instead of returning true
    if (shortcutKeyRecursionIndex > 0)
      return heldKeysArray?.indexOf(shortcutKey) >= 0;
    return true; // Return true if this is the first key of the shortcut
  }

  // Early exit if the key just before the currently checked shortcut key
  // isn't being held down.
  const previousShortcutKeyIndex = shortcutIndexOfKey - 1;
  const previousShortcutKey = shortcutArray[previousShortcutKeyIndex];
  const previousShortcutKeyHeld =
    heldKeysArray[previousShortcutKeyIndex] === previousShortcutKey;
  if (!previousShortcutKeyHeld) return false;

  // Recursively call this function with the previous key as the new shortcut key
  // but the index of the current shortcut key.
  return checkAllHeldKeys(
    previousShortcutKey,
    shortcutIndexOfKey,
    shortcutArray,
    heldKeysArray
  );
};

//Platform Detection Function
export const isMac = () => {
  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();

  return (
    platform.includes("mac") ||
    platform.includes("iphone") ||
    platform.includes("ipad") ||
    userAgent.includes("macintosh") ||
    userAgent.includes("mac os x")
  );
};

/**
 * Formats keyboard shortcuts based on the current platform.
 * @param {Object} keyboardShortcuts - The keyboard shortcuts configuration.
 * @returns {Object} The formatted keyboard shortcuts.
 */
export const formatKeyboardShortcuts = (keyboardShortcuts = {}) => {
  const formattedShortcuts = {};
  const globalSeenShortcuts = { sidebar: {} };
  const platform = isMac() ? "mac" : "windows";

  /**
   * Helper function to process each set of shortcuts.
   * @param {Array} shortcuts - Array of shortcut objects.
   * @param {Object} target - The target object to store formatted shortcuts.
   * @param {String} shortcutComponent - The component type (e.g., "sidebar").
   */
  const processShortcuts = (shortcuts, target, shortcutComponent) => {
    const localSeenShortcuts = {};
    shortcuts?.forEach(({ action, button, mac, windows }) => {
      const platformShortcut = platform === "mac" ? mac : windows;
      const formattedAction = action === "click" ? button : action;

      if (
        !platformShortcut ||
        !Array.isArray(platformShortcut) ||
        !formattedAction
      ) {
        console.warn(
          `Invalid shortcut configuration for action: ${formattedAction}`
        );
        return;
      }

      //stringfy to track duplicates
      const shortcutKey = JSON.stringify(platformShortcut);

      if (
        !localSeenShortcuts[shortcutKey] &&
        (!globalSeenShortcuts[shortcutKey] ||
          globalSeenShortcuts.sidebar?.[shortcutKey])
      ) {
        target[formattedAction] = platformShortcut;
        globalSeenShortcuts[shortcutKey] = true;
        localSeenShortcuts[shortcutKey] = true;
        if (shortcutComponent === "sidebar") {
          globalSeenShortcuts.sidebar[shortcutKey] = true;
        }
      } else {
        console.warn(
          `Duplicate shortcut: ${shortcutKey} for action: ${formattedAction}`
        );
      }
    });
  };

  // Process different types of shortcuts
  for (const [type, shortcuts] of Object.entries(keyboardShortcuts)) {
    if (type === "sidebar") {
      formattedShortcuts.sidebar = {};
      for (const [serviceApp, serviceShortcuts] of Object.entries(shortcuts)) {
        formattedShortcuts.sidebar[serviceApp] = {};
        processShortcuts(
          serviceShortcuts,
          formattedShortcuts.sidebar[serviceApp],
          type
        );
      }
    } else {
      formattedShortcuts[type] = {};
      processShortcuts(shortcuts, formattedShortcuts[type]);
    }
  }

  return formattedShortcuts;
};
