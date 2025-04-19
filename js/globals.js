// DOM elements
const header = document.querySelector('header');
const apiKeyInput = document.getElementById('api-key');
const saveKeyBtn = document.getElementById('save-key');
const modelSelector = document.getElementById('model-selector');
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const statusMessage = document.getElementById('status-message');
const apiProviderSelector = document.getElementById('api-provider');
const systemPromptContainer = document.getElementById('system-prompt-container');
const systemPromptTextarea = document.getElementById('system-prompt-textarea');
const saveSystemPromptBtn = document.getElementById('save-system-prompt');
const resetSystemPromptBtn = document.getElementById('reset-system-prompt');
let temperatureInput; // Declare but don't assign yet


// Show status message
function showStatus(message, type = '') {
	statusMessage.textContent = message;
	statusMessage.className = type;

	// Clear status after 2 seconds
	setTimeout(() => {
		statusMessage.textContent = '';
		statusMessage.className = '';
	}, 2999);
}

class ChatMessage {
	constructor(role, content) {
		this.role = role; // one 'user', or 'assistant'
		if (!['user', 'assistant'].includes(role)) {
			throw new Error('Invalid role: must be "user", or "assistant"');
		}
		this.content = content; // string
		this.id = Date.now();
	}
}

class ChatMessages {
	constructor(systemPrompt = '') {
		this.messages = [];
		this.systemPrompt = systemPrompt;
	}

	addMessage(role, content) {
		const message = new ChatMessage(role, content);
		this.messages.push(message);
	}

	getMessages() {
		return this.messages.map(message => ({
			role: message.role,
			content: message.content,
			id: message.id,
		}));
	}
	deleteMessage(id) {
		this.messages = this.messages.filter(message => message.id !== id);
	}
	deleteFrom(startIndex) {
		this.messages = this.messages.slice(0, startIndex);
	}
	getSystemPrompt() {
		return this.systemPrompt;
	}
	setSystemPrompt(systemPrompt) {
		this.systemPrompt = systemPrompt;
	}
	clearMessages() {
		this.messages = [];
	}
	replaceMessages(json) {
		this.messages = JSON.parse(json).map(message => new ChatMessage(message.role, message.content));
	}
}
// Holds all chat messages for a single instance, i.e. a session in a browser tab
class Instance {
	constructor(systemPrompt, id) {
		this.chatMessages = new ChatMessages(systemPrompt);
		this.instanceId = id;
	}

	toJSON() {
		return {
			chatMessages: {
				messages: this.chatMessages.getMessages(),
				systemPrompt: this.chatMessages.getSystemPrompt()
			},
			instanceId: this.instanceId
		};
	}

	static fromJSON(json) {
		const parsedData = typeof json === 'string' ? JSON.parse(json) : json;
		const instance = new Instance(parsedData.chatMessages.systemPrompt, parsedData.instanceId);

		// Recreate messages from saved data
		if (parsedData.chatMessages.messages) {
			parsedData.chatMessages.messages.forEach(msg => {
				instance.chatMessages.addMessage(msg.role, msg.content);
			});
		}

		return instance;
	}
}
// Save instance to sessionStorage
function saveTabInstance(instance) {
	const serializedInstance = JSON.stringify(instance)
	sessionStorage.setItem('tabInstance', serializedInstance)
}

// Restore instance on page load
function restoreTabInstance() {
	const serializedInstance = sessionStorage.getItem('tabInstance')
	if (serializedInstance) {
		return serializedInstance; // Return the serialized string, not parsed JSON
	}
	return null
}

// Set up saving before page unload
function setupInstancePersistence(instance) {
	window.addEventListener('beforeunload', () => {
		saveTabInstance(instance)
	})

	// Try to restore on page load
	const savedInstance = restoreTabInstance()
	if (savedInstance) {
		// Use the static fromJSON method to properly reconstruct the instance
		return Instance.fromJSON(savedInstance)
	}

	return instance
}// Add message rendering functionality
function renderMessage(message, index) {
	const messageElement = document.createElement('div');
	messageElement.classList.add('message', message.role);
	messageElement.dataset.id = message.id;
	messageElement.dataset.index = index;

	const contentElement = document.createElement('div');
	contentElement.classList.add('content');
	contentElement.textContent = message.content;

	const controlsElement = document.createElement('div');
	controlsElement.classList.add('message-controls');

	// Add edit/delete buttons for message control
	if (message.role === 'assistant') {
		const editButton = document.createElement('button');
		editButton.textContent = 'Edit';
		editButton.onclick = () => startEditingMessage(message.id);
		controlsElement.appendChild(editButton);
	}

	const deleteButton = document.createElement('button');
	deleteButton.textContent = 'Delete';
	deleteButton.onclick = () => deleteMessageAndFollowing(index);
	controlsElement.appendChild(deleteButton);

	messageElement.appendChild(contentElement);
	messageElement.appendChild(controlsElement);

	return messageElement;
}

// Add a function to refresh the chat display
function initChatInstance() {
	// Get system prompt from storage or use default
	const savedSystemPrompt = localStorage.getItem('systemPrompt') || DEFAULT_SYSTEM_MESSAGE;

	// Create a new instance with a unique ID
	const chatInstance = new Instance(savedSystemPrompt, Date.now().toString());

	// Set up persistence
	return setupInstancePersistence(chatInstance);
}