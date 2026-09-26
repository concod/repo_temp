/**
 * Separator used for flattening nested objects
 * Using double underscore to avoid conflicts with field names that contain single underscores
 */
export const NESTED_SEPARATOR = "__";

/**
 * Converts flattened form data back to nested object structure
 * Only converts keys that use the NESTED_SEPARATOR (double underscore)
 * Keys with single underscores are kept as-is (they're part of the field name)
 * 
 * This is used when convertToNested: true is set in API params to convert
 * flat Redux data back to nested structure before sending to API.
 * 
 * @param {object} flatData - Flattened object (e.g., { key1: "v1", key2__key3: "v23", key2__key4: "v24" })
 * @param {object} originalStructure - Original nested structure to use as template (optional, currently unused)
 * @returns {object} Nested object structure (e.g., { key1: "v1", key2: { key3: "v23", key4: "v24" } })
 */
export const flattenToNested = (flatData, originalStructure = null) => {
  if (!flatData || typeof flatData !== "object" || Array.isArray(flatData)) {
    return flatData;
  }

  const nested = {};
  const topLevelKeys = Object.keys(flatData);

  // Safety check: If any key that would become a parent already exists as a top-level key,
  // it means the data might already be in the intended format (not meant to be nested)
  const hasConflictingKeys = topLevelKeys.some((key) => {
    if (key.includes(NESTED_SEPARATOR)) {
      const firstPart = key.split(NESTED_SEPARATOR)[0];
      // If the first part of a flattened key exists as a top-level key with a non-object value,
      // it's likely the data is meant to be flat
      return topLevelKeys.includes(firstPart) && 
             firstPart !== key && 
             (typeof flatData[firstPart] !== "object" || Array.isArray(flatData[firstPart]));
    }
    return false;
  });

  // If there are conflicting keys, return data as-is (don't convert)
  if (hasConflictingKeys) {
    console.warn(
      "flattenToNested: Detected conflicting keys. Data appears to be in intended format. Returning as-is.",
      flatData
    );
    return flatData;
  }

  // Process each key
  Object.keys(flatData).forEach((key) => {
    // Only convert keys that contain the NESTED_SEPARATOR (double underscore)
    // Keys with single underscores are kept as-is (they're part of the field name)
    if (!key.includes(NESTED_SEPARATOR)) {
      // No separator found - keep as-is (e.g., "key1_key2" stays "key1_key2")
      nested[key] = flatData[key];
      return;
    }

    // Split on double underscore separator
    const keys = key.split(NESTED_SEPARATOR);
    
    // If key has no double underscores after split, keep it as-is
    if (keys.length === 1) {
      nested[key] = flatData[key];
      return;
    }

    let current = nested;

    // Build nested structure
    for (let i = 0; i < keys.length - 1; i++) {
      const currentKey = keys[i];
      if (!current[currentKey]) {
        current[currentKey] = {};
      } else if (typeof current[currentKey] !== "object" || Array.isArray(current[currentKey])) {
        // Conflict: this key already exists with a non-object value
        // Keep the original structure for this key
        nested[key] = flatData[key];
        return;
      }
      current = current[currentKey];
    }

    // Set the final value
    const finalKey = keys[keys.length - 1];
    current[finalKey] = flatData[key];
  });

  // If original structure is provided, validate the conversion
  // (Note: This is a basic validation - the structure should match the original)
  if (originalStructure && typeof originalStructure === "object" && !Array.isArray(originalStructure)) {
    // Check if top-level keys match (basic validation)
    const originalKeys = Object.keys(originalStructure);
    const nestedKeys = Object.keys(nested);
    const hasMatchingStructure = originalKeys.every(key => nestedKeys.includes(key)) ||
                                  nestedKeys.every(key => originalKeys.includes(key));
    
    if (!hasMatchingStructure) {
      console.warn(
        "flattenToNested: Converted structure may not match original. Using original structure as reference.",
        { original: originalStructure, converted: nested }
      );
      // Optionally, we could merge with original structure to ensure exact match
      // For now, we trust the conversion but log a warning
    }
  }

  return nested;
};

/**
 * Restores array structures from flat form data based on originalArrayStructure metadata
 * This is needed because dropdowns store only the 'value' field, but we need to restore
 * the original array structure (primitives or objects) on submit.
 * 
 * @param {object} flatData - Flattened form data from Redux
 * @param {array} fields - Array of field definitions with originalArrayStructure metadata
 * @returns {object} Data with arrays restored to original structure
 */
