# RPChat - Editable AI Chat Client

RPChat is a flexible chat interface for roleplaying with AI language models. It allows you to edit both your messages and AI responses, providing full control over the conversation context.
## Getting Started
- Clone this repository or download the files
- Open index.html in your browser
- Select your preferred AI provider from the dropdown
- Enter your API key for the selected provider and click "Save Key"
- Select a model and adjust the temperature as needed
- Use your first prompt to define roles for yourself and the AI
- - It can be as simple 'You are Jack and I am Jill' 
- - or complex as you like with fully fleshed out characters and scenario.
- - The AI will respond as the character you defined for it.
- Start chatting!

## Features
### Multiple AI Provider Support Built in:
- DeepSeek
- Together.ai
- Google Gemini
### Extensible
All the CSS, HTML and JavaScript is bundled into a single file you can edit and customize.

- Add support for new AI providers by editing the PROVIDERS object in the script.
- - New providers must have endpoints that implement a basic  OpenAI compatible chat API.
- Edit any message (system, user, or assistant)	
- Delete single messages or delete from a specific point
- Collapsible system prompts
### Rich Message Controls:
- Edit any message (system, user, or assistant)
- Delete single messages or delete from a specific point
### Model Control:
- Temperature adjustment for controlling response randomness
- Model selection for each provider
- Editable system prompts
- Make changes at any point in the conversation
### Data Management:
- Import/Export chat sessions as JSON files.
- Session persistence across page refreshes
- Convenient API key storage in browser
### Privacy-Focused:
- All data stored locally in your browser
- API keys never sent to any server except the respective AI provider
## Usage
### Requirements
- A modern browser (tested on Chrome, Firefox, and Edge)
- An API key for each AI provider you use.
### Basic Operation
- Type in the chat area and click "Send" to submit your message
- The AI will respond based on the conversation context
### Editing and Controls
- Click the 🖊️ (edit) button on any message to modify its content
- Click the 🗑️ (delete) button to remove a single message
- For user messages, click the 🗑️⬇️ (delete from here) button to remove all subsequent messages
- System prompts can be collapsed/expanded using the toggle button
### Session Management
- Click "Clear" to start a new conversation (retaining your system prompt)
- Click "Export" to save your current chat as a JSON file
- Click "Import" to load a previously exported chat
### Configuration
- Change the AI provider using the dropdown at the top
- Select different models based on your chosen provider
- Adjust the "Temperature" slider to control response randomness (higher values = more creative/random)
### System Prompts
RPChat comes with a default system prompt optimized for roleplaying scenarios. You can edit this prompt by clicking the edit button on the system message at the beginning of the conversation.

## Privacy
Your API keys and chat history are stored only in your browser's local storage and are never sent to any server other than the AI provider APIs for processing your messages. Please note that while your data is kept private, the AI providers may still have access to your messages for training their models. Also note that saving API keys in your browser's local storage is secure as long as no third-party libraries are introduced into the application. 

## License
MIT
