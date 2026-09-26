# KPI Configurator Module

## Overview
The KPI Configurator module provides a tabbed interface for managing Custom KPIs and Calculated Fields. This module follows the Figma design specifications with a clean, professional interface.

## Components Structure

### Main Component: `index.jsx`
- **Location**: `/KPI-Configurator/index.jsx`
- **Purpose**: Main container with tabbed navigation
- **Features**:
  - Two tabs: "Custom KPIs" and "Calculated Fields"
  - Header with title and description
  - Uses `impact-ui-v3` Tabs component
  - Responsive layout using global styles

### Tab Components:

#### 1. Custom KPIs (`CustomKPIs.jsx`)
- **Location**: `/KPI-Configurator/components/CustomKPIs.jsx`
- **Purpose**: Manage custom KPI definitions
- **Features**:
  - DataGrid displaying all custom KPIs
  - Create New KPI button
  - Edit and Delete actions for each KPI
  - Server-side pagination
  - Loading states and error handling

#### 2. Calculated Fields (`CalculatedFields.jsx`)
- **Location**: `/KPI-Configurator/components/CalculatedFields.jsx`
- **Purpose**: Manage calculated field definitions
- **Features**:
  - DataGrid displaying all calculated fields
  - Create New Field button
  - Edit and Delete actions for each field
  - Server-side pagination
  - Loading states and error handling

## Backend API Endpoints Required

Based on the implementation, the following API endpoints are expected:

### Custom KPIs Endpoints:

```
GET /inventorysmart/kpi-configurator/custom-kpis
Query Parameters:
  - page: number (current page)
  - limit: number (items per page)
Response:
  {
    "success": true,
    "data": {
      "kpis": [
        {
          "id": "string",
          "name": "string",
          "description": "string",
          "formula": "string",
          "createdBy": "string",
          "createdAt": "string (ISO date)"
        }
      ],
      "totalCount": number
    }
  }

DELETE /inventorysmart/kpi-configurator/custom-kpis/:id
Response:
  {
    "success": true,
    "message": "Custom KPI deleted successfully"
  }
```

### Calculated Fields Endpoints:

```
GET /inventorysmart/kpi-configurator/calculated-fields
Query Parameters:
  - page: number (current page)
  - limit: number (items per page)
Response:
  {
    "success": true,
    "data": {
      "fields": [
        {
          "id": "string",
          "name": "string",
          "description": "string",
          "dataType": "string",
          "formula": "string",
          "createdBy": "string",
          "createdAt": "string (ISO date)"
        }
      ],
      "totalCount": number
    }
  }

DELETE /inventorysmart/kpi-configurator/calculated-fields/:id
Response:
  {
    "success": true,
    "message": "Calculated Field deleted successfully"
  }
```

## Technologies Used

- **React**: Component framework
- **Redux**: State management
- **Material-UI (@mui/material)**: UI components (Typography, Button)
- **impact-ui-v3**: Custom UI library (DataGrid, Tabs)
- **Axios**: HTTP client for API calls
- **Global Styles**: Centralized styling system

## UI/UX Features

1. **Responsive Design**: Uses flex layouts and global styles for consistent appearance
2. **Loading States**: LoadingOverlay component for async operations
3. **Error Handling**: Toast notifications for success/error messages
4. **Pagination**: Server-side pagination for better performance with large datasets
5. **Action Buttons**: Edit and Delete buttons for each row
6. **Clean Interface**: Following Material Design principles

## Next Steps / TODOs

1. **Create/Edit Modals or Screens**:
   - Implement the create/edit functionality for Custom KPIs
   - Implement the create/edit functionality for Calculated Fields
   - Consider using the existing `CreateKPI.jsx`, `FieldFunctionSelector.jsx`, and `FormulaCanvas.jsx` components

2. **Backend Integration**:
   - Ensure backend endpoints match the expected API structure
   - Refer to the PR: https://bitbucket.org/insideinsight/mtp-inventorysmart-generic-backend/pull-requests/6989/diff

3. **Validation**:
   - Add form validation for KPI/Field creation
   - Add validation for formulas

4. **Permissions**:
   - Add role-based access control for create/edit/delete actions

5. **Testing**:
   - Add unit tests for components
   - Add integration tests for API calls

## Design Reference

Figma Design: [KPI Configurator](https://www.figma.com/proto/Fu34B8CIsqBDQaBVFxOkw3/KPI-Configurator?page-id=37%3A392&node-id=263-6400&viewport=314%2C-1290%2C0.12&t=0OZ19k8fsvQLnz2C-8&scaling=scale-down&content-scaling=fixed&starting-point-node-id=263%3A6400&hide-ui=1)

## File Structure

```
KPI-Configurator/
├── index.jsx                      # Main component with tabs
├── components/
│   ├── CustomKPIs.jsx            # Custom KPIs tab component
│   ├── CalculatedFields.jsx       # Calculated Fields tab component
│   ├── CreateKPI.jsx             # Existing component for KPI creation
│   ├── FieldFunctionSelector.jsx # Existing component for field selection
│   └── FormulaCanvas.jsx          # Existing component for formula building
└── README.md                      # This file
```

## Notes

- The existing components (`CreateKPI.jsx`, `FieldFunctionSelector.jsx`, `FormulaCanvas.jsx`) can be integrated into the create/edit flows for both Custom KPIs and Calculated Fields.
- The DataGrid component from `impact-ui-v3` provides built-in sorting, filtering, and pagination capabilities.
- All API calls use the centralized `axiosInstance` with proper authentication headers.
- Error messages are displayed using the Redux-connected `addSnack` action.


