# RPChat Functional Specification

## 1. Introduction

RPChat is a web-based AI chat client designed primarily for roleplaying and creative writing scenarios. Its core differentiating feature is the ability for users to edit AI-generated responses and prior prompts directly within the chat interface. The system prompt is also editable. 

The editing capability allows users to guide the conversation, correct undesirable AI behavior (like repetition), and maintain narrative consistency. The application interacts with external AI provider APIs and stores chat history and settings locally in the user's browser.

The application also supports importing and exporting chat sessions as JSON files, allowing users to save and share their conversations. The JSON files can be imported into the application, allowing users to continue a conversation from a previous session. The files store the chat history including the system prompt.

## 2. Target Audience

Users engaging in AI-powered roleplay, storytelling, or other creative endeavors who require fine-grained control over the context of the conversation.

## 3. Core Features

*   **AI Provider Integration:** Connect to and interact with supported AI provider APIs (e.g., Together.ai).
*   **Model Selection:** Choose specific AI models offered by the selected provider.
*   **Chat Interface:** Standard chat interface displaying user and AI messages chronologically.
*   **Editable AI Responses:** Allow users to modify the content of AI messages after they are received.
*   **System Prompt Configuration:** Define a system prompt to guide the AI's overall behavior or persona.
*   **Temperature Control:** Adjust the creativity/randomness of the AI responses.
*   **Local Persistence:** Store API keys, chat history, selected provider/model, system prompt, and temperature settings in the browser's local storage.
*   **State Management:** Maintain application state (messages, settings, processing status).
*   **Clear Chat Functionality:** Option to clear the current conversation history.
*   **(Planned) Import/Export:** Functionality to save and load chat sessions to/from files (as noted in `js/strategy.md`, this is a desired feature).

## 4. User Interface (UI) Layout

The application presents a single-page interface divided into the following logical sections:

1.  **Configuration Area (Top):**
    *   **API Provider Selector:** Dropdown menu (`<select id="api-provider">`) to choose the AI service provider (e.g., "Together.ai").
    *   **API Key Input:** Text input field (`<input type="password" id="api-key">`) for the selected provider's API key. The input type should be "password" to mask the key.
    *   **Save API Key Button:** Button (`<button id="save-key">`) to save the entered API key to local storage.
    *   **Model Selector:** Dropdown menu (`<select id="model-selector">`) populated with models available from the selected provider.
    *   **Temperature Control:** UI element (e.g., `<input type="range">` or `<input type="number">`, referred to as `temperatureInput` in code) to set the generation temperature. Displays the current value. Defaults based on the selected model.

2.  **System Prompt Area:**
    *   **System Prompt Textarea:** Multi-line text input (`<textarea id="system-prompt-textarea">`) for entering the system prompt.
    *   **Save System Prompt Button:** Button (`<button id="save-system-prompt">`) to save the current system prompt content to local storage.
    *   **Reset System Prompt Button:** Button (`<button id="reset-system-prompt">`) to restore the system prompt to its default value and save it.

3.  **Chat History Area:**
    *   **Chat History Display:** A scrollable container (`<div id="chat-history">`) displaying the sequence of user and AI messages.
        *   Each message should clearly indicate the sender (e.g., "You", "AI") or role (`user`, `assistant`).
        *   Messages should be visually distinct (e.g., alignment, background color).
        *   AI messages must include an "Edit" button.

4.  **User Input Area (Bottom):**
    *   **User Input Textarea:** Multi-line text input (`<textarea id="user-input">`) for composing user messages. Should dynamically resize based on content.
    *   **Send Button:** Button (`<button id="send-button">`) to send the message composed in the user input textarea.

5.  **Status Area:**
    *   **Status Message Display:** A designated area (`<div id="status-message">`) to show feedback to the user (e.g., "Processing...", "API Key saved.", "Error: ...").

## 5. Detailed Functional Requirements

### 5.1. Initialization (`init` function)

*   On load, the application must:
    *   Retrieve stored state from local storage: `apiKeys`, `currentProvider`, `messages`, `currentSystemPromptContent`, selected model ID, temperature.
    *   Populate the API Provider Selector (`apiProviderSelector`) based on the `PROVIDERS` configuration.
    *   Set the selected provider in the dropdown based on the loaded `currentProvider` or a default.
    *   Populate the Model Selector (`modelSelector`) based on the models available for the `currentProvider`.
    *   Set the selected model based on the loaded state or a default for the provider.
    *   Display the stored API key (masked) for the `currentProvider` in the `apiKeyInput` if available.
    *   Set the `temperatureInput` value based on loaded state or the default for the selected model.
    *   Load the `currentSystemPromptContent` into the `systemPromptTextarea`, using `DEFAULT_SYSTEM_MESSAGE.content` if none is stored.
    *   Render the stored `messages` array into the `chatHistory` display area.
    *   Attach all necessary event listeners (see below).

