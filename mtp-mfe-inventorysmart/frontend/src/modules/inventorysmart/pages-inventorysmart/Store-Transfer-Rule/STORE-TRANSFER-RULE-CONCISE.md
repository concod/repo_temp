# Store Transfer Rule Module - Comprehensive Documentation

## Module Architecture

### Component Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                          Store Transfer Rule Module                     │
│                                                                         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
┌───────────────▼───────────┐ ┌────▼────────────┐ ┌────▼────────────┐
│                           │ │                 │ │                 │
│     Rule List Screen      │ │ CreateRuleFlow  │ │ RuleDetailsModal│
│     (index.jsx)           │ │ (Container)     │ │                 │
│                           │ │                 │ │                 │
└───────────────────────────┘ └────┬────────────┘ └─────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
          ┌─────────▼─────────┐         ┌─────────▼─────────┐
          │                   │         │                   │
          │    AddNewRule     │────────▶│  RuleReviewScreen │
          │    (Step 1)       │         │    (Step 2)       │
          │                   │◀────────│                   │
          └───────────────────┘         └───────────────────┘
```


## Component Details

### CreateRuleFlow (Container)
- **Purpose:** Orchestrates the rule creation process and manages navigation between steps
- **Key State Variables:**
  - `currentStep` (Number): Tracks current step (1 or 2)
  - `formDataForReview` (Object): Stores form data for passing between steps
- **Key Props:**
  - `inventorysmartModulesPermission` (Object): User permissions from Redux
  - `inventorysmartScreenConfig` (Object): Screen configuration from Redux
- **Critical Functions:**
  - `fetchModulesAccess()`: Loads and sets user permissions for access control
  - `handleMoveToReview(formData)`: Transitions from Step 1 to Step 2, stores form data in Redux
  - `handleBackToForm()`: Returns from Step 2 to Step 1, sets `isFromReview` flag in Redux
  - `handleRuleCreated()`: Handles successful rule creation and navigation
  - `navigateToConfigWithStoreTransferTab()`: Redirects to configuration page with correct tab

### AddNewRule (Step 1)
- **Purpose:** Provides form interface for entering rule details with dynamic field validation
- **Key State Variables:**
  - `ruleName` (String): Name of the transfer rule
  - `transferType` (Object): Selected transfer type option
  - `fromChannel`, `toChannel` (Objects): Selected channel options
  - `storeGroup` (Array): Selected store groups
  - `linkageCluster` (Object): Selected linkage cluster
  - `isStoreGroupLoading`, `isChannelLoading`, `isLinkageClusterLoading` (Boolean): Loading states
  - `storeGroupOptions`, `channelOptions`, `linkageClusterOptions` (Arrays): Dropdown options
- **Dependent Dropdown Logic:**
  ```
  ┌─────────────────┐
  │ Transfer Type   │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐     ┌─────────────────┐
  │ From Channel    │────▶│   To Channel    │ (For CROSS CHANNEL PUSH)
  └────────┬────────┘     └────────┬────────┘
           │                       │
           └───────────┬───────────┘
                       │
                       ▼
  ┌─────────────────────────────────┐
  │         Store Group             │
  └────────────────┬────────────────┘
                   │
                   ▼
  ┌─────────────────────────────────┐
  │       Linkage Cluster           │
  └─────────────────────────────────┘
  ```
- **Critical Functions:**
  - `handleTransferTypeChange(option)`: Resets dependent fields based on transfer type
  - `fetchStoreGroupOptions()`: Loads store group options with filtering
  - `fetchChannelOptions(isFromChannel)`: Loads channel options for from/to dropdowns
  - `fetchLinkageClusterOptions()`: Loads linkage cluster options
  - `handleSubmitForm()`: Validates form data and formats it for submission
  - `populateFormFromRedux()`: Pre-fills form when returning from Step 2

### RuleReviewScreen (Step 2)
- **Purpose:** Displays rule details for review and provides a preview table of affected stores
- **Key State Variables:**
  - `isLoading` (Boolean): Loading state for API calls
  - `previewColumns` (Array): Column definitions for preview table
  - `detailsReady` (Boolean): Flag indicating if details are ready to display
  - `tempTableName` (String): Temporary table name for preview data
  - `selectedRows`, `deselectedRows` (Arrays): Track row selection in preview table
- **Critical Functions:**
  - `fetchPreviewData()`: Loads preview data from API
  - `handlePreviewTableDataFetch(body, pageIndex, params)`: Server-side data loading for AG Grid
  - `handlePreviewTableCellValueChanged(params)`: Validates edits in preview table
  - `handleSubmit()`: Creates rule via API after permission check
  - `canTakeActionOnModules(subModuleName, action)`: Checks user permissions
  - `getFormattedDetails()`: Formats rule details for display
  - `isSaveButtonDisabled()`: Controls save button state based on permissions

## Redux State Architecture

```
{
  inventorysmartReducer: {
    // Store Transfer Rule specific state
    storeTransferRuleService: {
      storeTransferRuleLoader: false,     // Loading state
      storeTransferRuleData: [],          // List of rules
      storeTransferRuleDetail: null,      // Selected rule details
      storeTransferRuleError: null,       // Error state
      crossChannelFilterConfigs: null,    // Filter configs for cross channel
      withinChannelFilterConfigs: null,   // Filter configs for within channel
      formState: null,                    // Current form state for persistence
      isFromReview: false,                // Flag for back navigation
    },
    
    // Common services state
    inventorySmartCommonService: {
      inventorysmartModulesPermission: {  // User permissions by module
        inventorysmart_configuration: {
          INVENTORY_STORE_TRANSFER_RULE: ["create", "read", "update", "delete"]
        }
      },
      inventorysmartScreenConfig: {       // Screen configuration
        roleBasedAccess: true,
        inventorysmart_page_count: 100
      }
    }
  }
}
```

## Key Workflows

### 1. Create New Rule Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │     │                 │
│  User fills     │────▶│  Form           │────▶│  Review screen  │────▶│  API creates    │
│  form fields    │     │  validation     │     │  displays data  │     │  rule           │
│                 │     │                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │                 │
                                               │  Redirect to    │
                                               │  config page    │
                                               │                 │
                                               └─────────────────┘
```

