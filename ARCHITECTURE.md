# RPChat Architecture Reference

## Overview

RPChat is a single-page application (SPA) that provides a flexible chat interface for roleplaying with AI language models. The application is built using vanilla JavaScript with a component-based architecture that allows for message editing, provider switching, and full conversation management.

## Design Goals
- **Serverless** *Run in any modern browser. No backend required.*
- **No Dependencies** *HTML+CSS+JS.  No third-party libraries*

## Application Structure

### Core Architecture

```
├── HTML Structure (index.html.template)
├── CSS Styles (embedded)
├── JavaScript Components
│   ├── Core Classes
│   │   ├── ChatMessage
│   │   ├── ChatManager
│   │   ├── AIProvider
│   │   └── AIModel
│   ├── UI Management
│   ├── API Communication
│   ├── Storage Management
│   └── Import/Export
└── Configuration Files
    ├── providers.json
    └── systemprompts.json
```

## Core Classes and Components

### 1. ChatMessage Class

**Purpose**: Represents individual chat messages with editing capabilities

**Key Properties**:
- `role`: Message role (system, user, assistant, app)
- `content`: Message text content
- `id`: Unique identifier
- `characterId`: Character association (for multi-character support)
- `visibility`: Message visibility (public/private)
- `element`: DOM element reference

**Key Methods**:
- `createMessageElement()`: Creates DOM structure for message
- `startEditing()`: Enables inline editing
- `saveEdit()`: Saves edited content
- `cancelEdit()`: Cancels editing
- `render(container)`: Renders message to DOM

**Special Features**:
- Collapsible system messages
- Role-based styling
- Edit/delete controls
- Character attribution

### 2. ChatManager Class

**Purpose**: Manages collection of ChatMessage objects and enforces conversation rules

**Key Properties**:
- `messages`: Array of ChatMessage instances
- `container`: DOM container for rendering
- `notificationHandler`: Status message callback
- `onUpdate`: Update callback function

**Key Methods**:
- `addMessage(role, content)`: Adds single message
- `addMessages(messages)`: Batch adds messages
- `handleDelete(messageId)`: Deletes single message
- `handleDeleteFromHere(messageId)`: Deletes from point onwards
- `getMessagesJSON()`: Exports messages as JSON
- `parseMessagesJSON(data)`: Imports messages from JSON
- `render()`: Renders all messages to DOM
- `prepareApiMessagesForCharacter(characterId)`: Formats messages for API calls

**Business Rules**:
- Exactly one system message (always first)
- Trailing empty user message for continuation
- System message cannot be deleted
- Validates message structure on import

### 3. AIProvider Class

**Purpose**: Handles AI provider configuration and API communication

**Key Properties**:
- `id`: Provider identifier
- `displayName`: Human-readable name
- `endpoint`: API endpoint URL
- `models`: Array of available models
- `apiFormat`: API format (openai/gemini-native)
- `defaultMaxTokens`: Default token limit

**Key Methods**:
- `getModel(modelId)`: Gets specific model configuration
- `prepareRequestBody()`: Formats request for API
- `prepareOpenAIRequestBody()`: OpenAI-compatible format
- `prepareGeminiRequestBody()`: Gemini-native format
- `apiKeyName`: Generates API key storage name

### 4. AIModel Class

**Purpose**: Represents individual AI model configuration

**Key Properties**:
- `id`: Model identifier
- `displayName`: Human-readable name
- `defaultTemperature`: Default temperature setting
- `extraFields`: Additional model-specific configuration

## Key Constants and Enums

### ROLES
- `SYSTEM`: System prompts
- `USER`: User messages
- `ASSISTANT`: AI responses
- `APP`: Application messages (errors, notifications)

### CSS_CLASSES
- `MESSAGE`: Base message class
- `USER_MESSAGE`: User message styling
- `ASSISTANT_MESSAGE`: Assistant message styling
- `SYSTEM_MESSAGE`: System message styling
- `EDITABLE_CONTENT`: Editable content areas
- `COLLAPSIBLE`/`COLLAPSED`: Collapsible message states

## Core Functions and Operations

### Initialization Flow
1. **`initializeApp()`**: Main entry point
2. **`init()`**: Core initialization
3. **`loadStateFromStorage()`**: Loads saved state
4. **`initializeUIElements()`**: Sets up UI components
5. **`initializeChatManager()`**: Creates chat manager
6. **`attachEventListeners()`**: Binds event handlers

### Message Management
- **`handleSendMessage()`**: Processes send button clicks
- **`sendMessage(content)`**: Initiates API call
- **`callAPI(messages)`**: Makes HTTP request to provider
- **`handleApiResponse()`**: Processes API response
- **`handleApiError()`**: Handles API errors

### UI State Management
- **`updateSendButtonState()`**: Controls send button availability
- **`updateModelSelector()`**: Updates model dropdown
- **`updateSystemPromptSelector()`**: Updates system prompt dropdown
- **`showStatus(message, type)`**: Displays status messages

### Storage Operations
- **`onChatUpdate()`**: Saves chat state to sessionStorage
- **`loadStateFromStorage()`**: Loads persisted state
- **API keys**: Stored in localStorage for persistence
- **Chat messages**: Stored in sessionStorage for tab isolation

## Data Flow

### Message Lifecycle
1. User types in trailing message
2. Message validation occurs
3. API request prepared via ChatManager
4. Provider-specific formatting applied
5. HTTP request sent to AI provider
6. Response processed and added to chat
7. UI updated and state persisted

### State Management
- **Session State**: Provider, model, temperature, messages
- **Persistent State**: API keys, user preferences
- **UI State**: Edit modes, button states, collapsible states

## Provider Integration

### Adding New Providers
1. Add configuration to `providers.json`
2. Provider must implement OpenAI-compatible API
3. Custom formatting handled in `prepareRequestBody()`
4. API authentication via Bearer token or URL parameter

### API Formats Supported
- **OpenAI Compatible**: Standard chat completions format
- **Gemini Native**: Google's native API format with custom transformations

## Import/Export System

### Export Format
```json
{
  "messages": [
    {
      "role": "system|user|assistant",
      "content": "message content",
      "characterId": 0,
      "visibility": 1
    }
  ],
  "exportDate": "ISO timestamp"
}
```

### Import Process
1. File validation
2. Message structure verification
3. System message rule enforcement
4. ChatMessage instance creation
5. UI rendering and state persistence

## Key Design Patterns

### Component-Based Architecture
- Self-contained classes with clear responsibilities
- Event-driven communication between components
- Separation of concerns (UI, data, API)

### Observer Pattern
- ChatManager notifies on updates
- UI components respond to state changes
- MutationObserver for DOM change detection

### Strategy Pattern
- Provider-specific API formatting
- Pluggable system prompt styles
- Configurable model parameters

## Extension Points

### Adding Features
- **New Message Types**: Extend ROLES enum and add styling
- **Custom Providers**: Add to providers.json with API compatibility
- **UI Enhancements**: Modify CSS classes and DOM structure
- **Storage Backends**: Replace localStorage/sessionStorage calls

### Configuration
- **System Prompts**: Add to systemprompts.json
- **Model Parameters**: Extend AIModel class
- **UI Behavior**: Modify constants and CSS classes

## Error Handling

### API Errors
- Network failures gracefully handled
- Error messages displayed as app messages
- State recovery maintained

### Validation
- Message structure validation on import
- API key presence checking
- Content validation before sending

### User Experience
- Disabled controls during processing
- Status messages for user feedback
- Confirmation dialogs for destructive actions