### 5.2. API Configuration

*   **Provider Selection:**
    *   Changing the selection in `apiProviderSelector` should:
        *   Update the `currentProvider` state variable.
        *   Save the new `currentProvider` to local storage.
        *   Update the `modelSelector` options based on the new provider's models.
        *   Attempt to load and display the API key for the newly selected provider from `apiKeys` in local storage.
        *   Update the `temperatureInput` to the default for the first model of the new provider (or a saved value for that provider/model if implemented).
*   **API Key Management:**
    *   The `apiKeyInput` field should always have `type="password"`.
    *   Clicking `saveKeyBtn` should:
        *   Retrieve the key from `apiKeyInput`.
        *   Store the key in the `apiKeys` object in local storage, using a provider-specific key name (e.g., `togetherApiKey` generated by `provider.apiKeyName`).
        *   Display a confirmation message in `statusMessage`.

### 5.3. Model and Temperature Selection

*   **Model Selection:**
    *   Changing the selection in `modelSelector` should:
        *   Update the application state with the selected model ID.
        *   Save the selected model ID to local storage.
        *   Update the `temperatureInput` value to the `defaultTemperature` of the selected model (`provider.getModel(selectedModelId).defaultTemperature`).
*   **Temperature Control:**
    *   Changing the value in `temperatureInput` should:
        *   Update the application state with the new temperature value.
        *   Save the new temperature value to local storage.
        *   The value should be used in subsequent API calls (`prepareRequestBody`).

### 5.4. System Prompt Management

*   The `systemPromptTextarea` displays the `currentSystemPromptContent`.
*   Clicking `saveSystemPromptBtn` should:
    *   Update `currentSystemPromptContent` with the textarea's current value.
    *   Save the new `currentSystemPromptContent` to local storage.
    *   Display a confirmation message.
*   Clicking `resetSystemPromptBtn` should:
    *   Set the `systemPromptTextarea` value and `currentSystemPromptContent` to `DEFAULT_SYSTEM_MESSAGE.content`.
    *   Save the default content to local storage.
    *   Display a confirmation message.
*   The current `currentSystemPromptContent` must be included as the first message with `role: 'system'` in the `messages` array sent to the AI API.

### 5.5. Chat Interaction

*   **Sending a Message:**
    *   Triggered by clicking `sendButton` or pressing Enter in `userInput` (unless Shift+Enter).
    *   If `isProcessing` is true, do nothing.
    *   If `userInput` is empty, do nothing.
    *   Set `isProcessing` to true.
    *   Disable `userInput` and `sendButton`.
    *   Display "Processing..." in `statusMessage`.
    *   Get the user's message text from `userInput`.
    *   Clear `userInput`.
    *   Create a user message object: `{ role: 'user', content: messageText }`.
    *   Add the user message object to the `messages` array.
    *   Render the user message in `chatHistory`.
    *   Save the updated `messages` array to local storage.
    *   Prepare the message history for the API call: include the system prompt message and the current `messages` array.
    *   Call the AI provider's API using the configured endpoint, API key, selected model, temperature, max tokens, and prepared messages (using `provider.prepareRequestBody`).
    *   Handle the API response (see below).
    *   Handle API errors (see below).
*   **Receiving a Message:**
    *   On successful API response:
        *   Extract the AI's response content.
        *   Create an assistant message object: `{ role: 'assistant', content: aiResponseText }`.
        *   Add the assistant message object to the `messages` array.
        *   Render the assistant message in `chatHistory`, including an "Edit" button.
        *   Save the updated `messages` array to local storage.
        *   Clear `statusMessage`.
        *   Set `isProcessing` to false.
        *   Enable `userInput` and `sendButton`.
        *   Scroll `chatHistory` to the bottom.
*   **Editing an AI Message:**
    *   Each AI message in `chatHistory` has an "Edit" button.
    *   Clicking "Edit":
        *   Find the corresponding message object in the `messages` array (e.g., using a data attribute on the HTML element).
        *   Replace the message display element with a `<textarea>` pre-filled with the message's current `content` and a "Save" button.
    *   Clicking "Save" (associated with the editing textarea):
        *   Get the updated text from the textarea.
        *   Update the `content` of the corresponding message object in the `messages` array.
        *   Save the updated `messages` array to local storage.
        *   Re-render the message display element with the updated content and the "Edit" button.
