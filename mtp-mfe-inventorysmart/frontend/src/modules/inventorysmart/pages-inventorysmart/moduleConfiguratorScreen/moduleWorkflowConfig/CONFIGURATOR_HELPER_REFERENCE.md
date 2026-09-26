# Configurator Helper Reference - Complete Guide

## Table of Contents
1. [Template Structure Overview](#template-structure-overview)
2. [Component Types](#component-types)
3. [Form Component - Field Types](#form-component---field-types)
4. [Field Properties Reference](#field-properties-reference)
5. [FormWrapper StaticProps](#formwrapper-staticprops)
6. [FunctionProps Actions](#functionprops-actions)
7. [Stored Procedure Integration](#stored-procedure-integration)
8. [Nested/Flat Data Handling](#nestedflat-data-handling)
9. [Array/Dropdown Handling](#arraydropdown-handling)
10. [Layout Configuration](#layout-configuration)
11. [Complete Examples](#complete-examples)

---

## Template Structure Overview

The configurator system uses a JSON template structure to dynamically render UI components. The template follows a hierarchical structure:

```javascript
{
  components: {
    id: "unique-component-id",
    type: "div" | "form" | "button" | "table",
    pathSrc: "core",
    staticProps: {
      // Component-specific static properties
    },
    functionProps: [
      // Optional: Dynamic function bindings
    ],
    componentPath: "path/to/component",
    children: [
      // Optional: Nested components
    ]
  }
}
```

### Key Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | âœ… | Unique identifier for the component |
| `type` | `string` | âœ… | Component type (must match COMPONENT_CONFIG) |
| `pathSrc` | `string` | âœ… | Source path, typically `"core"` |
| `staticProps` | `object` | âœ… | Static properties passed to component |
| `functionProps` | `array` | âŒ | Dynamic function bindings (onClick, onLoad, etc.) |
| `componentPath` | `string` | âœ… | Path to component file (relative to `dynamic/parser/`) |
| `children` | `array` | âŒ | Nested child components |

---

## Component Types

The system supports 4 main component types (defined in `COMPONENT_CONFIG`):

### 1. `div` - Wrapper Div
**Component Path:** `commonComponents/ui/wrapper-div/wrapper-div.jsx`

**Use Case:** Container/wrapper for grouping components

**StaticProps:**
```javascript
{
  style: {
    width: "100%",
    padding: "24px",
    display: "flex",
    gap: "10px",
    margin: "20px 0px"
  }
}
```

### 2. `form` - Form Wrapper
**Component Path:** `commonComponents/ui/form-wrapper/form-wrapper.jsx`

**Use Case:** Renders form fields dynamically

**StaticProps:** See [FormWrapper StaticProps](#formwrapper-staticprops)

### 3. `button` - Button Wrapper
**Component Path:** `commonComponents/ui/button-wrapper/button-wrapper.jsx`

**Use Case:** Renders buttons with action handlers

**StaticProps:**
```javascript
{
  id: "button-id",
  type: "button",
  color: "primary" | "secondary",
  content: "Button Text",
  variant: "contained" | "outlined" | "text",
  className: "button",
  style: {
    buttonStyle: {
      buttonBgColor: "#0055AF"
    },
    buttonWrapperStyle: {
      width: "100%"
    }
  }
}
```

### 4. `table` - Table Wrapper
**Component Path:** `commonComponents/ui/table-wrapper/table-wrapper.jsx`

**Use Case:** Renders data tables

**StaticProps:**
```javascript
{
  reducerKey: "table-reducer-key",
  columnKey: "columns-reducer-key",
  rowKey: "rows-reducer-key",
  isColumnDataFromApi: true,
  isRowDataFromApi: true
}
```

---

## Form Component - Field Types

The Form component supports **20 field types**. Each field type has specific properties and behaviors.

### Supported Field Types

| Field Type | Component | Use Case | Redux Storage |
|------------|-----------|----------|---------------|
| `Heading` | Typography | Section headers | N/A |
| `TextField` | Input | Text input | `string` |
| `IntegerField` | Input (number) | Integer input | `number` |
| `BooleanField` | Checkbox | Boolean toggle | `boolean` |
| `dropdown` | Select | Single/multi-select dropdown | `value` or `[value]` |
| `transparentDropdown` | Select (transparent) | Transparent dropdown | `value` or `[value]` |
| `list` | ReactSelect | Select list | `value` or `[value]` |
| `autocompleteDropdown` | CreatableSelect | Autocomplete with create | `value` or `[value]` |
| `ChipsInput` | ChipsInput | Tag input | `string` |
| `ChipsTagInput` | ChipsTagInput | Tag input (alternative) | `string` |
| `DateTimeField` | DatePicker | Date picker | `string` (formatted) |
| `DateAndTimeField` | DateTimePicker | Date & time picker | `string` (formatted) |
| `fiscalCalendar` | NormalCalendarFiscalMapping | Fiscal calendar | `string` or `object` |
| `radioGroup` | RadioButtonGroup | Radio buttons | `string` |
| `checkBoxGroup` | FormGroup | Checkbox group | `object` |
| `rangePicker` | RangePicker | Date range picker | `[moment, moment]` |
| `sliderRange` | Slider | Range slider | `{ value, range_min, range_max }` |
| `toggle` | Switch | Toggle switch | `boolean` |
| `CustomToggleField` | Switch | Custom toggle | `boolean` |
| `multiple_daterangepicker` | MultipleDateRangePicker | Multiple date ranges | `array` |
| `deleteRow` | Button (delete icon) | Delete action | `boolean` |
| `readOnly` | Typography | Read-only text | N/A |

---

## Field Properties Reference

### Common Field Properties

All fields share these common properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `field_name` | `string` | âœ… | Field identifier (used as Redux key) |
| `display_type` | `string` | âœ… | Field type (see above) |
| `label` | `string` | âœ… | Field label displayed to user |
| `sub_label` | `string` | âŒ | Sub-label text |
| `layout` | `string` | âŒ | `"horizontal"` or `"vertical"` (label position) |
| `is_deleted` | `boolean` | âŒ | Mark field as deleted |
| `is_disabled` | `boolean` | âŒ | Disable field |
| `is_required` | `boolean` | âŒ | Mark as required |
| `is_mandatory` | `boolean` | âŒ | Mark as mandatory (same as required) |
| `placeholder` | `string` | âŒ | Placeholder text |
| `default_value` | `any` | âŒ | Default value for field |
| `display_order` | `number` | âŒ | Order for field display |
| `max_length` | `number` | âŒ | Maximum input length |

### Field-Specific Properties

#### Heading
```javascript
{
  title: "Section Title",
  display_type: "Heading"
}
```

#### TextField
```javascript
{
  field_name: "my_text_field",
  display_type: "TextField",
  label: "Text Field Label",
  max_length: 255,
  value_type: "text" | "number" | "percentage" | "dollar",
  no_negative_values: true,  // Prevent negative numbers
  minValue: 0,  // Minimum value
  step_value: 1,  // Step increment
  error: false,  // Error state
  helperText: "",  // Error message
  error_type: "function" | "boolean"  // Error validation type
}
```

#### IntegerField
```javascript
{
  field_name: "my_integer_field",
  display_type: "IntegerField",
  label: "Integer Field Label",
  value_type: "number" | "percentage" | "dollar",
  no_negative_values: true,
  minValue: 0,
  step_value: 1,
  is_negative_value_allowed: false,
  max_validation: true,  // Enable max validation
  min_validation: true,  // Enable min validation
  error: false,
  helperText: ""
}
```

#### BooleanField
```javascript
{
  field_name: "my_boolean_field",
  display_type: "BooleanField",
  label: "Checkbox Label"
}
```

#### Dropdown (dropdown, transparentDropdown, list)
```javascript
{
  field_name: "my_dropdown",
  display_type: "dropdown",  // or "transparentDropdown" or "list"
  label: "Dropdown Label",
  initialData: [
    {
      id: "option1",
      label: "Option 1",
      value: "option1"
    },
    {
      id: "option2",
      label: "Option 2",
      value: "option2"
    }
  ],
  is_multiple_selection: false,  // Single or multi-select
  is_clearable: true,  // Show clear button
  isSearchable: true,  // Enable search
  isSelectAllButtonHidden: false,  // Hide select all button
  pagination: false,  // Enable pagination for large lists
  fetchOptions: null,  // Function to fetch options dynamically
  dependency: [],  // Dependent fields
  labelOrientation: "top" | "left",  // Label position
  originalArrayStructure: []  // Original array structure (for SP-generated fields)
}
```

**Important:** For dropdowns, `initialData` must be an array of objects with `{ id, label, value }` structure. The SP automatically formats arrays to this structure.

#### AutocompleteDropdown
```javascript
{
  field_name: "my_autocomplete",
  display_type: "autocompleteDropdown",
  label: "Autocomplete Label",
  initialData: [
    { id: "opt1", label: "Option 1", value: "opt1" }
  ],
  is_multiple_selection: false,
  is_clearable: true,
  isSearchable: true
}
```

#### DateTimeField
```javascript
{
  field_name: "my_date_field",
  display_type: "DateTimeField",
  label: "Date Label",
  disableFuture: false,  // Disable future dates
  disablePast: false,  // Disable past dates
  disableOnlyPast: false,  // Disable only past dates
  minDate: null,  // Minimum selectable date
  maxDate: null,  // Maximum selectable date
  shouldDisableDate: null  // Function to disable specific dates
}
```

#### DateAndTimeField
```javascript
{
  field_name: "my_datetime_field",
  display_type: "DateAndTimeField",
  label: "Date & Time Label",
  extra: {
    dateFormat: "MM/DD/YYYY HH:mm"  // Custom date format
  }
}
```

#### FiscalCalendar
```javascript
{
  field_name: "my_fiscal_calendar",
  display_type: "fiscalCalendar",
  label: "Fiscal Calendar Label",
  options: [],  // Fiscal calendar data
  disablePastWeeks: false,
  disableFutureWeeks: false,
  displayRow: 1,
  setValueOnBlur: false,
  maxOneWeekSelection: false,
  isOutsideRange: null,  // Function to check if date is outside range
  showClearDates: true,
  showDefaultLabel: true
}
```

#### RadioGroup
```javascript
{
  field_name: "my_radio_group",
  display_type: "radioGroup",
  label: "Radio Group Label",
  options: [
    { label: "Option 1", value: "opt1" },
    { label: "Option 2", value: "opt2" }
  ],
  is_disabled: false
}
```

#### CheckBoxGroup
```javascript
{
  field_name: "my_checkbox_group",
  display_type: "checkBoxGroup",
  label: "Checkbox Group Label",
  options: [
    { label: "Option 1", value: "opt1", isDisabled: false },
    { label: "Option 2", value: "opt2", isDisabled: false }
  ]
}
```

**Note:** Redux stores checkbox group values as an object: `{ opt1: true, opt2: false }`

#### RangePicker
```javascript
{
  field_name: "my_date_range",
  display_type: "rangePicker",
  label: "Date Range Label",
  startDateId: "start_date_id",
  endDateId: "end_date_id",
  disableType: "disablePast" | "disableFuture",
  startYear: null,  // Custom start year
  enabledStartDays: [],  // Specific days enabled
  enabledEndDays: [],
  extra: {
    customYears: []  // Custom year range
  }
}
```

**Note:** Redux stores range picker as `[moment, moment]` array.

#### SliderRange
```javascript
{
  field_name: "my_slider",
  display_type: "sliderRange",
  label: "Slider Label",
  header: "Slider Header",
  variant: "default",
  headerOrientation: "top" | "left",
  inputPosition: "left" | "right"
}
```

**Note:** Redux stores slider as `{ value: number, range_min: number, range_max: number }`. You must initialize `defaultValues` with this structure.

#### Toggle
```javascript
{
  field_name: "my_toggle",
  display_type: "toggle",
  label: "Toggle Label",
  options: [
    { label: "Off", value: "off" },
    { label: "On", value: "on" }
  ]
}
```

#### CustomToggleField
```javascript
{
  field_name: "my_custom_toggle",
  display_type: "CustomToggleField"
}
```

#### ChipsInput / ChipsTagInput
```javascript
{
  field_name: "my_chips",
  display_type: "ChipsInput",  // or "ChipsTagInput"
  label: "Tags Label"
}
```

#### MultipleDateRangePicker
```javascript
{
  field_name: "my_multiple_ranges",
  display_type: "multiple_daterangepicker"
}
```

#### DeleteRow
```javascript
{
  field_name: "delete_row",
  display_type: "deleteRow",
  disabled: false
}
```

#### ReadOnly
```javascript
{
  field_name: "readonly_field",
  display_type: "readOnly",
  label: "Read Only Label"
}
```

---

## FormWrapper StaticProps

The `form` component's `staticProps` control form behavior and layout:

```javascript
{
  fields: [],  // Array of field definitions (see Field Properties)
  layout: "vertical" | "horizontal" | "clusterGraph",  // Form layout
  reducerKey: "form-reducer-key",  // Redux key for form data
  resetOptions: false,  // Reset dropdown options
  defaultValues: {},  // Initial form values (flat structure)
  originalNestedStructure: {},  // Original nested structure (for convertToNested)
  disabledFields: false,  // Disable all fields
  maxFieldsInRow: 1,  // Number of fields per row (for horizontal layout)
  dependencyChange: false,  // Enable dependency changes
  selectDependency: [],  // Dependent field configurations
  updateDefaultValue: false  // Update default values on change
}
```

### Property Details

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `fields` | `array` | `[]` | Array of field definitions |
| `layout` | `string` | `"vertical"` | Layout mode (see Layout Configuration) |
| `reducerKey` | `string` | Required | Redux key where form data is stored |
| `resetOptions` | `boolean` | `false` | Reset dropdown options on change |
| `defaultValues` | `object` | `{}` | Initial form values (must be flat: `key1__key2`) |
| `originalNestedStructure` | `object` | `null` | Original nested structure (for `convertToNested`) |
| `disabledFields` | `boolean` | `false` | Disable all fields |
| `maxFieldsInRow` | `number` | `1` | Fields per row (for horizontal layout) |
| `dependencyChange` | `boolean` | `false` | Enable field dependencies |
| `selectDependency` | `array` | `[]` | Dependency configurations |
| `updateDefaultValue` | `boolean` | `false` | Update defaults on change |

### Layout Modes

#### `"vertical"` (Default)
- Fields stack vertically
- Each field takes full width
- `maxFieldsInRow` is ignored

#### `"horizontal"`
- Fields display in rows
- `maxFieldsInRow` controls fields per row
- Formula: `xs = 12 / maxFieldsInRow`
  - `maxFieldsInRow = 1` â†’ 1 field per row (full width)
  - `maxFieldsInRow = 2` â†’ 2 fields per row (50% each)
  - `maxFieldsInRow = 3` â†’ 3 fields per row (33% each)
  - `maxFieldsInRow = 4` â†’ 4 fields per row (25% each)

#### `"clusterGraph"`
- Special layout for cluster graphs
- Uses `fieldTypeWidthSpan` for field width
- `lastElement` takes full width

---

## FunctionProps Actions

See [FUNCTION_PROPS_ACTIONS_ANALYSIS.md](./FUNCTION_PROPS_ACTIONS_ANALYSIS.md) for complete details.

### Quick Reference

**Supported Action Types:**
1. `api_function` - HTTP API calls
2. `reducer_function` - Redux state updates
3. `redirect` - Route navigation

**Function Names:**
- `onClick` - Execute on click
- `onLoad` - Execute immediately on component mount
- `onChange` - Execute on value change
- `onSubmit` - Execute on form submission

**Example:**
```javascript
functionProps: [
  {
    functionName: "onClick",
    actions: [
      {
        type: "api_function",
        apiUrl: "/core/endpoint",
        apiMethod: "POST",
        params: [
          {
            source: "reducer",
            dataType: "object",
            paramName: "data",
            reducerKey: "form-key",
            reducerName: "configuratorReducer",
            convertToNested: true  // Convert flat to nested
          }
        ],
        headers: {
          "application-code": "1"
        },
        apiResponseAlerts: {
          success: "Success message",
          error: "Error message"
        },
        responseFormatter: [
          {
            reducerName: "configuratorReducer",
            reducerKey: "responseData",
            apiKey: "data"  // Extract from response.data
          }
        ],
        onComplete: {
          actions: [
            {
              type: "redirect",
              link: "/success-page"
            }
          ]
        }
      }
    ]
  }
]
```

---

## Stored Procedure Integration

The SP `global.generate_frontend_template_for_module(module_code)` automatically generates templates from `tenant_attribute_master.attribute_value` (JSONB).

### SP Process

1. **Fetches Data:**
   - Module details from `module_master` and `screen_master`
   - `attribute_value` (JSONB) from `tenant_attribute_master`

2. **Generates Fields:**
   - Calls `global.process_nested_json_for_fields()` recursively
   - Detects data types:
     - `array` â†’ `dropdown` with formatted `initialData`
     - `boolean` â†’ `BooleanField`
     - `object` â†’ Recursively processes (adds Heading)
     - Default â†’ `TextField`

3. **Flattens DefaultValues:**
   - Calls `global.flatten_nested_jsonb()` to flatten nested structure
   - Uses `__` (double underscore) separator: `key1__key2__key3`

4. **Builds Template:**
   - Creates form component with generated fields
   - Sets `defaultValues` to flattened structure
   - Sets `originalNestedStructure` to original nested JSONB
   - Adds submit button with `convertToNested: true` in params

### SP-Generated Field Structure

```javascript
{
  label: "Formatted Label",  // INITCAP(REPLACE(key, '_', ' '))
  layout: "horizontal",
  sub_label: "",
  field_name: "key1__key2__key3",  // Flattened with __ separator
  is_deleted: false,
  max_length: "255" | null,
  initialData: [],  // For dropdowns: [{ id, label, value }]
  originalArrayStructure: [],  // Original array (for arrays)
  is_disabled: false,
  is_required: false,
  placeholder: "",
  display_type: "TextField" | "BooleanField" | "dropdown",
  is_clearable: true,
  is_mandatory: false,
  default_value: null,
  display_order: null,
  is_multiple_selection: false
}
```

### SP Template Structure

```javascript
{
  components: {
    id: "general-configuration-form",
    type: "div",
    pathSrc: "core",
    staticProps: {
      style: {
        padding: "24px 23px"
      }
    },
    componentPath: "commonComponents/ui/wrapper-div/wrapper-div.jsx",
    children: [
      {
        id: "general-configuration-module-settings",
        type: "form",
        pathSrc: "core",
        staticProps: {
          fields: [...],  // SP-generated fields
          layout: "vertical",
          reducerKey: "general-configuration-form",
          defaultValues: {},  // Flattened
          originalNestedStructure: {},  // Original nested
          maxFieldsInRow: 1
        },
        componentPath: "commonComponents/ui/form-wrapper/form-wrapper.jsx"
      },
      {
        id: "button-container",
        type: "div",
        children: [
          {
            id: "submit-button",
            type: "button",
            functionProps: [
              {
                functionName: "onClick",
                actions: [
                  {
                    type: "api_function",
                    apiUrl: "/core/tenant-config/module-config-update",
                    params: [
                      {
                        source: "reducer",
                        dataType: "object",
                        paramName: "attribute_value",
                        reducerKey: "general-configuration-form",
                        reducerName: "configuratorReducer",
                        convertToNested: true  // Converts flat to nested
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## Nested/Flat Data Handling

### The Problem

- **Redux stores data flat:** `{ key1__key2: "value" }`
- **APIs may expect nested:** `{ key1: { key2: "value" } }`
- **SP generates flat field names:** `key1__key2`
- **SP stores original nested structure:** `{ key1: { key2: "value" } }`

### The Solution

1. **SP Flattens `defaultValues`:**
   ```javascript
   defaultValues: {
     "key1__key2": "value"  // Flat
   }
   ```

2. **SP Stores Original Structure:**
   ```javascript
   originalNestedStructure: {
     key1: {
       key2: "value"  // Any TAM
     }
   }
   ```

3. **Frontend Converts on Submit:**
   ```javascript
   params: [
     {
       source: "reducer",
       dataType: "object",
       paramName: "attribute_value",
       convertToNested: true  // Triggers conversion
     }
   ]
   ```

4. **Conversion Process:**
   - `restoreArrayStructures()` - Restores array structures from `originalArrayStructure`
   - `flattenToNested()` - Converts flat keys (`key1__key2`) to nested (`key1.key2`)

### Separator

- **Separator:** `__` (double underscore)
- **Purpose:** Avoid conflicts with single underscores in field names
- **Example:** `key1_key2` stays flat, `key1__key2` becomes nested

### Key Functions

**`flattenToNested(flatData, originalStructure)`**
- Converts `{ key1__key2: "value" }` â†’ `{ key1: { key2: "value" } }`
- Uses `originalStructure` for validation
- Skips conversion if conflicting keys detected

**`restoreArrayStructures(flatData, fields)`**
- Restores array values from Redux (primitives) to original structure (objects)
- Uses `originalArrayStructure` metadata from fields

---

## Array/Dropdown Handling

### The Problem

- Arrays in `attribute_value` can be:
  - Array of primitives: `["opt1", "opt2"]`
  - Array of objects: `[{ id: 1, name: "Option 1" }]`
- Dropdowns need: `[{ id, label, value }]`
- Redux stores only `value` (primitive)
- On submit, need original array structure

### The Solution

1. **SP Formats Arrays:**
   ```sql
   -- Converts array to dropdown initialData
   initialData := jsonb_agg(
     jsonb_build_object(
       'id', elem::text,
       'label', elem::text,
       'value', elem::text
     )
   )
   ```

2. **SP Stores Original:**
   ```sql
   originalArrayStructure := v_value  -- Original array
   ```

3. **Frontend Restores:**
   - `restoreArrayStructures()` uses `originalArrayStructure` to restore arrays
   - Maps Redux values back to original objects/primitives

### Dropdown Redux State

**Single Select:**
```javascript
// Redux stores
{ field_name: "option1" }  // Just the value
```

**Multi-Select:**
```javascript
// Redux stores
{ field_name: ["option1", "option2"] }  // Array of values
```

**On Submit:**
- `restoreArrayStructures()` converts back to original structure
- `flattenToNested()` converts to nested if needed

---

## Layout Configuration

### Form Layout Options

#### Vertical Layout (Default)
```javascript
{
  layout: "vertical",
  maxFieldsInRow: 1  // Ignored in vertical mode
}
```
- Fields stack vertically
- Each field takes full width
- Best for: Forms with few fields, mobile views

#### Horizontal Layout
```javascript
{
  layout: "horizontal",
  maxFieldsInRow: 2  // 2 fields per row
}
```
- Fields display in rows
- `maxFieldsInRow` controls fields per row
- Better space utilization
- Best for: Forms with many fields, desktop views

#### Cluster Graph Layout
```javascript
{
  layout: "clusterGraph",
  maxFieldsInRow: 3,
  fieldTypeWidthSpan: 8,
  lastElement: "last_field_name"
}
```
- Special layout for cluster graphs
- `lastElement` takes full width

### Field Layout

Each field can have:
```javascript
{
  layout: "horizontal" | "vertical"  // Label position
}
```

---

## Complete Examples

### Example 1: Simple Form with Text Fields

```javascript
{
  components: {
    id: "simple-form",
    type: "div",
    pathSrc: "core",
    children: [
      {
        id: "form-container",
        type: "form",
        pathSrc: "core",
        staticProps: {
          fields: [
            {
              title: "User Information",
              display_type: "Heading"
            },
            {
              field_name: "first_name",
              display_type: "TextField",
              label: "First Name",
              max_length: 255,
              is_required: true
            },
            {
              field_name: "last_name",
              display_type: "TextField",
              label: "Last Name",
              max_length: 255,
              is_required: true
            },
            {
              field_name: "email",
              display_type: "TextField",
              label: "Email",
              max_length: 255,
              is_required: true
            }
          ],
          layout: "horizontal",
          maxFieldsInRow: 2,
          reducerKey: "user-form",
          defaultValues: {
            first_name: "",
            last_name: "",
            email: ""
          }
        },
        componentPath: "commonComponents/ui/form-wrapper/form-wrapper.jsx"
      }
    ],
    componentPath: "commonComponents/ui/wrapper-div/wrapper-div.jsx"
  }
}
```

### Example 2: Form with Nested Data (SP-Generated)

```javascript
// SP generates this from:
// attribute_value = { user: { name: "John", age: 30 }, active: true }

{
  components: {
    id: "general-configuration-form",
    type: "div",
    children: [
      {
        id: "form-container",
        type: "form",
        staticProps: {
          fields: [
            {
              title: "Screen Name",
              display_type: "Heading"
            },
            {
              field_name: "user__name",
              display_type: "TextField",
              label: "User - Name",
              default_value: "John"
            },
            {
              field_name: "user__age",
              display_type: "IntegerField",
              label: "User - Age",
              default_value: 30
            },
            {
              field_name: "active",
              display_type: "BooleanField",
              label: "Active",
              default_value: true
            }
          ],
          defaultValues: {
            "user__name": "John",  // Flattened
            "user__age": 30,
            "active": true
          },
          originalNestedStructure: {
            user: {
              name: "John",  // Original nested
              age: 30
            },
            active: true
          },
          reducerKey: "general-configuration-form"
        }
      },
      {
        id: "submit-button",
        type: "button",
        functionProps: [
          {
            functionName: "onClick",
            actions: [
              {
                type: "api_function",
                apiUrl: "/core/save",
                apiMethod: "POST",
                params: [
                  {
                    source: "reducer",
                    dataType: "object",
                    paramName: "data",
                    reducerKey: "general-configuration-form",
                    reducerName: "configuratorReducer",
                    convertToNested: true  // Converts to nested
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Example 3: Form with Dropdowns

```javascript
{
  components: {
    id: "form-with-dropdowns",
    type: "div",
    children: [
      {
        id: "form-container",
        type: "form",
        staticProps: {
          fields: [
            {
              field_name: "country",
              display_type: "dropdown",
              label: "Country",
              initialData: [
                { id: "us", label: "United States", value: "us" },
                { id: "uk", label: "United Kingdom", value: "uk" }
              ],
              is_multiple_selection: false,
              is_clearable: true,
              isSearchable: true
            },
            {
              field_name: "tags",
              display_type: "dropdown",
              label: "Tags",
              initialData: [
                { id: "tag1", label: "Tag 1", value: "tag1" },
                { id: "tag2", label: "Tag 2", value: "tag2" }
              ],
              is_multiple_selection: true,
              originalArrayStructure: ["tag1", "tag2"]  // Original structure
            }
          ],
          reducerKey: "form-data",
          defaultValues: {
            country: "us",
            tags: ["tag1"]
          }
        }
      }
    ]
  }
}
```

### Example 4: Form with Date Fields

```javascript
{
  components: {
    id: "form-with-dates",
    type: "div",
    children: [
      {
        id: "form-container",
        type: "form",
        staticProps: {
          fields: [
            {
              field_name: "start_date",
              display_type: "DateTimeField",
              label: "Start Date",
              disablePast: true,
              minDate: moment().format("YYYY-MM-DD")
            },
            {
              field_name: "date_range",
              display_type: "rangePicker",
              label: "Date Range",
              startDateId: "start_date_id",
              endDateId: "end_date_id"
            }
          ],
          reducerKey: "date-form",
          defaultValues: {
            start_date: null,
            date_range: [null, null]
          }
        }
      }
    ]
  }
}
```

### Example 5: Form with onLoad API Call

```javascript
{
  components: {
    id: "form-with-onload",
    type: "form",
    staticProps: {
      fields: [],
      reducerKey: "dynamic-form"
    },
    functionProps: [
      {
        functionName: "onLoad",
        actions: [
          {
            type: "api_function",
            apiUrl: "/core/get-form-data",
            apiMethod: "GET",
            params: [],
            responseFormatter: [
              {
                reducerName: "configuratorReducer",
                reducerKey: "dynamic-form",
                apiKey: "formData"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## Best Practices

### 1. Field Naming
- Use descriptive `field_name` values
- For nested data, SP automatically creates `key1__key2` format
- Avoid single underscores in field names if using nested structures

### 2. Layout Selection
- Use `horizontal` layout with `maxFieldsInRow: 2` or `3` for better space utilization
- Use `vertical` layout for mobile-first designs

### 3. Default Values
- Always provide `defaultValues` matching field names
- For SP-generated forms, use flattened structure
- For nested data, ensure `originalNestedStructure` is set

### 4. Dropdowns
- Always format `initialData` as `[{ id, label, value }]`
- Store `originalArrayStructure` for array restoration
- Use `is_multiple_selection: true` for multi-select

### 5. API Integration
- Use `convertToNested: true` when API expects nested structure
- Use `restoreArrayStructures()` before `flattenToNested()`
- Store `originalNestedStructure` in template for accurate conversion

### 6. Error Handling
- Set `error` and `helperText` for validation
- Use `error_type: "function"` for dynamic validation
- Validate on blur for better UX

### 7. Dependencies
- Use `selectDependency` for dependent fields
- Set `dependencyChange: true` to enable dependencies
- Update dependent fields in `updateDependency` callback

---

## Troubleshooting

### Fields Not Showing
- Check `field_name` matches `defaultValues` keys
- Ensure `display_type` is valid
- Verify `fields` array is not empty

### Values Not Saving
- Check `reducerKey` matches Redux key
- Verify `handleChange` is called
- Check Redux reducer is properly configured

### Nested Data Not Converting
- Ensure `convertToNested: true` in params
- Verify `originalNestedStructure` is set
- Check separator is `__` (double underscore)

### Dropdown Values Lost
- Ensure `originalArrayStructure` is stored
- Verify `restoreArrayStructures()` is called
- Check `initialData` format is correct

### Layout Issues
- Use `horizontal` layout for multi-column
- Set `maxFieldsInRow` appropriately
- Check container width constraints

## Code References

- **Form Component:** `frontend/src/core/Utils/form/index.jsx`
- **FormWrapper:** `frontend/src/core/dynamic/parser/commonComponents/ui/form-wrapper/form-wrapper.jsx`
- **JsonRenderer:** `frontend/src/core/Utils/json-renderer/json-renderer.jsx`
- **JsonRenderer Helper:** `frontend/src/core/Utils/json-renderer/json-renderer-helper.js`
- **Object Converter:** `frontend/src/core/Utils/objectToFieldsConverter.js`
- **Component Config:** `frontend/src/core/Utils/components-config/component-config.js`

---

*Last Updated: Based on latest implementation with SP integration, nested/flat conversion, and array handling.*
