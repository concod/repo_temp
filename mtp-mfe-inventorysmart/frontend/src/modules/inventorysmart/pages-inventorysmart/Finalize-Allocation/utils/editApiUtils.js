import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

/**
 * Common utility functions for handling edit API calls in Finalize Allocation components
 */


/**
 * Extract individual DC allocation values from item data based on table type
 * @param {Object} item - The item data
 * @param {string} tableType - Type of table ('store' or 'product')
 * @param {Array} dynamicSetAllColumns - Dynamic columns configuration from UI
 * @param {Array} originalData - Original table data for comparison (optional)
 * @returns {Array} - Array of objects containing eaches, packs and dcCode values for each DC
 */
const extractIndividualDCAllocationValues = (item, tableType, dynamicSetAllColumns, originalData = null) => {
  const dcAllocations = [];
  
  // First, check for standard field names set by getAllocationUpdates (for set all operations)
  const standardFields = {
    store: {
      eachesField: 'store_level_eaches',
      packsField: 'store_level_packs'
    },
    product: {
      eachesField: 'product_level_eaches',
      packsField: 'product_level_packs'
    }
  };
  
  const { eachesField, packsField } = standardFields[tableType];
  
  // Check if standard fields exist and have values (set all operations)
  if (item[eachesField] !== undefined || item[packsField] !== undefined) {
    const result = { dcCode: null };
    
    // Only include fields that were actually set (not undefined)
    if (item[eachesField] !== undefined) {
      result.eaches = +(item[eachesField] || 0);
    }
    if (item[packsField] !== undefined) {
      result.packs = +(item[packsField] || 0);
    }
    
    // For set all operations, extract dcCode from any available dynamicSetAllColumns
    // Since set all applies to a specific DC, we can use the first available dc_code
    if (dynamicSetAllColumns && dynamicSetAllColumns.length > 0) {
      // Try to find a column that has a dc_code
      const columnWithDcCode = dynamicSetAllColumns.find(col => col.dc_code);
      if (columnWithDcCode) {
        result.dcCode = columnWithDcCode.dc_code;
      }
    }
    
    return [result];
  }
  
  // For row level edits: Extract individual DC values (don't sum them up)
  const dcGroups = {};
  
  // Find the original item for comparison if originalData is provided
  let originalItem = null;
  if (originalData && originalData.length > 0) {
    if (tableType === 'store') {
      originalItem = originalData.find(orig => orig.store_code === item.store_code);
    } else if (tableType === 'product') {
      originalItem = originalData.find(orig => orig.article === item.article);
    }
  }
  
  // Group columns by DC code
  dynamicSetAllColumns.forEach(col => {
    if (col.dc_code && (col.columnLabel && 
        (col.columnLabel.toLowerCase().includes('eaches') || col.columnLabel.toLowerCase().includes('packs')))) {
      
      const value = item[col.column_name];
      const originalValue = originalItem ? originalItem[col.column_name] : null;
      
      // Only process if the field has been actually modified by comparing with original value
      const isFieldModified = originalItem ? 
        (value !== originalValue && value !== null && value !== undefined && value !== '') :
        (value !== null && value !== undefined && value !== '' && value !== 0);
      
      if (isFieldModified) {
        if (!dcGroups[col.dc_code]) {
          dcGroups[col.dc_code] = { dcCode: col.dc_code, modifiedFields: {} };
        }
        
        if (col.columnLabel.toLowerCase().includes('eaches')) {
          dcGroups[col.dc_code].modifiedFields.eaches = +(value || 0);
        } else if (col.columnLabel.toLowerCase().includes('packs')) {
          dcGroups[col.dc_code].modifiedFields.packs = +(value || 0);
        }
      }
    }
  });
  
  // Convert dcGroups object to array with only modified fields
  return Object.values(dcGroups).map(dcGroup => ({
    ...dcGroup.modifiedFields,
    dcCode: dcGroup.dcCode
  }));
};

/**
 * Extract allocation values from item data based on table type (legacy function for backward compatibility)
 * @param {Object} item - The item data
 * @param {string} tableType - Type of table ('store' or 'product')
 * @param {Array} dynamicSetAllColumns - Dynamic columns configuration from UI
 * @returns {Object} - Object containing eaches, packs and dcCode values
 */
const extractAllocationValues = (item, tableType, dynamicSetAllColumns) => {
  const individualDCValues = extractIndividualDCAllocationValues(item, tableType, dynamicSetAllColumns);
  
  // For backward compatibility, return the first DC's values or sum them up
  if (individualDCValues.length === 1) {
    return individualDCValues[0];
  } else if (individualDCValues.length > 1) {
    // Sum up all DC values for backward compatibility
    const totalEaches = individualDCValues.reduce((sum, dc) => sum + dc.eaches, 0);
    const totalPacks = individualDCValues.reduce((sum, dc) => sum + dc.packs, 0);
    const dcCode = individualDCValues[0].dcCode; // Use first DC code
    return { eaches: totalEaches, packs: totalPacks, dcCode };
  }
  
  return { eaches: 0, packs: 0, dcCode: null };
};

