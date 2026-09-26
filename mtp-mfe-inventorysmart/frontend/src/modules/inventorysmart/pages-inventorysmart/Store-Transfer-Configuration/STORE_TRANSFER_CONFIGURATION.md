# Store Transfer Configuration Module

## Overview
The Store Transfer Configuration module enables users to configure and manage store transfer settings through a dynamic, config-driven interface. It supports bulk updates via "Set All" functionality and inline grid editing.

---

## Architecture

### Component Structure
```
Store-Transfer-Configuration/
├── index.jsx                          # Main container component
├── components/
│   ├── StoreTransferConfigTable.jsx   # AG Grid table with inline editing
│   └── StoreTransferSetAll.jsx        # Set All modal panel
└── services/
    └── store-transfer-configuration-service.js  # Redux slice & API calls
```

### Data Flow Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                         index.jsx                                │
│  - Manages filters, table state, and save operations            │
└───────────┬─────────────────────────────────────┬───────────────┘
            │                                     │
            ▼                                     ▼
┌───────────────────────────┐      ┌──────────────────────────────┐
│ StoreTransferConfigTable  │      │   Filter System              │
│ - Displays grid           │      │   - Apply filters            │
│ - Inline editing          │      │   - Get table name           │
│ - Row selection           │      └──────────────────────────────┘
│ - Opens Set All panel     │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  StoreTransferSetAll      │
│  - Bulk update modal      │
│  - Strategy fields        │
│  - Threshold fields       │
└───────────────────────────┘
```

---

## Key Components

### 1. **index.jsx** (Main Container)

#### Purpose
Orchestrates the entire Store Transfer Configuration flow including filters, table display, and save operations.

#### Key State Variables
| Variable | Type | Purpose |
|----------|------|---------|
| `tableName` | string | Dynamic table name from API |
| `showTable` | boolean | Controls table visibility |
| `editedRows` | Map | Tracks inline grid edits |
| `refreshTrigger` | number | Triggers table refresh |
| `filterAppliedTrigger` | number | Triggers filter application |

#### Major Functions

**`applyFilters(filterElements, dependency, filterDates)`**
- Applies selected filters
- Calls `/store-transfer/list` API to get table name
- Shows table and triggers refresh

**`handleSave()`**
- Processes edited rows from inline grid editing
- Calls `/store-transfer/set-all` for each edited row
- Calls `/store-transfer/save` to persist changes
- Refreshes table on success

#### Flow
```
User applies filters
    ↓
applyFilters() → API: /store-transfer/list
    ↓
Get table name → Show table
    ↓
User edits rows inline OR uses Set All
    ↓
handleSave() → API: /store-transfer/set-all (per row)
    ↓
API: /store-transfer/save → Persist changes
    ↓
Refresh table
```

---

### 2. **StoreTransferConfigTable.jsx** (AG Grid Table)

#### Purpose
Displays the Store Transfer Configuration data in an editable AG Grid with server-side pagination.

#### Key State Variables
| Variable | Type | Purpose |
|----------|------|---------|
| `tableColumns` | array | AG Grid column definitions |
| `tableLoader` | boolean | Loading state |
| `selectedRows` | array | Currently selected rows |
| `showSetAllPanel` | boolean | Controls Set All modal |
| `setAllOptions` | object | Dropdown options for Set All |
| `editedRows` | Map | Tracks cell value changes |

#### Major Functions

**`storeTransferManualCallBack(manualbody, pageIndex, params)`**
- Server-side data fetching for AG Grid
- Calls `/store-transfer/creation` API
- Extracts dropdown options from first row
- Returns paginated data

**`onCellValueChanged(params)`**
- Captures inline cell edits
- Handles dropdown value extraction (single/multi-select)
- Stores changes in `editedRows` Map keyed by `product_code`

**`onSelectionChanged(params)`**
- Tracks row selections
- Updates `selectedRows` state

**`openSetAllPanel()`**
- Validates at least one row is selected
- Opens Set All modal

#### Flow
```
Grid loads → storeTransferManualCallBack()
    ↓
Fetch data from API
    ↓
Extract dropdown options from first row
    ↓
User edits cell → onCellValueChanged()
    ↓
Store changes in editedRows Map
    ↓
User clicks "Set All" → openSetAllPanel()
    ↓