*   **Message Display:**
    *   Messages in `chatHistory` should be clearly distinguishable (user vs. assistant).
    *   Content should be rendered preserving line breaks.

### 5.6. State Management & Persistence

*   The following state must be persisted in `localStorage`:
    *   `apiKeys`: An object mapping provider-specific key names (e.g., `togetherApiKey`) to the actual keys.
    *   `currentProvider`: The ID of the currently selected AI provider.
    *   `messages`: The array of chat message objects (`{ role: 'user' | 'assistant', content: string }`). Note: System prompt is handled separately for persistence but included dynamically for API calls.
    *   `systemPrompt`: The content of the user-defined system prompt (`currentSystemPromptContent`).
    *   `selectedModelId`: The ID of the currently selected model.
    *   `temperature`: The current temperature setting.
*   State should be loaded upon application initialization.
*   State should be saved whenever a relevant action occurs (e.g., sending/editing a message, saving API key, changing provider/model/temperature, saving system prompt).

### 5.7. Status and Error Handling

*   Use `statusMessage` to provide positive feedback (e.g., "Processing...", "API Key Saved", "System Prompt Saved").
*   Use APP messages to display errors inline with the chat. Users will generally delete these after reading. * * * *	Undeleted APP messages are filtered out when sending the chat history and new prompt to the provider. 

### 5.8. Clear Chat

*   A "Clear Chat" button should be present.
*   Clicking it should:
    *   Clear the `messages` array in the application state.
    *   Clear the `messages` array in local storage.
    *   Remove all message elements from the `chatHistory` display.
    *   Optionally clear the `userInput` field.
    *   It should *not* clear API keys, provider/model selection, temperature, or the system prompt.

### 5.9. (Planned) Import/Export

*   **Export:**
    *   A button ("Export Chat") should trigger the export process.
    *   The application should gather the current state (`messages`, `systemPrompt`, `currentProvider`, `selectedModelId`, `temperature`).
    *   This state should be bundled into a JSON object.
    *   The JSON object should be offered to the user as a downloadable file (e.g., `rpchat_session.json`).
*   **Import:**
    *   A button ("Import Chat") alongside a file input element (`<input type="file">`) should allow users to select a previously exported JSON file.
    *   Upon file selection and confirmation:
        *   The application should parse the JSON file.
        *   Validate the structure of the imported data.
        *   Update the application state (`messages`, `systemPrompt`, `currentProvider`, `selectedModelId`, `temperature`) with the imported values.
        *   Update the UI accordingly (render messages, set selectors, update textareas/inputs).
        *   Save the imported state to local storage.
        *   Handle potential parsing or validation errors gracefully.

## 6. Non-Functional Requirements

*   **Security:** API keys must only be stored in the user's browser local storage and sent directly to the respective AI provider's API endpoint over HTTPS. They should never be sent to any other server.
*   **Usability:** The interface should be intuitive and responsive. Visual feedback should be provided for ongoing operations and state changes.
*   **Maintainability:** (Guiding the rewrite) Code should be modular, well-commented, and follow consistent coding standards. Utilize component-based architecture if possible.
*   **Performance:** The UI should remain responsive even during API calls. Rendering large chat histories should be reasonably efficient.

## 7. Data Model Summary

*   **LocalStorage Keys:**
    *   `apiKeys`: JSON string representing an object: `{ "[providerId]ApiKey": "key_string", ... }`
    *   `apiProvider`: String (e.g., `"together"`)
    *   `chatMessages`: JSON string representing an array: `[{ role: "user" | "assistant", content: "string" }, ...]`
    *   `systemPrompt`: String
    *   `selectedModelId`: String (e.g., `"meta-llama/Llama-3-8b-chat-hf"`)
    *   `temperature`: Number (as a string in localStorage)
*   **Core In-Memory State:**
    *   `messages`: Array of message objects: `{ role: 'user' | 'assistant', content: string }`
    *   `apiKeys`: Object: `{ "[providerId]ApiKey": "key_string", ... }`
    *   `currentProvider`: String
    *   `currentSystemPromptContent`: String
    *   `isProcessing`: Boolean
*   **Configuration Objects (from `config.js`):**
    *   `AIProvider`: Class instance with `id`, `displayName`, `endpoint`, `models` (array of `AIModel`), `defaultMaxTokens`, `apiKeyName` getter, `getModel` method, `prepareRequestBody` method.
    *   `AIModel`: Class instance with `id`, `displayName`, `defaultTemperature`.
    *   `PROVIDERS`: Map storing `AIProvider` instances keyed by `id`.
    *   `DEFAULT_SYSTEM