**Detailed Steps:**
1. User navigates to Create Rule Flow from Configuration tab
2. User fills out form in AddNewRule component (Step 1)
   - Transfer Type selection determines visible fields
   - Dependent dropdowns are populated based on selections
3. Form validation ensures all required fields are filled
4. On form submission, data is formatted and stored in Redux
5. User is shown RuleReviewScreen (Step 2)
6. Preview table loads with server-side data
7. User can edit values in the preview table (with validation)
8. On save, permissions are checked and API call is made
9. On success, user is redirected to Configuration page

### 2. Back Navigation Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │     │                 │
│  User clicks    │────▶│  Set isFromReview│────▶│  Return to     │────▶│  Pre-populate   │
│  Back button    │     │  flag in Redux  │     │  Step 1        │     │  form fields    │
│                 │     │                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Detailed Steps:**
1. User clicks "Back to basic details" in RuleReviewScreen
2. `handleBackToForm()` sets `isFromReview = true` in Redux
3. User is returned to AddNewRule component (Step 1)
4. `useEffect` in AddNewRule detects `isFromReview` flag
5. Form fields are pre-populated with data from Redux store
6. Dependent dropdowns are restored with previous selections
7. User can modify fields and resubmit to return to review

### 3. Permission-Based UI Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Load module    │────▶│  Check user     │────▶│  Enable/disable │
│  permissions    │     │  permissions    │     │  UI elements    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Detailed Steps:**
1. `fetchModulesAccess()` loads permissions on component mount
2. Permissions are stored in Redux under `inventorysmartModulesPermission`
3. `canTakeActionOnModules()` checks if user has specific permissions
4. UI elements are enabled/disabled based on permission checks
5. Save button in RuleReviewScreen is disabled if user lacks create permission

## Validation Rules

### AddNewRule Form Validation
- **Rule Name:**
  - Required for all transfer types
  - Must be non-empty string
- **Transfer Type:**
  - Required selection
- **For CROSS CHANNEL PUSH:**
  - From Channel: Required
  - To Channel: Required
  - Cannot be the same channel
- **For REBALANCING types:**
  - Store Group: At least one selection required
- **Linkage Cluster:**
  - Required for all transfer types

### RuleReviewScreen Table Validation
- **Quantity Fields:**
  - Must be non-negative numbers
  - Validated on cell value change
- **Priority Field:**
  - Must be positive integers
  - Validated on cell value change

## AG Grid Integration

The module uses AG Grid extensively for data display and editing:

- **Server-Side Row Model:** Uses server-side data loading with partial store type for efficient data handling
- **Cell Value Validation:** Implements validation for different column types (priority, quantity)
- **Row Selection:** Supports multiple row selection with select-all functionality
- **Custom Cell Renderers:** Uses custom cell renderers for specialized data display

## API Integration

The module interacts with several API endpoints:

- **List Rules:** `GET /inventory-smart/store-transfer/store-transfer-rules`
- **Create Rule:** `POST /inventory-smart/store-transfer/store-transfer-rules/save`
- **Preview Rule:** `POST /inventory-smart/store-transfer/store-transfer-rules/preview`
- **View Preview:** `POST /inventory-smart/store-transfer/store-transfer-rules/preview/view`
- **Rule Details:** `POST /inventory-smart/store-transfer/store-transfer-rules/info`
- **Delete Rules:** `DELETE /inventory-smart/store-transfer/store-transfer-rules`

## Transfer Type Options

The module supports three main transfer types:

1. **WITHIN CHANNEL REBALANCING**
   - Transfers inventory between stores within the same channel
   - Requires store group and linkage cluster selection

2. **CROSS CHANNEL REBALANCING**
   - Transfers inventory between stores across different channels
   - Requires store group and linkage cluster selection

3. **CROSS CHANNEL PUSH**
   - Pushes inventory from one channel to another
   - Requires from channel, to channel, store group, and linkage cluster selection