/**
 * Build payload for saving row edits
 * @param {Object} params - Parameters for building the payload
 * @param {string} params.allocationCode - The allocation code
 * @param {string} params.sessionId - The session ID
 * @param {Array} params.updatedRowEdits - Array of updated row data
 * @param {string} params.tableType - Type of table ('store' or 'product')
 * @param {Array} params.dcConfig - DC configuration array from API response
 * @param {Array} params.dynamicSetAllColumns - Dynamic columns configuration from UI
 * @param {Array} params.originalData - Original table data for comparison (optional)
 * @returns {Object} - The API payload
 */
export const buildSaveRowEditsPayload = ({
  allocationCode,
  sessionId,
  updatedRowEdits,
  tableType,
  dcConfig = [],
  isPercentage = false,
  dc_code = '',
  dynamicSetAllColumns,
  originalData = null
}) => {
  const rowDetails = [];

  updatedRowEdits.forEach((item) => {
    // Extract individual DC allocation values (not summed up)
    const individualDCValues = extractIndividualDCAllocationValues(item, tableType, dynamicSetAllColumns, originalData);

    // Create separate row entries for each DC that has been modified
    individualDCValues.forEach((dcValue) => {
      const { dcCode, eaches, packs } = dcValue;
      const row = {};
      const allocation_updates = {};

      if (tableType === 'store') {
        // For store table - include store, dc_code
        row.store = item.store_code;
        row.dc_code = dc_code ? dc_code : dcCode;
        
        // Only include fields that were actually modified
        if (eaches !== undefined) {
          allocation_updates.store_level_eaches = eaches;
        }
        if (packs !== undefined) {
          allocation_updates.store_level_packs = packs;
        }
      } else if (tableType === 'product') {
        // For product table - include article, dc_code
        row.article = item.article;
        row.dc_code = dc_code ? dc_code : dcCode;
        
        // Only include fields that were actually modified
        if (eaches !== undefined) {
          allocation_updates.product_level_eaches = eaches;
        }
        if (packs !== undefined) {
          allocation_updates.product_level_packs = packs;
        }
      }

      // Only add to rowDetails if there are actual allocation updates
      if (Object.keys(allocation_updates).length > 0) {
        rowDetails.push({
          row,
          allocation_updates
        });
      }
    });
  });

  return {
    allocation_code: allocationCode,
    session_id: sessionId,
    is_set_all: false,
    included: [],
    excluded: [],
    row_updates: rowDetails,
    is_update_mode: true,
    is_percentage: isPercentage,
  };
};


/**
 * Handle API call for saving edits
 * @param {Object} params - Parameters for the API call
 * @param {Object} params.payload - The API payload
 * @param {Function} params.apiFunction - The API function to call
 * @param {Function} params.setLoader - Function to set loading state
 * @param {Function} params.displaySnackMessages - Function to display messages
 * @param {Function} params.onSuccess - Callback function on success
 * @param {Function} params.onError - Callback function on error
 * @returns {Promise} - The API response
 */
export const handleSaveEditsAPI = async ({
  payload,
  apiFunction,
  setLoader,
  displaySnackMessages,
  onSuccess,
  onError
}) => {
  try {
    setLoader(true);
    const response = await apiFunction(payload);
    
    if (response.data?.status) {
      const message = response.data?.message || "Updates saved successfully";
      displaySnackMessages(message, "success");
      
      if (onSuccess) {
        onSuccess(response);
      }
      
      return { success: true, data: response.data };
    } else {
      const errorMessage = response.data?.show_message ? response.data?.message : ERROR_MESSAGE;
      displaySnackMessages(errorMessage, "error");
      
      if (onError) {
        onError(response);
      }
      
      return { success: false, error: errorMessage };
    }
  } catch (e) {
    const errObj = e?.response?.data;
    const errorMessage = errObj?.show_message ? errObj?.message : ERROR_MESSAGE;
    displaySnackMessages(errorMessage, "error");
    
    if (onError) {
      onError(e);
    }
    
    return { success: false, error: errorMessage };
  } finally {
  }
};

/**
 * Get allocation updates based on data and table type
 * @param {Object} data - The data containing type and value
 * @param {Object} item - The item data
 * @param {string} tableType - Type of table ('store' or 'product')
 * @returns {Object} - The allocation updates object
 */
export const getAllocationUpdates = (data, item, tableType) => {  
  if (data && data.type && data.value !== undefined && data.value !== null) {
    // Only return the field that was actually edited (either eaches OR packs, not both)
    if (tableType === 'store') {
      if (data.type === "eaches") {
        return {
          store_level_eaches: data.value
        };
      } else if (data.type === "packs") {
        return {
          store_level_packs: data.value
        };
      }
    } else if (tableType === 'product') {
      if (data.type === "eaches") {
        return {
          product_level_eaches: data.value
        };
      } else if (data.type === "packs") {
        return {
          product_level_packs: data.value
        };
      }
    }
  } else {
    // Return existing values from item (fallback case)
    if (tableType === 'store') {
      return {
        store_level_eaches: item.store_level_eaches || 0,
        store_level_packs: item.store_level_packs || 0,
      };
    } else if (tableType === 'product') {
      return {
        product_level_eaches: item.product_level_eaches || 0,
        product_level_packs: item.product_level_packs || 0,
      };
    }
  }
  
  return {};
};
