# Generic Dimension Hierarchy Refactoring

## Overview
This document explains the refactoring of dimension hierarchy handling from hardcoded dimension types to a fully generic, dynamic system that automatically handles any dimension type from the API response.

## Problem Statement

### Before Refactoring
The code required manual updates for each new dimension type:

```javascript
// ❌ OLD APPROACH - Required code changes for each dimension
initialState: {
  productDimensionHierarchy: [],
  storeDimensionHierarchy: [],
  vendorDimensionHierarchy: [],
  // Need to add: vendorFacilityDimensionHierarchy: [] ❌
}

setFilterHierarchyOrder: (state, action) => {
  const productHierarchyList = action?.payload?.product;
  const storeHierarchyList = action?.payload?.store;
  const vendorHierarchyList = action?.payload?.vendor;
  // Need to add: const vendorFacilityHierarchyList = action?.payload?.vendor_facility; ❌
  
  if (productHierarchyList) { /* ... */ }
  if (storeHierarchyList) { /* ... */ }
  if (vendorHierarchyList) { /* ... */ }
  // Need to add: if (vendorFacilityHierarchyList) { /* ... */ } ❌
}
```

### Issues with Old Approach
1. ❌ Required code changes for every new dimension
2. ❌ Repetitive boilerplate code
3. ❌ Easy to miss updates in multiple files
4. ❌ Not scalable for dynamic dimension types
5. ❌ Maintenance nightmare

---

## Solution: Generic Dimension Handling

### After Refactoring
The new approach automatically handles any dimension from the API:

```javascript
// ✅ NEW APPROACH - Automatically handles any dimension
initialState: {
  dimensionHierarchies: {}, // Generic object for all dimensions
  // Legacy properties kept for backward compatibility
  productDimensionHierarchy: [],
  storeDimensionHierarchy: [],
  vendorDimensionHierarchy: [],
}

setFilterHierarchyOrder: (state, action) => {
  const dimensions = action.payload || {};
  
  // ✅ Automatically processes ALL dimensions
  Object.keys(dimensions).forEach((dimensionKey) => {
    const hierarchyList = dimensions[dimensionKey];
    
    if (hierarchyList && Array.isArray(hierarchyList)) {
      // Store in generic object
      state.dimensionHierarchies[dimensionKey] = hierarchyList;
      
      // Generate auto-populate
      const autoPopulateList = generateAutoPolulateList(hierarchyList);
      
      // Update selectionAutoPopulate
      if (!state.selectionAutoPopulate[dimensionKey]) {
        state.selectionAutoPopulate[dimensionKey] = {};
      }
      state.selectionAutoPopulate[dimensionKey] = {
        ...state.selectionAutoPopulate[dimensionKey],
        ...autoPopulateList,
      };
      
      // Legacy support
      const legacyPropertyName = `${dimensionKey}DimensionHierarchy`;
      if (state.hasOwnProperty(legacyPropertyName)) {
        state[legacyPropertyName] = hierarchyList;
      }
    }
  });
}
```

---

## API Response Format

The system now automatically handles any dimension structure from the API:

```json
{
  "name": "filters_hierarchy_order",
  "attribute_value": {
    "store": [
      "channel"
    ],
    "vendor": [
      "season_name",
      "vendor_name",
      "vendor_group",
      "relationship_type",
      "region"
    ],
    "product": [
      "l0_name",
      "l1_name",
      "l2_name",
      "l3_name",
      "l4_name"
    ],
    "vendor_facility": [
      "season_name",
      "region",
      "vendor_name",
      "country",
      "facility_name"
    ],
    "any_new_dimension": [
      "field1",
      "field2",
      "field3"
    ]
  }
}
```

**All dimensions are automatically processed without code changes!** ✅

---

## Files Modified

### 1. `user-role-management-service.js`

#### Changes:
- Added `dimensionHierarchies: {}` to initial state
- Refactored `setFilterHierarchyOrder` to use generic loop
- Maintained legacy properties for backward compatibility

#### Key Features:
```javascript
// ✅ Generic storage
state.dimensionHierarchies[dimensionKey] = hierarchyList;

// ✅ Dynamic auto-populate initialization
if (!state.selectionAutoPopulate[dimensionKey]) {
  state.selectionAutoPopulate[dimensionKey] = {};
}

// ✅ Legacy support (backward compatible)
const legacyPropertyName = `${dimensionKey}DimensionHierarchy`;
if (state.hasOwnProperty(legacyPropertyName)) {
  state[legacyPropertyName] = hierarchyList;
}
```

### 2. `filterGroup.jsx`

#### Changes:
- Refactored dimension lookup to be generic
- Added `dimensionHierarchies` to `mapStateToProps`
- Maintained legacy property fallback

#### Key Features:
```javascript
// ✅ Generic dimension detection
const dimension = key.dimension || key?.extra?.dimension;

if (dimension) {
  // Try generic first
  if (props.dimensionHierarchies && props.dimensionHierarchies[dimension]) {
    cascadedFilterLevel = props.dimensionHierarchies[dimension];
  } 
  // Fallback to legacy
  else {
    const legacyPropertyName = `${dimension}DimensionHierarchy`;
    if (props[legacyPropertyName]) {
      cascadedFilterLevel = props[legacyPropertyName];
    }
  }
}