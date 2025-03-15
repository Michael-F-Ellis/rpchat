// DOM elements
const apiKeyInput = document.getElementById('api-key');
const saveKeyBtn = document.getElementById('save-key');
const modelSelector = document.getElementById('model-selector');
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const statusMessage = document.getElementById('status-message');

// State
let apiKey = localStorage.getItem('togetherApiKey') || '';
let messages = [];
let isProcessing = false;

// Initialize app
function init() {
	if (apiKey) {
		apiKeyInput.value = '********'; // Don't show the actual key for security
		statusMessage.textContent = 'API key loaded from storage';
	}

	// Load chat history from localStorage if available
	const savedMessages = localStorage.getItem('chatHistory');
	if (savedMessages) {
		messages = JSON.parse(savedMessages);
		renderMessages();
	}

	// Event listeners
	saveKeyBtn.addEventListener('click', saveApiKey);
	sendButton.addEventListener('click', sendMessage);
	userInput.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	});
}

// Save API key to localStorage
function saveApiKey() {
	const key = apiKeyInput.value.trim();
	if (key && key !== '********') {
		apiKey = key;
		localStorage.setItem('togetherApiKey', apiKey);
		apiKeyInput.value = '********';
		showStatus('API key saved successfully', 'success');
	} else if (key === '') {
		// Clear API key if empty
		apiKey = '';
		localStorage.removeItem('togetherApiKey');
		showStatus('API key removed', 'success');
	}
}

// Show status message
function showStatus(message, type = '') {
	statusMessage.textContent = message;
	statusMessage.className = type;

	// Clear status after 3 seconds
	setTimeout(() => {
		statusMessage.textContent = '';
		statusMessage.className = '';
	}, 3000);
}

// Send message to Together.ai API
async function sendMessage() {
	const text = userInput.value.trim();
	if (!text || isProcessing) return;

	if (!apiKey) {
		showStatus('Please enter your Together.ai API key', 'error');
		return;
	}

	isProcessing = true;
	showStatus('Sending message...');

	// Add user message to chat
	addMessage('user', text);
	userInput.value = '';

	try {
		const model = modelSelector.value;
		const response = await fetchAIResponse(text, model);

		if (response) {
			addMessage('assistant', response);
		}

		showStatus('Message sent successfully', 'success');
	} catch (error) {
		console.error('Error sending message:', error);
		showStatus(`Error: ${error.message}`, 'error');
	} finally {
		isProcessing = false;
	}
}

// Fetch response from Together.ai API
async function fetchAIResponse(userMessage, model) {
	const url = 'https://api.together.xyz/v1/chat/completions';

	// Prepare messages for API
	const apiMessages = [...messages.map(msg => ({
		role: msg.role,
		content: msg.content
	}))];

	// Add the latest user message
	apiMessages.push({
		role: 'user',
		content: userMessage
	});

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: model,
				messages: apiMessages,
				max_tokens: 1000,
				temperature: 0.7
			})
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message || 'Unknown error occurred');
		}

		const data = await response.json();
		return data.choices[0].message.content;
	} catch (error) {
		console.error('API Error:', error);
		throw error;
	}
}

