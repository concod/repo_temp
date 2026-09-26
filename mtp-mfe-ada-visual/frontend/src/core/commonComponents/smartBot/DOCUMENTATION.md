# SmartBot Component Documentation

## Table of Contents

1. [Main Component](#main-component)
   - [SmartBot (index.jsx)](#smartbot-indexjsx)
2. [Hooks](#hooks)
   - [useChatState](#usechatstate)
   - [useChatFlow](#usechatflow)
   - [useChatSession](#usechatsession)
   - [useAgentFlow](#useagentflow)
   - [useBotConfiguration](#usebotconfiguration)
   - [useDragAndDrop](#usedraganddrop)
   - [useConversationManagement](#useconversationmanagement)
3. [Components](#components)
   - [ChatPlaceholder](#chatplaceholder)
   - [ChatLayout](#chatlayout)
   - [ModuleSelection](#moduleselection)
   - [MessageTemplate](#messagetemplate)
   - [BotMessage](#botmessage)
   - [StreamedContent](#streamedcontent)
   - [AxiosEventSource](#axioseventsource)
   - [ThinkingIndicator](#thinkingindicator)
   - [ThinkinHeaderInfo](#thinkinheaderinfo)
   - [StepsResponseTab](#stepsresponsetab)
   - [Steps (streamed-content)](#steps-streamed-content)
   - [AgentResponse (streamed-content)](#agentresponse-streamed-content)
   - [CombinedContent](#combinedcontent)
   - [Message Content Components](#message-content-components)
     - [TextContent](#textcontent)
     - [ChipsContent](#chipscontent)
     - [SelectableChips](#selectablechips)
     - [QuestionsContent](#questionscontent)
     - [TableContent](#tablecontent)
     - [GraphContent](#graphcontent)
     - [SliderContent](#slidercontent)
     - [SelectContent](#selectcontent)
     - [DatePickerContent](#datepickercontent)
     - [CheckboxContent](#checkboxcontent)
     - [RadioContent](#radiocontent)
     - [InputContent](#inputcontent)
     - [ButtonContent](#buttoncontent)
     - [TabularContent](#tabularcontent)
   - [ChatbotInput](#chatbotinput)
   - [FilterValueInput](#filtervalueinput)
   - [MemoryModal](#memorymodal)
   - [UploadModal](#uploadmodal)
   - [SavedChat](#savedchat)
   - [SelectedModule](#selectedmodule)
   - [RedirectLink](#redirectlink)
   - [TextRenderer](#textrenderer)
   - [LoadingOverlay](#loadingoverlay)
   - [ChatFooter](#chatfooter)
   - [ChatInput](#chatinput)
4. [Services](#services)
   - [chatbot-services.js](#chatbot-servicesjs)
   - [conversation-service.js](#conversation-servicejs)
5. [Utilities](#utilities)
   - [utlis.js](#utlisjs)
   - [constants.js](#constantsjs)
   - [styling.jsx](#stylingjsx)
6. [Unused/Deprecated Files](#unuseddeprecated-files)

---

## Main Component

### SmartBot (index.jsx)

**Location:** `frontend/src/core/commonComponents/smartBot/index.jsx`

**Purpose:** Main entry point for the SmartBot chatbot component. Orchestrates all hooks, components, and manages the overall chatbot state.

**Props:**
- `userName` (string): Current user's name
- `partialClose` (boolean): Controls partial close state
- `setPartialClose` (function): Setter for partial close state
- `invokeBot` (boolean): Flag to invoke/open bot
- `closeBot` (function): Callback to close the bot

**Key State Management:**
- Uses `useChatState` hook for all state variables (100+ state variables)
- Manages conversation data via `chatDataRef` and `chatDataInfoRef`
- Handles mode switching (agent/navigation/insights)
- Manages modal visibility, minimized state, and extended content

**Key Functions:**
- `handleSendMessage`: Processes user input and routes to appropriate flow
- `handleModeChange`: Switches between agent/navigation modes with confirmation
- `handleModuleSelect`: Handles module selection in navigation mode
- `fetchCustomBotConfigurations`: Loads custom bot configuration
- `triggerRefreshAction`: Triggers manual refresh of chatbot data
- `handleUploadAccess`: Checks user access for upload functionality

**Used In:** Root application component, typically imported and rendered at the application level.

**Dependencies:**
- All hooks from `hooks/` directory
- Components: ChatPlaceholder, MemoryModal, UploadModal, ChatbotInput
- Services: chatbot-services
- External: `impact-ui-chatbot` ChatBotComponent

---

## Hooks

### useChatState

**Location:** `hooks/useChatState.js`

**Purpose:** Centralized state management hook that provides all state variables, refs, and utilities needed by SmartBot.

**Returns:**
- **State Variables:** 50+ state variables including:
  - `showModal`, `minimizedMode`, `userInput`, `loader`
  - `currentMode`, `selectedModule`, `activeConversationId`
  - `currentAgentId`, `currentSessionId`, `baseUrl`
  - `isThinking`, `thinkingContent`, `chatId`, `isStop`
  - `isModalOpen`, `isUploadModalOpen`, `utilityList`
- **Refs:** `chatDataRef`, `chatDataInfoRef`, `chatBodyRef`, `minimizedBtnRef`, `functionsRef`
- **Utilities:** `navigate`, `location`, `dispatch`, `classes`, `globalClasses`, `dateFormat`

**Used In:** `index.jsx` (SmartBot main component)

**Why:** Consolidates all state management in one place for easier maintenance and reduces prop drilling.

---

### useChatFlow

**Location:** `hooks/useChatFlow.js`

**Purpose:** Handles chat flow logic for navigation and insights modes. Manages query processing, response parsing, user interactions, and integrates with agent flow for streaming responses.

**Arguments (66 parameters):**
- **State Setters:** `setLoader`, `setFlowType`, `setScreenName`, `setUserInput`, `setQuestionIndex`, `setCurrentAppLink`, `setIsModuleChanged`, `setChatDataState`, `setCurrentSessionId`, `setInitValue`, `setSessionId`, `setThinkingContent`, `setIsThinking`, `setChatId`, `setIsStop`, `setFunctionsState`, `setThinkingHeaderMessage`, `setFieldNumber`
- **State Values:** `flowType`, `screenName`, `questionIndex`, `userInput`, `dateFormat`, `currentMode`, `activeConversationId`, `initValue`, `sessionId`, `thinkingContent`, `isThinking`, `chatId`, `isStop`, `functionsState`, `thinkingHeaderMessage`, `uniqueChatId`, `fieldNumber`
- **Refs:** `chatDataRef`, `chatBodyRef`, `chatDataInfoRef`, `functionsRef`
- **Redux/Utils:** `filterReducerState`, `dispatch`, `navigate`, `baseUrl`, `customChatConfig`, `chatbotContext`

**Returns:**
- **`setUserFlow(data)`**: 
  - Fetches available screens/modules for the specified flow type via `fetchScreensForModule`
  - Creates user chat message and loader in conversation
  - Displays screen selection chips or error message
  - Used when user initiates a new flow (e.g., "Get Insights")
  - Parameters: `data` object with `flow_type`, `displayText`, `displayUserText`, `skipUserChat`
  
- **`setUserScreenAndFlow(data)`**: 
  - Updates flow type, screen name, and question index
  - Sets application link based on screen name using `setLink` or from `data.link`
  - Stores screen name in localStorage
  - Routes to agent flow if `flow_type === "agent"` and `actionType === "direct"`
  - Routes to query fetch if `actionType === "indirect"` (sets user input)
  - Otherwise calls `fetchUserResultsFromQuery` with screen data
  - Parameters: `data` object with `flow_type`, `screen_name`, `actionType`, `displayText`, `link`, `question_index`
  
- **`fetchUserResultsFromQuery(refObject, fetchQuestions, inputValue)`**: 
  - Main query processing function
  - Creates user message and loader in chat
  - If `fetchQuestions = true`: Fetches related questions for a screen via `fetchRelatedQuestions` API
  - If `fetchQuestions = false`: 
    - For navigation mode: Uses streaming via `parseResponse` with type "stream"
    - For insights mode: Calls `resolveChatQuery` with question index and screen name
    - Handles @mentions (intent-based queries) via `fetchIntentApiResponse` and applies filters
  - Updates both `chatDataRef` and `chatDataInfoRef` with responses
  - Handles errors with fallback messages
  - Parameters: `refObject` (query data), `fetchQuestions` (boolean), `inputValue` (optional user input)
  
- **`getCurrentDateTimeString()`**: Returns formatted date/time string using moment.js with `dateFormat`
  
- **`setLink(screenNameInfo)`**: 
  - Maps screen name to application link using `navigationOptions` or `insightsOptions` constants
  - Stores link in localStorage and state via `setCurrentAppLink`
  - Removes link if not found
  - Parameters: `screenNameInfo` (screen name string)
  
- **`updateTheFilterConfigurationAndApply(data)`**: 
  - Processes intent action response from @mention queries
  - Maps filter keywords to dimensions using `dimensionFilterMapping`
  - Pre-selects filters in Redux state via `setSelectedFilters`
  - Updates filter configuration via `setFilterConfiguration`
  - Automatically clicks "Apply Filter" button after 1 second delay
  - Parameters: `data` (intent action response object)

**Key Features:**
- Integrates `useAgentFlow` hook internally for agent-related operations
- Supports streaming responses for navigation mode
- Handles intent-based filter application via @mentions
- Manages conversation state in both `chatDataRef` and `chatDataInfoRef`
- Processes different response types (text, questions, stream)

**Used In:** `index.jsx` - Main chat flow operations, module selection, query processing

**Why:** Separates chat flow logic from UI rendering, handles complex routing between modes, and provides reusable query processing functions.

---

### useChatSession

**Location:** `hooks/useChatSession.js`

**Purpose:** Manages chat session lifecycle - saving, loading, parsing, and clearing conversations. Handles localStorage persistence and session state management.

**Arguments (17 parameters):**
- **Refs:** `chatDataRef`, `chatDataScreenLinkRef`
- **State Setters:** `setFlowType`, `setScreenName`, `setUserInput`, `setTemplateData`, `setShowModal`, `setMinimizedMode`, `setSelectedModule`, `setChatDataState`, `setCurrentAppLink`, `setActiveConversationId`, `setShowChatPlaceholder`
- **State Values:** `currentMode`, `selectedModule`, `activeConversationId`
- **Functions:** `setUserFlow`, `getCurrentDateTimeString`, `fetchUserResultsFromQuery`, `closeBot`

**Returns:**
- **`parseSavedFlow(savedChatSession)`**: 
  - Restores saved conversation from localStorage
  - Handles incomplete conversations (user message without bot response)
  - If last message is user input with `hasDirectActionType`, re-triggers query via `fetchUserResultsFromQuery`
  - If last message is user input without direct action, sets flow type and screen name
  - Ensures conversation exists before parsing via `ensureConversationExists`
  - Updates `chatDataState` to trigger re-render
  - Parameters: `savedChatSession` (array of message objects)
  
- **`saveCurrentChanges(moduleSelected)`**: 
  - Serializes `chatDataRef.current` to JSON and saves to localStorage as "chatData"
  - Saves current mode to localStorage as "currentModeData"
  - Saves selected module data (passed or from state) to localStorage as "currentSelectedModuleData"
  - Called automatically or manually to persist chat state
  - Parameters: `moduleSelected` (optional module object to save)
  
- **`endCurrentSession()`**: 
  - Resets all chat-related state (flowType, userInput, screenName, templateData, activeConversationId)
  - Clears conversation messages (different handling for agent vs other modes)
  - Resets screen link data in `chatDataScreenLinkRef`
  - Saves cleared state to localStorage
  - Closes modal and minimizes bot
  - Clears selected module for navigation mode
  - Calls `initiateNewChat` to reset to initial state
  - Calls `closeBot(false)` to close the bot
  
- **`clearChatSession()`**: 
  - Resets flow type, user input, screen name, and app link
  - Calls `initiateNewChat()` to start fresh
  - Simpler reset than `endCurrentSession` (doesn't close modal)
  
- **`initiateNewChat(mode)`**: 
  - Creates initial greeting message: "Hi [UserName]! I am Alan, your virtual assistant..."
  - Ensures conversation objects exist for all modes (insights, navigation)
  - For insights mode: Automatically triggers `setUserFlow` with "Get Insights" action
  - For agent mode: Sets initial greet message in `chatDataRef.current["agent"]` array
  - Updates `chatDataState` to trigger re-render
  - Parameters: `mode` (optional mode string)
  
- **`hasUnsavedChanges()`**: 
  - Compares current conversation messages with saved version in localStorage
  - Returns `true` if:
    - No saved data exists
    - Message counts differ
    - Message content differs (deep JSON comparison)
  - Used to show confirmation dialogs before mode switching or closing
  - Returns `false` if no changes detected

**Key Features:**
- Handles conversation persistence across page refreshes
- Supports multiple conversation modes (agent, navigation, insights)
- Detects unsaved changes for user confirmation
- Manages conversation initialization and cleanup
- Handles edge cases (incomplete conversations, direct actions)

**Used In:** `index.jsx` - Session management, conversation persistence, mode switching confirmations

**Why:** Encapsulates session management logic, provides localStorage persistence, enables unsaved changes detection, and handles conversation lifecycle operations.

---

### useAgentFlow

**Location:** `hooks/useAgentFlow.js`

**Purpose:** Handles agent mode specific flow - processes agent responses, manages streaming via Server-Sent Events (SSE), handles agent-specific interactions, and processes complex response types including combined responses.

**Arguments (9 parameters):**
- **Basic:** `dateFormat`, `chatDataRef`, `currentMode`, `setShowChatPlaceholder`, `setLoader`
- **Configuration:** `baseUrl`, `setCurrentSessionId`, `customChatConfig`, `chatDataInfoRef`
- **`utilityObjectData`** (Object with 20+ properties):
  - Streaming states: `setChatDataState`, `activeConversationId`, `chatBodyRef`, `runStreaming`
  - Context: `chatbotContext`, `setInitValue`, `setSessionId`
  - Thinking states: `thinkingContent`, `setThinkingContent`, `isThinking`, `setIsThinking`
  - Stream control: `chatId`, `setChatId`, `isStop`, `setIsStop`, `functionsRef`, `functionsState`, `setFunctionsState`
  - Header: `thinkingHeaderMessage`, `setThinkingHeaderMessage`
  - IDs: `uniqueChatId`, `setUniqueChatId`, `fieldNumber`, `setFieldNumber`

**Returns:**
- **`setAgentFlow(payload, input, baseUrlTemp)`**: 
  - Main function to initiate agent conversation
  - Creates user chat message (if `payload.user_input` exists) and loader
  - If `utilityObjectData.runStreaming = true`:
    - Calls `parseResponse` with type "stream" to initiate SSE connection
    - Sets up streaming with thinking indicators and response handling
    - Updates `chatDataInfoRef` with stream response
  - If `utilityObjectData.runStreaming = false`:
    - Calls `initiateAgent` API endpoint
    - Processes response via `processResponse` function
  - Handles errors with fallback error messages
  - Updates both `chatDataRef` (for agent mode) and `chatDataInfoRef` (for rendering)
  - Parameters: `payload` (agent request object), `input` (optional input string), `baseUrlTemp` (API base URL)
  
- **`prepareDataAndSendToAgent(data, init, utilityObjectData)`**: 
  - Prepares payload for agent API call
  - Extracts `agentId`, `sessionId`, `userInput`, `chatInput` from data
  - Handles `chatbotContext` (form data) - collects all updated fields
  - If context exists: Builds `user_input` object from context and creates `chat_input` string
  - Sets `init` flag based on `utilityObjectData.initValue`
  - Includes `chat_id` (uniqueChatId) for conversation tracking
  - Calls `setAgentFlow` with prepared payload
  - Clears chatbot context after sending
  - Parameters: `data` (agent data object), `init` (boolean), `utilityObjectData` (context object)
  
- **`processResponse(response, payload, currentModeValue, customChatConfig, utilsObject)`**: 
  - Processes agent API responses (both single and array responses)
  - Supports custom parsers via `customChatConfig.parserPath` and `parserFunctionName`
  - Handles three response scenarios:
    1. **Single object response**: Parses single response item
    2. **Array with multiple items**: Creates "combined" type response for tabular display
    3. **Special cases**: Handles optimization triggers, thinking responses
  - Extracts thinking info from first response item if available
  - Parses responses using `parseResponse` utility or custom parser
  - Updates `chatDataRef` and `chatDataInfoRef` with parsed responses
  - Marks first message in array as `firstMessage: true`
  - Updates session ID from response
  - Triggers re-render via `setChatDataState`
  - Parameters: `response` (API response), `payload` (request payload), `currentModeValue` (mode string), `customChatConfig` (config object), `utilsObject` (utility object)

**Key Features:**
- **Streaming Support**: Uses SSE (Server-Sent Events) via `parseResponse` with "stream" type
- **Custom Parsers**: Supports dynamic loading of custom response parsers
- **Combined Responses**: Handles multi-part responses (text + table + graph) as "combined" type
- **Thinking Indicators**: Manages thinking state and displays thinking content during processing
- **Context Management**: Handles form data collection from chatbotContext (sliders, selects, inputs, etc.)
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Session Management**: Tracks session IDs, chat IDs, and unique chat IDs

**Response Processing Flow:**
1. Check for custom parser configuration
2. Determine response type (single object, array, or special case)
3. Extract thinking information if present
4. Parse each response item using appropriate parser
5. Combine multiple items into "combined" type if needed
6. Update chat data refs with parsed responses
7. Trigger UI update via state change

**Used In:** 
- `index.jsx` - Agent mode operations, message sending
- `useChatFlow.js` - For agent-related queries and screen selections
- `ChatPlaceholder.jsx` - For initializing agent conversations

**Why:** Separates agent-specific logic from general chat flow, handles complex streaming responses, supports custom parsing, and manages agent context and form data collection.

---

### useBotConfiguration

**Location:** `hooks/useBotConfiguration.js`

**Purpose:** Manages bot configuration, permissions, and utility functions like refresh and snack messages.

**Arguments:**
- `setRefreshLoader`: Setter for refresh loader state
- `setEnableRefreshAction`: Setter to enable/disable refresh action
- `dispatch`: Redux dispatch function

**Returns:**
- `refreshAndUpdateUserManual`: Refreshes and updates user manual document
- `configureBotActions`: Configures bot actions based on user permissions
- `displaySnackMessages`: Displays snackbar messages (success/error/warning)

**Used In:** `index.jsx` - Bot configuration and utility functions

**Why:** Centralizes bot configuration logic and permission checks, provides reusable notification system.

---

### useDragAndDrop

**Location:** `hooks/useDragAndDrop.js`

**Purpose:** Handles drag and drop functionality for the minimized bot button.

**Arguments:**
- `minimizedBtnRef`: Ref to the minimized button element
- `setPosition`: Setter for button position state

**Returns:**
- `handleMouseDown`: Initiates drag operation
- `handleMouseMove`: Handles mouse movement during drag
- `handleMouseUp`: Ends drag operation
- `isDraggingRef`: Ref to track if currently dragging

**Used In:** `index.jsx` - Minimized bot drag functionality (currently commented out in ChatLayout)

**Why:** Provides reusable drag-and-drop logic for repositioning minimized bot.

---

### useConversationManagement

**Location:** `hooks/useConversationManagement.js`

**Purpose:** Manages conversation CRUD operations - fetching, creating, updating, deleting, and saving conversations to/from backend.

**Arguments:**
- `chatDataRef`: Ref to chat data object
- `currentMode`: Current chat mode
- `activeConversationId`: Currently active conversation ID
- `setActiveConversationId`: Setter for active conversation ID
- `setChatDataState`: Setter for chat data state
- `selectedModule`: Selected module object
- `setSelectedModule`: Setter for selected module
- `isModuleChanged`: Boolean for module changed state
- `setIsModuleChanged`: Setter for module changed flag
- `setActiveChatId`: Optional setter for active chat ID
- `saveCurrentChanges`: Optional function to save current changes

**Returns:**
- `loading`: Loading state
- `error`: Error state
- `fetchConversations`: Fetches list of conversations for current mode
- `fetchConversationChats`: Fetches messages for a specific conversation
- `createNewConversation`: Creates a new conversation
- `renameConversation`: Renames an existing conversation
- `deleteConversation`: Deletes a conversation
- `saveCurrentChat`: Saves current chat to backend

**Used In:** Currently not actively used in `index.jsx` - May be used in future conversation management features

**Why:** Provides backend integration for conversation persistence and management.

---

## Components

### ChatPlaceholder

**Location:** `components/ChatPlaceholder.jsx`

**Purpose:** Displays initial placeholder screen when agent mode is active, showing available agent capabilities as clickable cards.

**Props:**
- `dateFormat`, `chatDataRef`, `currentMode`, `setShowChatPlaceholder`, `setLoader`
- `setCurrentAgentId`, `baseUrl`, `setBaseUrl`, `setCurrentSessionId`
- `customChatConfig`, `chatDataInfoRef`, `setChatDataState`, `userInput`
- `legacyAgentScreen`, `activeConversationId`, `chatBodyRef`, `chatbotContext`
- Streaming states: `setInitValue`, `setSessionId`, `thinkingContent`, `isThinking`, etc.

**Used In:** `index.jsx` - Rendered as `customScreenJsx` when `showChatPlaceholder` is true

**Why:** Provides initial UI for agent mode, allows users to select agent capabilities before starting conversation.

---

### ChatLayout

**Location:** `components/ChatLayout.jsx`

**Purpose:** Layout wrapper for chatbot modal with header, sidebar, and content area. Handles minimized state and mode switching.

**Props:**
- `classes`, `globalClasses`, `showModal`, `minimizedMode`
- `handleMouseDown`, `isDraggingRef`, `minimizedBtnRef`
- `setShowModal`, `setMinimizedMode`, `closeBot`
- `showExtendedContent`, `setShowExtendedContent`
- `currentMode`, `setCurrentMode`
- `enableRefreshAction`, `refreshLoader`, `refreshAndUpdateUserManual`
- `children`: Content to render inside layout

**Used In:** Currently commented out in `index.jsx` - Legacy layout component

**Status:** Appears to be replaced by `ChatBotComponent` from `impact-ui-chatbot` library

---

### ModuleSelection

**Location:** `components/ModuleSelection.jsx`

**Purpose:** Displays module selection UI for navigation mode. Shows selected module and allows expanding/collapsing module list.

**Props:**
- `classes`: Styling classes
- `selectedModule`: Currently selected module object
- `isCardVisible`: Boolean to show/hide module card
- `setIsCardVisible`: Setter for card visibility
- `currentMode`: Current chat mode
- `setSelectedModule`: Setter for selected module
- `fetchUserResultsFromQuery`: Function to fetch results when module selected
- `setScreenName`: Setter for screen name
- `setLink`: Setter for application link
- `activeConversationId`: Current conversation ID
- `setIsModuleChanged`: Setter for module changed flag

**Used In:** Currently commented out in `index.jsx` - Legacy component

**Status:** Replaced by module selection in `ChatBotComponent`

---

### MessageTemplate

**Location:** `components/message-template/index.jsx`

**Purpose:** Renders chat messages (bot, user, loader) from template data. Handles date chips and actionable CTAs.

**Props:**
- `templateData`: Chat data object containing messages
- `chatMode`: Current mode (agent/navigation/insights)
- `screenLinkData`: Screen link data for redirects
- `displaySnackMessages`: Function to show snack messages
- `activeConversationId`: Current conversation ID
- `chatDataState`: Current chat data state
- `loader`: Loading state

**Used In:** Currently commented out in `index.jsx` - Legacy message rendering

**Status:** Replaced by message rendering in `ChatBotComponent`

---

### BotMessage

**Location:** `components/message-template/components/message-types/BotMessage.jsx`

**Purpose:** Central component for rendering all bot message types. Acts as a router that determines which content component to render based on `bodyType`. Supports custom renderers and handles like/dislike actions.

**Props:**
- **`botData`** (Object): Message data containing:
  - `bodyType`: Type of content ("text", "stream", "chips", "questions", "table", "graph", "slider", "select", "datePicker", "checkbox", "radio", "button", "input", "combined", "dynamic")
  - `bodyText`: Content data (varies by type - string, array, object)
  - `headerTitle`: Optional header text
  - `timeStamp`: Message timestamp
  - `userName`: Bot name (usually "Alan")
  - `noShowHeaderTitle`: Boolean to hide header
  - `enableLikes`: Boolean to show like/dislike buttons
  - `isMultiSelect`: Boolean for multi-select chips
  - `utilityData`: Additional utility data for components
  - `rendererInfo`: Object with `path` and `functionName` for dynamic renderers
  - `thinkingResponse`: Thinking indicator data for streamed content
  
- **`state`** (Object): Loading state for like/dislike actions:
  - `like`: Key of message being liked (null if none)
  - `dislike`: Key of message being disliked (null if none)
  
- **`handleLikeDislike`** (Function): Callback for like/dislike clicks
  - Parameters: `(likeDislikeKey, isLike, answer, chatIndex)`
  
- **`props`** (Object): Additional props passed to content components:
  - `templateData`, `chatMode`, `activeConversationId`, `clearChatSession`, `endCurrentSession`
  - `setUserFlow`, `setUserScreenAndFlow`, `screenName`, `currentAppLink`
  - `screenLinkData`, `selectedModule`, `displaySnackMessages`, `customChatConfig`, `loader`

**Content Type Routing:**
- **`text`**: Renders `TextContent` component
- **`stream`**: Renders `StreamedContent` component (real-time streaming)
- **`chips`**: Renders `ChipsContent` (single select) or `SelectableChips` (multi-select if `isMultiSelect = true`)
- **`questions`**: Renders `QuestionsContent` component
- **`table`**: Renders `TableContent` component (AgGrid)
- **`graph`**: Renders `GraphContent` component (charts)
- **`slider`**: Renders `SliderContent` component
- **`select`**: Renders `SelectContent` component
- **`datePicker`**: Renders `DatePickerContent` component
- **`checkbox`**: Renders `CheckboxContent` component
- **`radio`**: Renders `RadioContent` component
- **`button`**: Renders `ButtonContent` component
- **`input`**: Renders `InputContent` component
- **`combined`**: Renders `CombinedContent` component (multiple content types)
- **`dynamic`**: Loads custom renderer function dynamically via `getDynamicFunction`

**Custom Renderer Support:**
- Loads custom renderer from `botData.rendererInfo.path` and `botData.rendererInfo.functionName`
- Shows loading state while renderer is being loaded
- Falls back to `TextContent` if renderer fails to load
- Handles render errors gracefully

**Rendering Logic:**
1. Extracts `likeDislikeKey` from `response_heading` or `screen_name` + `timeStamp`
2. Conditionally renders header title (unless `noShowHeaderTitle = true` or `bodyType = "questions"`)
3. Routes to appropriate content component based on `bodyType`
4. Renders `LikeDislikeActions` component at the bottom (if enabled)

**Used In:** 
- `index.jsx` - Dynamically assigned to `message.jsx` property in `chatDataInfoRef` messages
- `MessageTemplate.jsx` - Renders bot messages in conversation

**Why:** Central component for rendering all bot message types with consistent styling, handles content routing, supports custom renderers, and provides like/dislike functionality.

---

### StreamedContent

**Location:** `components/message-template/components/message-types/streamed-content/StreamedContent.jsx`

**Purpose:** Handles real-time streaming of chat messages via Server-Sent Events (SSE). Manages thinking indicators, step-by-step responses, streaming content display, and provides stop functionality.

**Props:**
- **`botData`** (Object): Contains:
  - **`utilityObject`** (Object): Contains refs, callbacks, and configuration:
    - **Refs:** `activeConversationId`, `currentMode`, `chatDataRef`, `chatBodyRef`, `chatDataInfoRef`
    - **Setters:** `setChatDataState`, `setLoader`, `setThinkingContent`, `setIsThinking`, `setChatId`, `setIsStop`, `setFunctionsState`, `setThinkingHeaderMessage`
    - **State:** `thinkingContent`, `isThinking`, `chatId`, `isStop`, `functionsState`
    - **Functions:** `processResponse`
    - **Refs:** `functionsRef`
    - **Config:** `endpoint`, `method`, `thinkingResponse` (with thinkingHeading, thinkingContent, thinkingTime)
  - **`inputBody`**: Request payload sent to streaming endpoint
  - **`thinkingResponse`**: Thinking indicator configuration

**Key Features:**
- **SSE Streaming**: Uses `AxiosEventSource` to establish SSE connection
- **Thinking Indicator**: Shows "Planning next moves" with streaming thinking content
- **Step-by-Step Display**: Tracks and displays processing steps with status (not-completed, completed, error)
- **Stop Functionality**: Allows aborting streaming via `functionsState.abortStreaming()`
- **Content Accumulation**: Accumulates streamed content in real-time
- **Tabbed Interface**: Uses `StepsResponseTab` to show Steps and Agent Response tabs
- **Auto Tab Switching**: Automatically switches to "Agent Response" tab when streaming completes

**State Management:**
- `content`: Accumulated streamed text content
- `isStreaming`: Boolean indicating if streaming is active
- `isStreamingDone`: Boolean indicating streaming completion
- `isThinking`: Boolean for thinking phase
- `thinkingTime`: Duration of thinking phase in seconds
- `steps`: Array of step objects with `header`, `sub_header`, `step_status`
- `stepsDone`: Boolean indicating all steps completed
- `finalStepDone`: Boolean indicating final step completion

**Streaming Flow:**
1. **Initialize**: Sets up SSE connection via `AxiosSource`
2. **Thinking Phase**: Receives "thinking" status messages, accumulates thinking content
3. **Step Phase**: Receives "step" status messages, updates step list with status
4. **Content Phase**: Receives regular messages, accumulates response text
5. **Completion**: Receives "[DONE]" message, processes widget_data if present
6. **Finalize**: Updates chat data, triggers re-render, switches to response tab

**Event Handling:**
- **`message` event**: Processes incoming SSE messages
  - Parses JSON data
  - Handles thinking, step, and content messages
  - Updates thinking context in Redux
  - Accumulates content and updates steps
- **`close` event**: Handles connection closure
- **`error` event**: Handles connection errors

**Used In:** `BotMessage.jsx` - Rendered when `bodyType === "stream"`

**Why:** Provides real-time streaming experience with visual feedback, thinking indicators, step tracking, and comprehensive state management for agent responses.

---

### AxiosEventSource

**Location:** `components/message-template/components/message-types/streamed-content/AxiosEventSource.js`

**Purpose:** Custom Server-Sent Events (SSE) client implementation using Axios. Provides EventSource-like functionality with Axios for streaming responses.

**Exports:**
- **`AxiosSource(url, opts, messageToStoreRef)`**: Creates SSE client
  - **Parameters:**
    - `url`: Endpoint URL for SSE connection
    - `opts`: Configuration object with `method`, `headers`, `body`, `timeout`
    - `messageToStoreRef`: Ref object to store accumulated messages
  - **Returns:** EventTarget instance with `close()` method
  
- **`sseevent(message, messageToStoreRef)`**: Processes SSE message
  - Parses SSE message format (event type, data)
  - Handles JSON parsing with error recovery
  - Updates `messageToStoreRef` with:
    - `chatData.response`: Accumulated response text
    - `chatData.response_heading`: Response heading
    - `chatData.thinkingResponse.thinkingStream`: Thinking content
    - `appendedData`: Widget data from "[DONE]" message
    - `sessionId`, `uniqueChatId`: Session identifiers
    - `initValue`: Completion flag
  - Returns MessageEvent for event dispatching

**Key Features:**
- **Chunk Processing**: Handles partial JSON messages across multiple chunks
- **JSON Validation**: Validates complete JSON before parsing using `isLikelyCompleteJson`
- **Error Recovery**: Handles parsing errors gracefully
- **Message Accumulation**: Accumulates response and thinking content
- **Completion Detection**: Detects "[DONE]" marker and extracts widget data
- **Abort Support**: Provides `close()` method to abort connection

**Used In:** `StreamedContent.jsx` - For establishing SSE connections

**Why:** Provides SSE functionality using Axios, handles chunked data, validates JSON, and accumulates streaming content.

---

### ThinkingIndicator

**Location:** `components/message-template/components/message-types/streamed-content/ThinkingIndicator.jsx`

**Purpose:** Displays thinking indicator with streaming thinking content. Shows "Planning next moves" animation and renders thinking text.

**Props:**
- `thinkingContent`: Current thinking content being streamed (from Redux state)
- `isStreaming`: Boolean indicating if streaming is active (optional)
- `thinkDone`: Boolean indicating thinking phase complete (optional)
- `renderThinkingLoader`: Function to render custom loader (optional)
- `thinkingStarted`: Boolean indicating thinking has started (optional)

**Features:**
- Reads `thinkingContent` from Redux state (`smartBotReducer.thinkingContext`)
- Displays thinking content using `TextRenderer` component
- Shows 3-dot loading animation when no thinking content available
- Updates in real-time as thinking content streams in
- Uses collapsible dropdown UI for thought display

**Used In:** 
- `StreamedContent.jsx` - Displayed during thinking phase
- `useAgentFlow.js` - Passed as part of thinkingResponse

**Why:** Provides visual feedback during AI thinking phase with real-time content updates.

---

### ThinkinHeaderInfo

**Location:** `components/message-template/components/message-types/streamed-content/ThinkinHeaderInfo.jsx`

**Purpose:** Displays thinking header message (e.g., "Planning next moves....." or "Thought for X seconds").

**Props:**
- Reads from Redux state: `smartBotReducer.thinkingContext.thinkingHeaderMessage`

**Features:**
- Simple component that displays header message from Redux
- Updates automatically when thinking context changes

**Used In:** 
- `StreamedContent.jsx` - Displayed as thinking header
- `useAgentFlow.js` - Passed as part of thinkingResponse

**Why:** Provides header text for thinking indicator, updates from centralized Redux state.

---

### StepsResponseTab

**Location:** `components/message-template/components/message-types/streamed-content/steps-response-tab/StepsResponseTab.jsx`

**Purpose:** Tabbed interface component displaying Steps and Agent Response tabs during streaming.

**Props:**
- `steps`: Array of step objects with `header`, `sub_header`, `step_status`
- `setSteps`: Setter for steps array
- `stepsDone`: Boolean indicating steps completed
- `setStepsDone`: Setter for steps done state
- `finalStepDone`: Boolean indicating final step done
- `setFinalStepDone`: Setter for final step done state
- `content`: Agent response content text
- `isStreaming`: Boolean indicating if streaming is active
- `stepChange`: Boolean flag to trigger step updates
- `currentMode`: Current chat mode

**Features:**
- Two tabs: "Steps" (with StepsIcon) and "Agent response" (with AgentResponseIcon)
- Displays `Steps` component in first tab
- Displays `AgentResponse` component in second tab
- Manages tab switching state

**Used In:** `StreamedContent.jsx` - Displayed during streaming to show progress

**Why:** Provides tabbed interface for viewing step-by-step progress and final response separately.

---

### Steps (streamed-content)

**Location:** `components/message-template/components/message-types/streamed-content/steps-response-tab/components/Steps.jsx`

**Purpose:** Displays list of processing steps with status indicators (loading, completed, error).

**Props:**
- `steps`: Array of step objects
- `setSteps`: Setter for steps array
- `done`: Boolean indicating all steps done
- `setDone`: Setter for done state
- `setTabValue`: Function to switch tabs (switches to "agent_response" when done)
- `finalStepDone`: Boolean indicating final step done
- `setFinalStepDone`: Setter for final step done state
- `stepChange`: Boolean flag to trigger updates
- `currentMode`: Current chat mode

**Step Object Structure:**
```javascript
{
  header: "Processing Request",
  sub_header: "Analyzing the current request",
  step_status: "not-completed" | "completed" | "error"
}
```

**Features:**
- Visual status indicators:
  - **Loading**: Animated spinner icon (StepsLoader)
  - **Completed**: Checkmark icon (StepDone)
  - **Error**: Error icon (StepsError)
- Color coding: Green for completed, Blue for loading, Red for error
- Auto-completion: When `done = true`, marks all steps as completed and adds "Finished" step
- Auto tab switch: Switches to "agent_response" tab when steps complete (for navigation mode)

**Used In:** `StepsResponseTab.jsx` - First tab panel

**Why:** Provides visual progress tracking during agent processing with clear status indicators.

---

### AgentResponse (streamed-content)

**Location:** `components/message-template/components/message-types/streamed-content/steps-response-tab/components/AgentResponse.jsx`

**Purpose:** Displays final agent response content with streaming cursor indicator.

**Props:**
- `content`: Agent response text content
- `isStreaming`: Boolean indicating if content is still streaming

**Features:**
- Renders content using `TextRenderer` component
- Shows blinking cursor (`<span className={classes.cursor} />`) when `isStreaming = true`
- Handles empty content state (shows cursor only)

**Used In:** `StepsResponseTab.jsx` - Second tab panel

**Why:** Displays final agent response with visual streaming indicator.

---

### CombinedContent

**Location:** `components/message-template/components/message-content/CombinedContent.jsx`

**Purpose:** Renders multiple content types in a single message (e.g., text + table + graph combination). Parses each content item and renders them sequentially.

**Props:**
- `botData`: Message data object containing:
  - `bodyText`: Array of content items with different types
  - `utilityData`: Utility data for content rendering (includes `isTabEnabled` for tabular display)
  - `agentId`, `currentMode`, `sessionId`
- `props`: Additional props object passed to child components

**Features:**
- Parses and renders multiple content types in sequence
- Supports all content types (text, chips, questions, table, graph, forms, etc.)
- Uses `parseResponse` utility to parse each item
- Tabular content support for step-by-step responses via `TabularContent` component
- Error handling for individual content items (shows error message if parsing fails)
- Filters out null/invalid content items

**Rendering Flow:**
1. Maps over `bodyText` array
2. Parses each item using `parseResponse` with appropriate type
3. Routes to appropriate content component based on parsed `bodyType`
4. Renders all valid content items sequentially

**Used In:** `BotMessage.jsx` - Rendered when `bodyType === "combined"`

**Why:** Allows rendering complex multi-part responses in a single message, enabling rich content combinations.

---

## Message Content Components

### TextContent

**Location:** `components/message-template/components/message-content/TextContent.jsx`

**Purpose:** Renders plain text content with markdown support and special handling for "IA Smart Platform" text.

**Props:**
- `bodyText`: Text string to render
- `botData`: Message data object (optional, for thinking response)

**Features:**
- Uses `TextRenderer` component for markdown rendering
- Special formatting for "IA Smart Platform" text (bold)
- Supports thinking response display (collapsible thought dropdown)
- Shows thinking time in header

**Used In:** `BotMessage.jsx` - Rendered when `bodyType === "text"`

**Why:** Provides text rendering with markdown support and special text highlighting.

---

### ChipsContent

**Location:** `components/message-template/components/message-content/ChipsContent.jsx`

**Purpose:** Renders clickable chip buttons for single-select interactions (e.g., module selection, action buttons).

**Props:**
- `bodyText`: Array of chip objects with:
  - `displayText`: Text to display on chip
  - `interactable`: Boolean to enable/disable click
  - `actionName`: Action function name to call
  - Additional action data (screen_name, flow_type, etc.)
- `props`: Props object containing action callbacks

**Features:**
- Maps over chip array and renders each as clickable Typography component
- Calls action callback from props when chip is clicked
- Visual styling with hover effects
- Supports non-interactable chips (display only)

**Used In:** `BotMessage.jsx` - Rendered when `bodyType === "chips"` and `isMultiSelect = false`

**Why:** Provides single-select chip interface for user interactions.

---

### SelectableChips

**Location:** `components/message-template/components/message-content/SelectableChips.jsx`

**Purpose:** Renders multi-select chips with confirmation button. Allows selecting multiple options before submitting.

**Props:**
- `bodyText`: Array of chip objects with `id`, `displayText`, `agentId`, `sessionId`
- `chipType`: Type of chip (default: "selectable")
- `utilityData`: Utility data containing `prepareDataAndSendToAgent`, `baseUrl`
- `props`: Additional props object

**Features:**
- Tracks selected chips in state
- Visual feedback for selected chips (different background color, bold text)
- "Confirm Selection" button with count of selected chips
- Disabled state when no chips selected
- Extracts agentId and sessionId from chip data
- Calls `prepareDataAndSendToAgent` with selected chip data on confirm

**Used In:** `BotMessage.jsx` - Rendered when `bodyType === "chips"` and `isMultiSelect = true`

**Why:** Provides multi-select chip interface with confirmation before submission.

---

### QuestionsContent

**Location:** `components/message-template/components/message-content/QuestionsContent.jsx`

**Purpose:** Renders list of clickable questions with staggered animation. Displays questions one by one with fade-in effect.

**Props:**
- `bodyText`: Array of question objects with:
  - `displayText`: Question text
  - `interactable`: Boolean to enable click
  - `actionName`: Action function name
  - Additional action data
- `props`: Props object containing action callbacks

**Features:**
- Staggered animation: Questions appear one by one with 200ms delay
- Question bullet icon with gradient
- Chevron right icon for interactable questions
- Uses `HighlightedRenderer` for text highlighting
- Smooth fade-in and slide-up animation
- Calls action callback when question is clicked

**Used In:** `BotMessage.jsx` - Rendered when `bodyType === "questions"`

**Why:** Provides animated question list interface for better UX.

---

### TableContent

**Location:** `components/message-template/components/message-content/TableContent.jsx`

**Purpose:** Renders data tables using AgGrid component. Supports expandable modal view and row selection.

**Props:**
- `bodyText`: Table data object containing:
  - `table_config`: Column configuration array
  - `row_data`: Array of row objects
  - `display_name`: Table title
  - `unique_id`: Unique identifier for row selection
  - `select_all_component`: Boolean to show select all checkbox
  - `table_name`: Table identifier

**Features:**
- Two views: Compact inline view (10 rows) and expanded modal view (20 rows)
- Row selection with Redux state management
- Selected rows stored in `chatbotContext.tables[table_name]`
- Expand button to open full table in modal
- Excel download support
- Auto-height for inline view
- Formatted columns using `getFormattedTableConfig` and `agGridColumnFormatter`

**Used In:** `BotMessage.jsx` - Rendered when `bodyType === "table"`

**Why:** Provides rich table display with selection, expansion, and export capabilities.

---

### GraphContent

**Location:** `components/message-template/components/message-content/GraphContent.jsx`

**Purpose:** Renders charts and graphs using CoreChart component.

**Props:**
- `bodyText`: Graph data object containing:
  - `chartOptions`: Chart configuration object (chart type, data, labels, etc.)

**Features:**
- Uses `CoreChart` component for rendering
- Supports all chart types (bar, line, pie, etc.)
- Chart reference management via `handleChartRef`
- Returns null if no chartOptions provided

**Used In:** `BotMessage.jsx` - Rendered when `bodyType === "graph"`

**Why:** Provides chart/graph visualization for data analysis.

---

### SliderContent

**Location:** `components/message-template/components/message-content/SliderContent.jsx`

**Purpose:** Renders slider input for numeric value selection. Stores value in Redux chatbotContext.

**Props:**
- `bodyText`: Slider configuration object:
  - `header`: Header text
  - `headerOrentiation`: Header position ("left", "right", "top", "bottom")
  - `inputPosition`: Input position ("inline", "below")
  - `label`: Slider label
  - `max`: Maximum value
  - `min`: Minimum value
  - `required`: Boolean for required field
  - `disabled`: Boolean for disabled state
  - `paramName`: Parameter name for context storage

**Features:**
- Uses `Slider` component from impact-ui-v3
- Stores value in `chatbotContext[paramName]` with `updated: true` flag
- Updates Redux state on value change
- Returns null if bodyText is empty

**Used In:** `BotMessage.jsx` - Rendered when `bodyType === "slider"`

**Why:** Provides slider input for numeric value selection in agent forms.

---

### SelectContent

**Location:** `components/message-template/components/message-content/SelectContent.jsx`

**Purpose:** Renders dropdown select input (single or multi-select). Stores selected values in Redux chatbotContext.

**Props:**
- `bodyText`: Select configuration object:
  - `header`: Header text
  - `inputPosition`: Input position
  - `labelOrientation`: Label position ("top", "left", etc.)
  - `label`: Select label
  - `options`: Array of option objects with `label` and `value`
  - `isRequired`: Boolean for required field
  - `isDisabled`: Boolean for disabled state
  - `isMulti`: Boolean for multi-select
  - `paramName`: Parameter name for context storage

**Features:**
- Uses `Select` component from impact-ui-v3
- Supports single and multi-select modes
- Stores selected value(s) in `chatbotContext[paramName]` with `updated: true` flag
- Search functionality for multi-select
- Select all functionality for multi-select
- Updates Redux state on selection change
- Returns null if bodyText is empty

**Used In:** `BotMessage.jsx` - Rendered when `bodyType === "select"`

**Why:** Provides dropdown select input for single or multiple value selection in agent forms.

---

### DatePickerContent

**Location:** `components/message-template/components/message-content/DatePickerContent.jsx`

**Purpose:** Renders date picker input. Stores selected date in Redux chatbotContext.

**Props:**
- `bodyText`: DatePicker configuration object:
  - `displayFormat`: Date format string (e.g., "DD-MM-YYYY")
  - `label`: DatePicker label
  - `isRequired`: Boolean for required field
  - `labelOrientation`: Label position
  - `placeholder`: Placeholder text
  - `minDate`: Minimum selectable date
  - `maxDate`: Maximum selectable date
  - `isDisabled`: Boolean for disabled state
  - `paramName`: Parameter name for context storage

**Features:**
- Uses `DatePicker` component from impact-ui-v3
- Formats selected date using moment.js with `displayFormat`
- Stores formatted date string in `chatbotContext[paramName]` with `updated: true` flag
- Updates Redux state on date change
- Returns null if bodyText is empty

**Used In:** `BotMessage.jsx` - Rendered when `bodyType === "datePicker"`

**Why:** Provides date selection input for agent forms.

---

### CheckboxContent

**Location:** `components/message-template/components/message-content/CheckboxContent.jsx`

**Purpose:** Renders checkbox input. Stores checked state in Redux chatbotContext.

**Props:**
- `bodyText`: Checkbox configuration object:
  - `label`: Checkbox label text
  - `checked`: Initial checked state
  - `required`: Boolean for required field
  - `disabled`: Boolean for disabled state
  - `paramName`: Parameter name for context storage

**Features:**
- Uses `Checkbox` component from impact-ui-v3
- Stores boolean checked value in `chatbotContext[paramName]` with `updated: true` flag
- Updates Redux state on change
- Returns null if bodyText is empty

**Used In:** `BotMessage.jsx` - Rendered when `bodyType === "checkbox"`

**Why:** Provides checkbox input for boolean value selection in agent forms.

---

### RadioContent

**Location:** `components/message-template/components/message-content/RadioContent.jsx`

**Purpose:** Renders radio button group for single selection. Stores selected value in Redux chatbotContext.

**Props:**
- `bodyText`: Radio configuration object:
  - `label`: Radio group label
  - `isDisabled`: Boolean for disabled state
  - `orientation`: Layout orientation ("column", "row")
  - `options`: Array of option objects with `label` and `value`
  - `paramName`: Parameter name for context storage

**Features:**
- Uses `RadioButtonGroup` component from impact-ui-v3
- Stores selected option value in `chatbotContext[paramName]` with `updated: true` flag
- Updates Redux state on selection change
- Returns null if bodyText is empty

**Used In:** `BotMessage.jsx` - Rendered when `bodyType === "radio"`

**Why:** Provides radio button group for single option selection in agent forms.

---

### InputContent

**Location:** `components/message-template/components/message-content/InputContent.jsx`

**Purpose:** Renders text input field. Stores input value in Redux chatbotContext.

**Props:**
- `bodyText`: Input configuration object:
  - `label`: Input label
  - `placeholder`: Placeholder text
  - `isRequired`: Boolean for required field
  - `isDisabled`: Boolean for disabled state
  - `inputType`: Input type ("text", "number", "email", etc.)
  - `labelOrientation`: Label position
  - `defaultValue`: Initial input value
  - `maxLength`: Maximum character length
  - `minLength`: Minimum character length
  - `paramName`: Parameter name for context storage

**Features:**
- Uses `Input` component from impact-ui-v3
- Stores input value in `chatbotContext[paramName]` with `updated: true` flag
- Updates Redux state on input change
- Returns null if bodyText is empty

**Used In:** `BotMessage.jsx` - Rendered when `bodyType === "input"`

**Why:** Provides text input field for agent forms.

---

### ButtonContent

**Location:** `components/message-template/components/message-content/ButtonContent.jsx`

**Purpose:** Renders action buttons. Currently triggers send button click.

**Props:**
- `bodyText`: Button configuration object:
  - `buttons`: Array of button objects with:
    - `label`: Button text
    - `variant`: Button variant ("primary", "secondary", etc.)
    - `size`: Button size ("small", "medium", "large")
    - `disabled`: Boolean for disabled state
    - `icon`: Icon component
    - `iconPlacement`: Icon position ("left", "right")
  - `message`: Optional message text above buttons

**Features:**
- Renders multiple buttons in a row
- On click, triggers send button click (currently hardcoded behavior)
- Supports button variants, sizes, and icons
- Returns null if buttons array is not provided

**Used In:** `BotMessage.jsx` - Rendered when `bodyType === "button"`

**Why:** Provides action buttons for user interactions (currently triggers message send).

---

### TabularContent

**Location:** `components/message-template/components/message-content/tabular-content/index.js`

**Purpose:** Tabbed interface for displaying steps and agent response in combined content.

**Props:**
- `steps`: Array of step objects
- `currentTabValue`: Initial tab value
- `children`: Content to display in Agent Response tab

**Features:**
- Two tabs: "Steps" and "Agent response"
- Marks all steps as completed
- Displays Steps component in first tab
- Displays AgentResponse component with children in second tab

**Used In:** `CombinedContent.jsx` - For tabular display of combined responses

**Why:** Provides tabbed interface for step-by-step and response content.

---

### Steps (tabular-content)

**Location:** `components/message-template/components/message-content/tabular-content/components/Steps.jsx`

**Purpose:** Displays list of completed steps with status indicators.

**Props:**
- `steps`: Array of step objects with `header`, `sub_header`, `step_status`

**Features:**
- Visual status indicators (loading, completed, error)
- Color-coded step headers
- Displays step header and sub-header

**Used In:** `TabularContent.jsx` - First tab panel

**Why:** Shows completed steps in tabular content view.

---

### AgentResponse (tabular-content)

**Location:** `components/message-template/components/message-content/tabular-content/components/AgentResponse.jsx`

**Purpose:** Container component for agent response content in tabular view.

**Props:**
- `children`: Content to render (typically parsed response components)

**Features:**
- Simple wrapper component
- Renders children content

**Used In:** `TabularContent.jsx` - Second tab panel

**Why:** Provides container for agent response in tabular content view.

---

### ChatbotInput

**Location:** `components/chatbot-input/index.js`

**Purpose:** Advanced input component with mention support (@mentions for filters), date range picker, and rich text editing capabilities. Provides two-stage mention selection (filter → values) with cascading filter support.

**Props:**
- `newChatScreen`: Boolean for new chat screen state
- `inputValue`: Current input value (string)
- `setInputValue`: Setter for input value
- `isStopIcon`: Boolean to show stop icon
- `onSendIconClick`: Callback when send icon clicked - receives formatted text object
- `onStopIconClick`: Callback when stop icon clicked
- `currentMode`: Current chat mode
- `filterOptions`: Array of filter options for mentions (from `fetchChatbotFilterConfig`)

**Key Features:**
- **Rich Text Editor**: Uses contentEditable div for text input
- **Two-Stage Mention System**: Filter selection → Value selection
- **Date Range Picker**: Special handling for `@time` mention
- **Cascading Filters**: Uses existing filter selections to fetch dependent values
- **Filter Value Caching**: Caches filter values to reduce API calls
- **Auto-complete**: Filters options based on search text
- **Mention Formatting**: Displays mentions as highlighted spans with count badges

**Mention Feature - Detailed Documentation:**

#### How Mentions Work

**Stage 1: Filter Selection**
1. User types `@` symbol
2. `detectMention()` function detects the `@` and finds its position
3. Dropdown opens showing available filters from `filterOptions`
4. User can type to search/filter the options
5. On selection, `handleFilterSelection()` is called
6. Stage 1 mention span is inserted: `@FilterName::`
7. Automatically transitions to Stage 2

**Stage 2: Value Selection**
1. After filter selection, `insertStage1Mention()` is called
2. Fetches filter values via `fetchFilterValues()` API
3. Dropdown reopens showing available values for selected filter
4. User can select single or multiple values (based on filter config)
5. On selection close, `insertStage2Mention()` is called
6. Stage 2 mention span is inserted: `@FilterName::Value1,Value2,+N`
7. If more than 3 values, shows count badge with `+N` notation

**Special Cases:**
- **`@time`**: Opens date range picker instead of filter dropdown
- **Cascading Filters**: Uses existing Stage 2 mentions to build API payload for dependent filters
- **Cache Management**: Clears cache on new chat or empty input

#### Mention State Management

Uses `useMentionState` hook which manages:
- `selectionStage`: "filter" or "values"
- `selectedFilter`: Currently selected filter config
- `selectedOptions`: Selected values array
- `currentMentionGroupId`: Unique ID for current mention
- `mentionStartPos`: Position where `@` was typed
- `mentionSearch`: Search text after `@`

#### Mention DOM Structure

Mentions are rendered as `<span>` elements with:
- `class="mention-highlight"`: Styling class
- `data-group-id`: Unique group identifier
- `data-filter-name`: Filter name
- `data-stage`: "1" or "2"
- `data-values`: JSON array of selected values
- `contentEditable="false"`: Prevents editing inside mention

Count badges have:
- `class="mention-count-badge"`: Additional class
- `data-hidden-count`: Number of hidden values
- `data-hidden-values`: JSON array of hidden value labels
- Hover tooltip showing all hidden values

#### Key Functions

**`detectMention()`**:
- Detects `@` symbol in editor
- Checks if cursor is inside existing mention (prevents nested mentions)
- Handles `@time` special case
- Opens appropriate dropdown (filter or date picker)
- Updates dropdown position

**`handleFilterSelection(selectedOption)`**:
- Finds filter config from `filterOptions`
- Calls `insertStage1Mention()` with filter name
- Inserts Stage 1 mention span in DOM

**`insertStage1Mention(text, filterName, filterConfig)`**:
- Deletes `@` and search text from editor
- Creates Stage 1 mention span
- Inserts span at mention position
- Transitions to Stage 2
- Fetches filter values with cascading support

**`insertStage2Mention()`**:
- Removes Stage 1 mention span
- Creates Stage 2 mention span with selected values
- Adds count badge if more than 3 values
- Inserts space after mention
- Resets mention state

**`handleDateRangeChange(startDate, endDate)`**:
- Formats dates using tenant date format
- Creates date range mention span
- Inserts formatted date range text
- Closes date range picker

**`getFormattedTextForSending()`**:
- Extracts all mentions from editor
- Formats Stage 2 mentions as "FilterName: Value1, Value2, Value3"
- Formats date range mentions as "StartDate to EndDate"
- Removes Stage 1 mentions (incomplete)
- Returns plain text string

#### Mention Utilities

**`mentionHelpers.js`**:
- `parseMentionText(mentionText)`: Parses mention text to extract filter and values
- `formatMentionDisplay(filterName, values, maxVisible)`: Formats mention for display
- `formatMentionForSending(filterName, values)`: Formats mention for API
- `isMentionAwaitingValues(mentionText)`: Checks if mention is at Stage 1
- `generateMentionGroupId()`: Generates unique group ID

**`domHelpers.js`**:
- `getTextContent(editorRef)`: Gets plain text from contentEditable
- `getCursorPosition(editorRef)`: Gets cursor position as character offset
- `setCursorPosition(editorRef, pos)`: Sets cursor position
- `createMentionSpan(text, filterName, values, groupId, isStage1)`: Creates mention span element
- `createCountBadge(count, hiddenValues, groupId)`: Creates +N count badge
- `getAllMentions(editorRef)`: Gets all mention elements from editor
- `removeMentionByGroupId(editorRef, groupId)`: Removes mention by group ID

**`apiHelpers.js`**:
- `fetchFilterValues(filterConfig, existingFilters, filterOptions)`: Fetches filter values with caching
- `buildFilterOptionsPayload(filterConfig, existingFilters, filterOptions)`: Builds API payload
- `clearFilterValuesCache()`: Clears filter values cache

#### Date Range Picker Integration

- Triggered when user types `@time`
- Uses `DateRangePicker` component
- Positioned near `@time` text
- Formats dates using tenant date format from localStorage
- Inserts formatted date range as mention span
- Special attribute `data-date-range="true"` to identify date mentions

#### Cascading Filters

When fetching values for a filter, existing Stage 2 mentions are:
1. Extracted via `getExistingFilterSelections(currentDimension)` - **now dimension-aware**
2. Formatted into API payload format
3. Included in `fetchFilterValues()` call
4. Used to build cascading filter request
5. Excludes "time" filter from cascading

**Cross Dimension Cascading Restriction:**
- **Purpose**: Prevents filters from different dimensions (e.g., "product" vs "store") from affecting each other's available values
- **Implementation**: 
  - `getExistingFilterSelections()` now accepts `currentDimension` parameter
  - Only includes existing mentions that match the current filter's dimension
  - Dimension is extracted from `filterConfig.dimension`, defaults to "product" if not found
  - Each mention's dimension is determined by finding its filter config in `filterOptions`
- **Example**: 
  - If user selects `@Brand::Nike` (product dimension) and then `@Store::` (store dimension)
  - When fetching store values, only store-related filters are included in cascading
  - Brand filter (product dimension) is excluded from the cascading payload
- **Benefits**:
  - Prevents incorrect value filtering across dimensions
  - Ensures cascading only occurs within the same dimension
  - Maintains data integrity and accuracy

#### Custom Dimension Support with Any Display Type

**Purpose**: Allows any custom dimension to use any display type for value input, not just dropdown. Provides flexible input methods for different filter types.

**Supported Display Types:**
1. **`dropdown`** (default): Standard dropdown select with API-fetched values
2. **`autocompleteDropdown`**: Dropdown with autocomplete/search functionality
3. **`list`**: List-based selection
4. **`TextField`**: Text input field for free-form text entry
5. **`sliderRange`**: Slider for numeric range selection
6. **`rangePicker`**: Date range picker for date range selection
7. **`DateTimeField`**: Date/time input field
8. **`BooleanField`**: Checkbox for boolean values

**Implementation Details:**

**FilterValueInput Component:**
- Located at `components/chatbot-input/components/FilterValueInput.jsx`
- Renders appropriate input component based on `display_type`
- Handles value formatting and onChange events for each type
- Supports configuration via `filterConfig.extra` object

**Display Type Detection:**
- When transitioning to Stage 2, checks `filterConfig.display_type`
- If type is `dropdown`, `autocompleteDropdown`, or `list`: Makes API call to fetch values
- If type is any other: No API call needed, uses `FilterValueInput` component with config from `extra` object

**Value Formatting by Type:**
- **TextField**: Stores as string value
- **sliderRange**: Stores as object `{ value: number, range_min: number, range_max: number }`
- **rangePicker**: Formats as "StartDate to EndDate" string
- **BooleanField**: Stores as boolean, converts to string for display
- **dropdown/list**: Uses label/value from API response

**Configuration via `extra` Object:**
Each display type can be configured using `filterConfig.extra`:
```javascript
{
  // TextField
  inputType: "text" | "number" | "email",
  placeholder: "Enter value",
  maxLength: 100,
  minLength: 1,
  isRequired: true,
  isDisabled: false,
  
  // sliderRange
  min: 0,
  max: 100,
  step: 1,
  variant: "range",
  
  // rangePicker
  dateFormat: "MM-DD-YYYY",
  disableType: "disablePast",
  startYear: 2020,
  showMonthYearSelect: true,
  
  // DateTimeField
  inputType: "date" | "datetime-local",
  placeholder: "Select date",
  
  // BooleanField
  label: "Enable feature"
}
```

**UI Rendering:**
- For non-dropdown types, renders `FilterValueInput` component in a styled container
- Shows "Apply" and "Cancel" buttons (instead of auto-closing on selection)
- Apply button inserts Stage 2 mention with formatted value
- Cancel button resets mention state

**Benefits:**
- Supports any custom dimension with any input type
- No need to modify core component for new display types
- Consistent value formatting and storage
- Flexible configuration via `extra` object
- Better UX for different data types (text, numbers, dates, booleans)

**Example Usage:**
```javascript
// Filter config with custom display type
{
  label: "Price Range",
  dimension: "product",
  display_type: "sliderRange",
  extra: {
    min: 0,
    max: 1000,
    step: 10
  }
}

// Filter config with text input
{
  label: "Custom Search",
  dimension: "product",
  display_type: "TextField",
  extra: {
    inputType: "text",
    placeholder: "Enter search term",
    maxLength: 50
  }
}
```

#### Cache Management

- Filter values are cached by unique key (attribute_name + dimension + existing filters)
- Cache key includes dimension to prevent cross-dimension cache conflicts
- Cache is cleared when:
  - Input is cleared (new chat scenario)
  - `newChatScreen` becomes true
  - Component mounts with `newChatScreen = true`

**Used In:** `index.jsx` - Rendered as `customInputComponent` when `currentMode === "agent"`

**Why:** Provides advanced input capabilities with two-stage mention system, enabling users to easily add filters and date ranges to their queries.

---

### FilterValueInput

**Location:** `components/chatbot-input/components/FilterValueInput.jsx`

**Purpose:** Renders appropriate input component based on filter's `display_type`. Supports multiple input types beyond dropdown for custom dimensions.

**Props:**
- `filterConfig`: Filter configuration object with `display_type` and `extra` properties
- `value`: Current input value (can be string, number, object, array, or boolean)
- `onChange`: Callback function when value changes
- `options`: Array of options (for dropdown types)
- `isLoading`: Boolean for loading state
- `isMulti`: Boolean for multi-select support
- `selectedOptions`: Array of selected options
- `setSelectedOptions`: Setter for selected options

**Supported Display Types:**
1. **`TextField`**: Text input field
   - Config via `extra.inputType`, `extra.placeholder`, `extra.maxLength`, `extra.minLength`
   - Returns string value
   
2. **`dropdown`**: Standard dropdown (default)
   - Uses `Select` component from impact-ui-v3
   - Supports single and multi-select
   - Requires `options` array
   
3. **`sliderRange`**: Slider for numeric values
   - Config via `extra.min`, `extra.max`, `extra.step`
   - Returns object: `{ value: number, range_min: number, range_max: number }`
   
4. **`rangePicker`**: Date range picker
   - Config via `extra.dateFormat`, `extra.disableType`, `extra.startYear`
   - Returns array: `[startDate, endDate]` (moment objects)
   
5. **`DateTimeField`**: Date/time input
   - Config via `extra.inputType` ("date" or "datetime-local")
   - Returns string value
   
6. **`BooleanField`**: Checkbox
   - Returns boolean value
   
7. **Default**: Falls back to dropdown for unknown types

**Features:**
- Handles value extraction from different formats (string, object, array, number, boolean)
- Converts values to appropriate format for each display type
- Supports configuration via `filterConfig.extra` object
- Handles loading states and disabled states
- Validates and clamps numeric values for sliders

**Value Handling:**
- Extracts string values using `getStringValue()` helper
- Extracts numeric values using `getNumericValue()` helper
- Updates local state for responsive UI
- Calls `onChange` with properly formatted value

**Used In:** `ChatbotInput` - Rendered in Stage 2 when `display_type` is not dropdown/autocompleteDropdown/list

**Why:** Provides flexible input rendering for different filter types, enabling custom dimensions to use any display type without modifying core component.

---

### MemoryModal

**Location:** `components/memory-modal/index.jsx`

**Purpose:** Modal component for viewing, editing, and deleting chatbot memories (user preferences and system memories).

**Props:**
- `isModalOpen`: Boolean to control modal visibility
- `setIsModalOpen`: Setter for modal visibility
- `displaySnackMessages`: Function to show snack messages

**Features:**
- Tabbed interface (user_preference, system_memory)
- List of memories with edit/delete actions
- Loading states and error handling

**Used In:** `index.jsx` - Rendered when `isModalOpen` is true

**Why:** Provides UI for managing chatbot memories that persist user preferences and system context.

---

### UploadModal

**Location:** `components/upload-modal/index.js`

**Purpose:** Modal for uploading PDF documents to chatbot knowledge base.

**Props:**
- `isUploadModalOpen`: Boolean to control modal visibility
- `setIsUploadModalOpen`: Setter for modal visibility
- `displaySnackMessages`: Function to show snack messages

**Features:**
- File selection (PDF only)
- Signed URL generation and upload
- Loading states and error handling

**Used In:** `index.jsx` - Rendered when `isUploadModalOpen` is true

**Why:** Allows users to upload documents to enhance chatbot knowledge base.

---

### SavedChat

**Location:** `components/SavedChat.jsx`

**Purpose:** Displays saved chat conversations in a sidebar panel. Allows switching between conversations.

**Props:**
- `mode`: Current chat mode
- `activeConversationId`: Currently active conversation ID
- `setActiveConversationId`: Setter for active conversation ID
- `saveCurrentChanges`: Function to save current changes
- `chatDataRef`: Ref to chat data
- `setChatDataState`: Setter for chat data state
- `hasUnsavedChanges`: Function to check for unsaved changes
- `chatDataState`: Current chat data state
- `selectedModule`: Selected module object
- `setSelectedModule`: Setter for selected module
- `isModuleChanged`: Boolean for module changed state
- `setIsModuleChanged`: Setter for module changed flag
- `showExtendedContent`: Boolean for extended content visibility

**Used In:** Currently commented out in `index.jsx` - Legacy saved chat panel

**Status:** Replaced by conversation management in `ChatBotComponent`

---

### SelectedModule

**Location:** `components/SelectedModule.jsx`

**Purpose:** Displays selectable module cards for navigation mode.

**Props:**
- `onSelect`: Callback when module is selected
- `selectedModule`: Currently selected module object
- `currentMode`: Current chat mode
- `activeConversationId`: Current conversation ID

**Used In:** `ModuleSelection.jsx` - Rendered when module card is visible

**Why:** Provides UI for selecting modules in navigation mode.

---

### RedirectLink

**Location:** `components/RedirectLink.jsx`

**Purpose:** Renders a redirect link button that navigates to the selected screen.

**Props:**
- `to`: URL path to navigate to
- `screenName`: Name of the screen to display

**Used In:** `MessageTemplate.jsx` - Rendered as actionable CTA after bot messages

**Why:** Provides navigation link to screens mentioned in bot responses.

---

### TextRenderer

**Location:** `components/TextRenderer.jsx`

**Purpose:** Renders formatted text content with markdown support.

**Status:** Check if actively used or replaced by TextContent component.

---

### LoadingOverlay

**Location:** `components/LoadingOverlay.jsx`

**Purpose:** Displays loading overlay during async operations.

**Status:** Check if actively used.

---

### ChatFooter

**Location:** `components/ChatFooter.jsx`

**Purpose:** Footer component with input field and action buttons for chat.

**Status:** Currently commented out - Replaced by ChatbotInput component

---

### ChatInput

**Location:** `components/ChatInput.jsx`

**Purpose:** Legacy input component for chat.

**Status:** Replaced by ChatbotInput component

---

## Services

### chatbot-services.js

**Location:** `services/chatbot-services.js`

**Purpose:** API service functions for chatbot operations.

**Functions:**
- `resolveChatQuery(body, flowType)`: Resolves chat queries for navigation/insights modes
- `fetchRelatedQuestions(flowType, screen_name)`: Fetches related questions for a screen
- `getSmartBotVisibilityData()`: Gets chatbot visibility configuration
- `refreshAndUpdateUserManualApi(body)`: Refreshes user manual document
- `fetchScreensForModule(flowType)`: Fetches available screens for a flow type
- `likeDislikeComment(payload)`: Submits like/dislike feedback
- `fetchIntentApiResponse(input)`: Fetches intent-based API response
- `fetchAgentsInfo(baseUrl)`: Fetches available agent information
- `initiateAgent(payload, baseUrl)`: Initiates agent conversation
- `fetchCustomBotConfig(baseUrl)`: Fetches custom bot configuration
- `uploadFile(payload)`: Gets signed URL for file upload
- `triggerRefresh(baseUrl)`: Triggers chatbot data refresh
- `fetchChatbotFilterConfig(type)`: Fetches filter configuration (product/store)

**Used In:** 
- `index.jsx` - Various API calls
- `useChatFlow.js` - Query resolution
- `useBotConfiguration.js` - Refresh operations
- `ChatPlaceholder.jsx` - Agent info fetching
- `ChatbotInput` - Filter config fetching

**Why:** Centralizes all API calls, provides consistent error handling, and makes API layer testable.

---

### conversation-service.js

**Location:** `services/conversation-service.js`

**Purpose:** API service functions for conversation management operations (CRUD operations for conversations).

**Functions:**
- `fetchConversations(mode)`: Fetches list of conversations for a mode
- `fetchConversationChats(conversationId)`: Fetches messages for a conversation
- `createConversation(payload)`: Creates a new conversation
- `updateConversation(conversationId, payload)`: Updates a conversation (rename)
- `deleteConversation(conversationId)`: Deletes a conversation
- `saveChat(payload)`: Saves chat messages to a conversation

**Used In:** `useConversationManagement.js` - All conversation management operations

**Why:** Centralizes conversation API calls and provides backend integration for conversation persistence.

---

## Utilities

### utlis.js

**Location:** `utlis.js`

**Purpose:** Utility functions for chatbot operations - parsing, formatting, and helper functions.

**Key Functions:**
- `parseResponse(data, type, ...)`: Parses API responses into chat message format
- `getDynamicFunction(path, functionName)`: Dynamically loads functions from modules
- `handleMessageLike(...)`: Handles like/dislike message actions
- `ensureConversationExists(mode, conversationId, chatDataRef)`: Ensures conversation object exists
- `generateConversationObject()`: Generates initial conversation object structure
- `transformValues(values)`: Transforms filter values
- `getCurrentDateTimeString(dateFormat)`: Gets formatted current date/time string
- `getTimeBasedGreeting()`: Returns time-based greeting message

**Used In:** 
- `index.jsx` - Various utility operations
- `useChatFlow.js` - Response parsing
- `useAgentFlow.js` - Response processing
- `useChatSession.js` - Conversation management

**Why:** Provides reusable utility functions for common operations like parsing, formatting, and dynamic function loading.

---

### constants.js

**Location:** `constants.js`

**Purpose:** Constant values used across chatbot components.

**Constants:**
- `navigationOptions`: Navigation mode screen options
- `insightsOptions`: Insights mode screen options
- `screenOptions`: General screen options

**Used In:** `useChatFlow.js` - For setting links based on screen names

**Why:** Centralizes constant values for easier maintenance and updates.

---

### styling.jsx

**Location:** `styling.jsx`

**Purpose:** Material-UI styles and theme configuration for chatbot components.

**Exports:**
- `useStyles`: Hook that returns styled classes based on position and minimizedBtnRef

**Used In:** All components that need styling - imported as `useStyles` or `classes`

**Why:** Centralizes styling logic, provides consistent theming, and handles dynamic styles based on state.

---

## Unused/Deprecated Files

### ChatLayout, ChatFooter, ChatInput, MessageTemplate, ModuleSelection, SavedChat

**Status:** These components appear to be legacy implementations that have been replaced by `ChatBotComponent` from `impact-ui-chatbot` library. They are currently commented out in `index.jsx`.

**Reason:** Migration to external UI library component for better maintainability and feature set.

---

### temp.js

**Location:** `temp.js`

**Status:** Temporary file - likely for testing or development purposes. Should be reviewed and removed if not needed.

---

### index_old_backup.js, index_new.js

**Location:** `components/chatbot-input/`

**Status:** Backup files for ChatbotInput component. Should be removed if no longer needed.

---

### reference.js

**Location:** `components/message-template/reference.js`

**Status:** Reference file - check if actively used or can be removed.

---

## Key Data Structures

### chatDataRef Structure
```javascript
{
  insights: { conversations: {} },
  navigation: { conversations: {} },
  agent: []
}
```

### chatDataInfoRef Structure
```javascript
{
  insights: {},
  navigation: {},
  agent: {}
}
```

### Message Object Structure
```javascript
{
  timeStamp: "DD-MM-YYYY HH:mm:ss",
  userType: "bot" | "user" | "loader",
  userName: "Alan",
  bodyType: "text" | "chips" | "questions" | "table" | "graph" | "stream" | ...,
  bodyText: string | array | object,
  headerTitle: string,
  enableLikes: boolean,
  // ... other properties
}
```

---

## Important Notes

1. **Mode Switching:** The chatbot supports three modes:
   - `agent`: AI agent mode with streaming responses
   - `navigation`: Navigation assistance mode
   - `insights`: Insights and analytics mode

2. **State Management:** Most state is managed through `useChatState` hook, with specialized hooks for different concerns (flow, session, agent).

3. **Streaming:** Agent mode supports streaming responses via `StreamedContent` component and `AxiosEventSource`.

4. **Persistence:** Chat data is persisted to localStorage for session recovery.

5. **Custom Configuration:** Supports custom parsers and renderers via `customChatConfig`.

6. **Mentions:** ChatbotInput supports @mentions for filters with multi-stage selection (filter → values).

7. **Legacy Components:** Several components are commented out and replaced by `ChatBotComponent` from external library.

---

## Dependencies

**External Libraries:**
- `impact-ui-chatbot`: Main chatbot UI component
- `react-redux`: State management
- `react-router-dom-v5-compat`: Navigation
- `lodash`: Utility functions
- `moment`: Date formatting
- `@mui/material`: Material-UI components

**Internal Dependencies:**
- `core/actions/*`: Redux actions
- `core/Utils/*`: Utility functions
- `core/Styles/*`: Styling utilities
- `coreAssets/*`: Asset imports