Show Set All modal
```

---

### 3. **StoreTransferSetAll.jsx** (Set All Modal)

#### Purpose
Provides a bulk update interface for applying changes to multiple selected rows.

#### Key State Variables
| Variable | Type | Purpose |
|----------|------|---------|
| `formData` | object | Form field values |
| `isSubmitting` | boolean | Submission state |
| `strategyFields` | array | Strategy section fields |
| `thresholdFields` | array | Threshold section fields |

#### Major Functions

**`buildFieldsFromConfig(fieldsConfig, formFieldOptions)`**
- Builds form fields from tenant config
- Maps dropdown options dynamically
- Returns field definitions for Form component

**`handleChange(data)`**
- Merges new form data with existing state
- Prevents overwriting between Strategy and Threshold forms

**`handleSubmit()`**
- **Step 1**: Determine if "Select All" is checked
- **Step 2**: Build `row_update` or `excluded_rows` arrays
- **Step 3**: Map form data to API attributes using config
- **Step 4**: Build API payload
- **Step 5**: Call `/store-transfer/set-all` API
- **Step 6**: Handle response, refresh table, close modal

#### Flow
```
User opens Set All modal
    ↓
buildFieldsFromConfig() → Render Strategy & Threshold forms
    ↓
User fills form fields → handleChange()
    ↓
Merge form data (Strategy + Threshold)
    ↓
User clicks "Apply" → handleSubmit()
    ↓
Check "Select All" state
    ↓
Build row_update or excluded_rows
    ↓
Map formData to API attributes using config
    ↓
Call /store-transfer/set-all API
    ↓
Refresh table → Close modal
```

---

## Configuration-Driven Architecture

### Tenant Configuration Structure
The module uses a config-driven approach stored in `inventorysmart_configuration.drillDown.store_transfer_config`:

```json
{
  "strategyFields": [
    {
      "label": "Optimisation level",
      "accessor": "optimisation_level",
      "field_type": "dropdown",
      "isSearchable": true,
      "isMulti": false,
      "extra": {
        "attributeName": "optimisation_level",
        "dataType": "string"
      }
    }
  ],
  "thresholdFields": [
    {
      "label": "DC Inv threshold (Min)",
      "accessor": "dc_inventory_threshold",
      "field_type": "IntegerField",
      "value_type": "percentage",
      "no_negative_values": true,
      "extra": {
        "attributeName": "dc_inventory_threshold",
        "dataType": "number"
      }
    }
  ],
  "formFieldOptions": {
    "optimisation_level": "optimisation_level_options",
    "transfer_strategy": "transfer_strategy_options",
    "transfer_rule": "transfer_rule_options"
  }
}
```

### Why `extra` Key?
The `extra` key provides:
1. **Attribute Name Mapping**: Maps UI field names to API attribute names
   - Example: `transfer_rule` → `transfer_rule_id`
2. **Data Type Conversion**: Converts form values before API submission
   - Example: String `"50"` → Number `50`

---



## Key Features

### 1. **Inline Grid Editing**
- Users can edit cells directly in the AG Grid
- Changes are tracked in `editedRows` Map
- Dropdown values are extracted correctly (single/multi-select)
- Changes are sent to API on Save

### 2. **Set All Functionality**
- Bulk update multiple rows at once
- Supports "Select All" with exclusions
- Dynamic form fields from tenant config
- Merges Strategy and Threshold form data

### 3. **Select All Logic**
```javascript
if (isAllSelected) {
  // Send deselected rows as exclusions
  excluded_rows = [deselected product codes]
  row_update = []
} else {
  // Send only selected rows
  row_update = [selected product codes]
  excluded_rows = []
}
```

### 4. **Config-Driven Attribute Mapping**
```javascript
// Find field config
const fieldConfig = allFields.find(f => f.accessor === fieldName);

// Convert data type
if (fieldConfig.extra.dataType === "number") {
  attributeValue = Number(fieldValue);
}

// Use correct API attribute name
{
  attribute_name: fieldConfig.extra.attributeName || fieldName,
  attribute_value: attributeValue
}
```

---






## Developer Notes

### Adding New Fields
1. Update tenant config in database (`store_transfer_config`)
2. Add field definition with `extra` key for attribute mapping
3. No code changes required - fully config-driven!

### Debugging Tips
- Check Redux state: `inventorysmartReducer.inventorySmartCommonService.inventorysmartScreenConfig`
- Check `editedRows` Map in component state
- Verify `formData` merging in Set All modal