// Add message to chat history
function addMessage(role, content) {
	const message = { role, content, id: Date.now() };
	messages.push(message);

	// Update UI
	renderMessages();

	// Save to localStorage
	localStorage.setItem('chatHistory', JSON.stringify(messages));

	// Scroll to bottom
	chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Render all messages
function renderMessages() {
	chatHistory.innerHTML = '';

	messages.forEach((message) => {
		const messageEl = createMessageElement(message);
		chatHistory.appendChild(messageEl);
	});
}

// Create a single message element
function createMessageElement(message) {
	const messageEl = document.createElement('div');
	messageEl.className = `message ${message.role}-message`;
	messageEl.dataset.id = message.id;

	const contentEl = document.createElement('div');
	contentEl.className = 'editable-content';
	contentEl.textContent = message.content;

	messageEl.appendChild(contentEl);

	// Add edit controls
	const controlsEl = document.createElement('div');
	controlsEl.className = 'message-controls';

	const editBtn = document.createElement('button');
	editBtn.className = 'edit-message';
	editBtn.textContent = 'Edit';
	editBtn.addEventListener('click', () => startEditing(message.id));

	controlsEl.appendChild(editBtn);

	messageEl.appendChild(controlsEl);

	return messageEl;
}

// Start editing a message
function startEditing(messageId) {
	const messageEl = document.querySelector(`.message[data-id="${messageId}"]`);
	const contentEl = messageEl.querySelector('.editable-content');
	const controlsEl = messageEl.querySelector('.message-controls');

	// Make content editable
	contentEl.contentEditable = true;
	contentEl.focus();

	// Change controls
	controlsEl.innerHTML = '';

	const saveBtn = document.createElement('button');
	saveBtn.className = 'save-edit';
	saveBtn.textContent = 'Save';
	saveBtn.addEventListener('click', () => saveEdit(messageId));

	const cancelBtn = document.createElement('button');
	cancelBtn.className = 'cancel-edit';
	cancelBtn.textContent = 'Cancel';
	cancelBtn.addEventListener('click', () => cancelEdit(messageId));

	controlsEl.appendChild(saveBtn);
	controlsEl.appendChild(cancelBtn);

	// Place cursor at the end
	const range = document.createRange();
	const selection = window.getSelection();
	range.selectNodeContents(contentEl);
	range.collapse(false);
	selection.removeAllRanges();
	selection.addRange(range);
}

// Save edited message
function saveEdit(messageId) {
	const messageEl = document.querySelector(`.message[data-id="${messageId}"]`);
	const contentEl = messageEl.querySelector('.editable-content');
	const newContent = contentEl.textContent.trim();

	// Update message in array
	const messageIndex = messages.findIndex(msg => msg.id === messageId);
	if (messageIndex !== -1) {
		messages[messageIndex].content = newContent;
		localStorage.setItem('chatHistory', JSON.stringify(messages));
	}

	// Reset UI
	contentEl.contentEditable = false;

	// Restore normal controls
	resetMessageControls(messageId);

	showStatus('Message updated successfully', 'success');
}

// Cancel editing
function cancelEdit(messageId) {
	const messageEl = document.querySelector(`.message[data-id="${messageId}"]`);
	const contentEl = messageEl.querySelector('.editable-content');

	// Get original content
	const messageIndex = messages.findIndex(msg => msg.id === messageId);
	if (messageIndex !== -1) {
		contentEl.textContent = messages[messageIndex].content;
	}

	// Reset UI
	contentEl.contentEditable = false;

	// Restore normal controls
	resetMessageControls(messageId);
}

// Reset message controls after editing
function resetMessageControls(messageId) {
	const messageEl = document.querySelector(`.message[data-id="${messageId}"]`);
	const controlsEl = messageEl.querySelector('.message-controls');

	// Clear existing controls
	controlsEl.innerHTML = '';

	// Add edit button
	const editBtn = document.createElement('button');
	editBtn.className = 'edit-message';
	editBtn.textContent = 'Edit';
	editBtn.addEventListener('click', () => startEditing(messageId));

	controlsEl.appendChild(editBtn);
}

// Clear chat history
function clearChat() {
	if (confirm('Are you sure you want to clear the chat history?')) {
		messages = [];
		localStorage.removeItem('chatHistory');
		renderMessages();
		showStatus('Chat history cleared', 'success');
	}
}

// Add a clear chat button to the UI
function addClearChatButton() {
	const header = document.querySelector('header');
	const clearBtn = document.createElement('button');
	clearBtn.id = 'clear-chat';
	clearBtn.textContent = 'Clear Chat';
	clearBtn.addEventListener('click', clearChat);
	header.appendChild(clearBtn);
}

// Initialize the app
init();
addClearChatButton();