export const restoreArrayStructures = (flatData, fields = []) => {
  if (!flatData || typeof flatData !== "object" || Array.isArray(flatData)) {
    return flatData;
  }

  if (!Array.isArray(fields) || fields.length === 0) {
    return flatData;
  }

  const restored = { ...flatData };

  // Process each field that has originalArrayStructure
  fields.forEach((field) => {
    const fieldName = field.field_name;
    const originalStructure = field.originalArrayStructure;

    // Skip if field doesn't exist in data or doesn't have originalArrayStructure
    if (!fieldName || !originalStructure || !(fieldName in restored)) {
      return;
    }

    const storedValue = restored[fieldName];

    // Skip if stored value is null/undefined/empty
    if (storedValue === null || storedValue === undefined) {
      return;
    }

    // Check if original structure is an array
    if (!Array.isArray(originalStructure)) {
      return;
    }

    // Determine if original array contains objects or primitives
    const isArrayOfObjects = originalStructure.length > 0 && 
                            typeof originalStructure[0] === "object" && 
                            originalStructure[0] !== null &&
                            !Array.isArray(originalStructure[0]);

    // Handle array of primitives
    if (!isArrayOfObjects) {
      // For primitives, stored value should already be an array of primitives
      // Just ensure it's an array
      if (Array.isArray(storedValue)) {
        // Already correct format
        return;
      } else {
        // Convert single value to array
        restored[fieldName] = [storedValue];
      }
      return;
    }

    // Handle array of objects
    // Check if stored value is already an array of objects (table data case)
    if (Array.isArray(storedValue) && storedValue.length > 0) {
      const firstStoredItem = storedValue[0];
      const isStoredValueArrayOfObjects = typeof firstStoredItem === "object" && 
                                         firstStoredItem !== null && 
                                         !Array.isArray(firstStoredItem);
      
      // If stored value is already an array of objects (table data), preserve it as-is
      // This is the case for display_type: "table" where the array is edited directly
      if (isStoredValueArrayOfObjects) {
        // Table data: array is already in correct format, preserve it
        restored[fieldName] = storedValue;
        return;
      }
      
      // Otherwise, stored value is array of primitives/strings (dropdown case)
      // Map stored values back to original object structure
      restored[fieldName] = storedValue.map((storedItem) => {
        // If stored item is a string that looks like JSON, try to parse it
        if (typeof storedItem === "string" && storedItem.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(storedItem);
            // Try to find matching object in original structure
            const originalObj = originalStructure.find((orig) => {
              // Try to match by comparing stringified versions or by key fields
              return JSON.stringify(orig) === storedItem || 
                     (orig.id && orig.id === parsed.id) ||
                     (orig.value && orig.value === parsed.value);
            });
            return originalObj || parsed;
          } catch (e) {
            // Not valid JSON, try to find in original structure by value
            const originalObj = originalStructure.find((orig) => {
              const origStr = JSON.stringify(orig);
              return origStr === storedItem || 
                     origStr.includes(storedItem) ||
                     (orig.id && orig.id === storedItem) ||
                     (orig.value && orig.value === storedItem);
            });
            return originalObj || storedItem;
          }
        } else {
          // Stored item is a primitive, try to find matching object in original structure
          const originalObj = originalStructure.find((orig) => {
            const origStr = JSON.stringify(orig);
            return origStr === String(storedItem) ||
                   (orig.id && orig.id === storedItem) ||
                   (orig.value && orig.value === storedItem);
          });
          return originalObj || storedItem;
        }
      });
    } else {
      // Single value, try to find matching object
      if (typeof storedValue === "string" && storedValue.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(storedValue);
          const originalObj = originalStructure.find((orig) => {
            return JSON.stringify(orig) === storedValue ||
                   (orig.id && orig.id === parsed.id) ||
                   (orig.value && orig.value === parsed.value);
          });
          restored[fieldName] = originalObj || parsed;
        } catch (e) {
          const originalObj = originalStructure.find((orig) => {
            return (orig.id && orig.id === storedValue) ||
                   (orig.value && orig.value === storedValue);
          });
          restored[fieldName] = originalObj || storedValue;
        }
      } else {
        const originalObj = originalStructure.find((orig) => {
          return (orig.id && orig.id === storedValue) ||
                 (orig.value && orig.value === storedValue) ||
                 JSON.stringify(orig) === String(storedValue);
        });
        restored[fieldName] = originalObj || storedValue;
      }
    }
  });

  return restored;
};

