# Chatbot Input Component - Mention Feature

## Overview

This component implements a two-stage mention feature for the chatbot input, allowing users to select filters and their corresponding values with an "@" syntax.

## File Structure

```
chatbot-input/
├── index.js                    # Main component
├── index_old_backup.js        # Backup of previous implementation
├── chatbot.scss               # Styles
├── hooks/
│   └── useMentionState.js     # Custom hook for mention state management
├── utils/
│   ├── apiHelpers.js          # API call utilities
│   ├── domHelpers.js          # DOM manipulation utilities
│   └── mentionHelpers.js      # Mention formatting utilities
└── README.md                  # This file
```

## Feature Flow

### Stage 1: Filter Selection

1. User types "@" in the input field
2. Dropdown shows available filters from `filterOptions` prop
3. User selects a filter (e.g., "Brand")
4. "@Brand::" is displayed as a highlighted mention in the input
5. Dropdown immediately reopens for Stage 2

### Stage 2: Value Selection

1. API call is made to fetch values for the selected filter
2. Dropdown shows the available values
3. User can select single or multiple values (based on filter configuration)
4. Final mention is displayed as "@Brand::Value1,Value2,+N"
   - First 3 values shown directly
   - Additional values shown as "+N" badge
   - Hover over "+N" shows tooltip with hidden values

### Sending Message

When user sends the message, mentions are transformed:
- "@Brand::Value1,Value2,Value3" → "Brand: Value1, Value2, Value3"

## API Integration

### Fetch Filter Values

**Function:** `fetchFilterValues(filterConfig)`

**Payload Format:**
```javascript
{
  attributes: [
    {
      attribute_name: "l1_name",
      dimension: "product",
      filter_type: "cascaded"
    }
  ],
  filter_type: "cascaded",
  filters: [],
  is_urm_filter: true,
  screen_name: "Chatbot",
  application_code: 1
}
```

**Response Format:**
```javascript
{
  status: true,
  data: {
    l1_name: ["Value1", "Value2", "Value3"]
  },
  message: "Successful"
}
```

## Key Functions

### utils/apiHelpers.js

- `buildFilterOptionsPayload(filterConfig)` - Builds API payload
- `fetchFilterValues(filterConfig)` - Fetches values from API

### utils/domHelpers.js

- `getTextContent(editorRef)` - Get plain text from editor
- `getCursorPosition(editorRef)` - Get cursor position
- `createMentionSpan()` - Create mention element
- `createCountBadge()` - Create +N badge with tooltip
- `insertElementAtPosition()` - Insert element and position cursor
- `getAllMentions(editorRef)` - Get all mention elements
- `removeMentionByGroupId()` - Remove mentions by group ID
- `cleanupTooltips()` - Clean up tooltip elements

### utils/mentionHelpers.js

- `parseMentionText(mentionText)` - Parse mention to extract filter and values
- `formatMentionDisplay()` - Format mention for editor display
- `formatMentionForSending()` - Format mention for API payload
- `deduplicateOptions()` - Remove duplicate options
- `generateMentionGroupId()` - Generate unique group ID

### hooks/useMentionState.js

- `useMentionState()` - Custom hook managing all mention-related state
  - Dropdown visibility
  - Selection stage (filter/values)
  - Current selections
  - Loading states

## Component Props

```javascript
{
  filterOptions: Array,      // Available filters for Stage 1
  inputValue: string,         // Current input value
  setInputValue: Function,    // Update input value
  onSendIconClick: Function,  // Send message handler
  currentMode: string,        // Current chatbot mode
  // ... other props
}
```

## Filter Options Format

Each filter option should have:

```javascript
{
  label: "Brand",              // Display name
  value: "brand",              // Unique value
  attribute_name: "l1_name",   // API attribute name
  dimension: "product",        // API dimension
  isMulti: true,              // Allow multiple value selection
  // ... other properties
}
```

## Styling

All styles are in `chatbot.scss`:

- `.mention-highlight` - Mention spans styling
- `.mention-count-badge` - +N badge styling
- `.mention-tooltip` - Hover tooltip styling
- `.mention-select-wrapper` - Dropdown positioning

## Example Usage

```jsx
<ChatbotInput
  filterOptions={[
    {
      label: "Brand",
      value: "brand",
      attribute_name: "l1_name",
      dimension: "product",
      isMulti: true
    },
    // ... more filters
  ]}
  inputValue={inputValue}
  setInputValue={setInputValue}
  onSendIconClick={handleSend}
  currentMode="chat"
/>
```

## Development Notes

### Adding New Features

1. **New utility function**: Add to appropriate file in `utils/`
2. **New state**: Add to `useMentionState.js` hook
3. **New API**: Add to `apiHelpers.js`

### Testing Considerations

1. Test with various filter configurations
2. Test single-select vs multi-select
3. Test with long filter names and values
4. Test cursor positioning after mention insertion
5. Test tooltip positioning at screen edges

### Performance Optimizations

- API calls are cached during the selection process
- DOM operations are batched where possible
- Tooltips are cleaned up on unmount and state reset
- Debounce search input for filtering options

## Troubleshooting

### Dropdown not showing
- Check `filterOptions` prop is provided and non-empty
- Verify "@" detection logic in `detectMention()`

### API call failing
- Check `filterConfig` has required properties
- Verify API endpoint and payload format
- Check network tab for error details

### Cursor position issues
- Verify `setCursorPosition()` logic
- Check for conflicting event handlers
- Ensure proper range and selection API usage

### Styling issues
- Check z-index for dropdown and tooltip
- Verify positioning calculations
- Test in different screen sizes

## Future Enhancements

1. Cache API responses to avoid redundant calls
2. Add keyboard navigation for dropdown
3. Support for nested filters
4. Drag-and-drop reordering of selected values
5. Custom mention colors based on filter type
6. Mention editing (click to re-open dropdown)
7. Copy-paste support for mentions
8. Accessibility improvements (ARIA labels, screen reader support)

