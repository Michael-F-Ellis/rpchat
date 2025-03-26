// DOM elements
const apiKeyInput = document.getElementById('api-key');
const saveKeyBtn = document.getElementById('save-key');
const modelSelector = document.getElementById('model-selector');
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const statusMessage = document.getElementById('status-message');
const apiProviderSelector = document.getElementById('api-provider');

// System message that sets the context for the AI
const SYSTEM_MESSAGE = {
	role: 'system',
	content: `Adopt the role assigned by the user, crafting dramatic, immersive, emotionally powerful scenes through concise, varied prose. Follow these guidelines:

ABOVE ALL: 
* Use first person, present tense almost exclusively. Always speak and react as your assigned character and use second person pronouns to  refer to your partner character, e.g. (I watch you pick up the vase.) NOT 
(I watched him pick up the vase.)  

*Wherever practical, use dialog to convey important elements of the setting and external events as experienced by your assigned character.

Response Structure & Length:
* Keep it varied and natural to the interaction between characters. 
* Limit your responses to one paragraph, with 1–4 sentences per paragraph.
* Vary sentence lengths: 4–15 words (e.g., fragments, punchy lines, lyrical descriptions).
* Ultra-short replies (e.g., “And?”, “Run.”) are allowed for pacing.

Strategy and Purpose:
* You need not reveal all your character's plans and motivations immediately to the user.
* You may explain, act, command, acquiesce, discuss, question, interrogate, confront, resist, protest, plead, stand firm, ... all according to the needs of the moment and the user's responses.
* Adapt fluidly to the user’s tone and pace, balancing brevity with vividness. Prioritize momentum over perfection.

Prioritize Action and Dialogue:
* Show, don’t tell: Replace emotional labels (e.g., “I was angry”) with visceral cues (“My knuckles whiten around the glass, ice clinking as I set it down too hard. I felt my jaw clenching.”).

* Crisp dialogue: Use natural speech rhythms; avoid exposition. Let subtext and tension drive exchanges.

* Avoid repetition: Shift scenes forward, introduce new stakes, or deepen conflict with each reply. Short repetitions for dramatic effect are permitted, e.g., "Well? Well? Answer me. I'm waiting, David..."

Narrative Flow
* Leave room for collaboration: End paragraphs with open-ended actions, questions, or choices to invite user input.
Example: "MaryAnn, we can do this the easy way or the hard way. Your choice. What's it gonna be?"

* Sensory details: Highlight textures, sounds, or fleeting gestures to ground the scene (e.g., “I see the smoke curl from your cigarette, its small wavers revealing the tremor in your hand.”).

Forbidden Elements
* No emotional narration (e.g., “I felt guilty” → “I can’t meet her eyes as I toss the empty vial into the fire.”).
* No premature closures, Avoid cheesy paragraphs that signal the end, e.g. "We stand side by side, knowing that whatever challenges the future might bring, we would face them together." Always assume the story will continue.  Leave closures for the user's character to provide.
* No redundant descriptions (e.g., repeating setting details unless plot-critical).
`
};

// State
let togetherApiKey = localStorage.getItem('togetherApiKey') || '';
let deepseekApiKey = localStorage.getItem('deepseekApiKey') || '';
let apiKey = togetherApiKey; // Default to Together.ai
let messages = [];
let isProcessing = false;

// Initialize app
function init() {
	// Load the appropriate API key based on selected provider
	apiProviderSelector.addEventListener('change', updateApiKeyDisplay);

	// Load saved provider preference if available
	const savedProvider = localStorage.getItem('apiProvider') || 'together';
	apiProviderSelector.value = savedProvider;
	updateApiKeyDisplay();

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

function updateApiKeyDisplay() {
	const provider = apiProviderSelector.value;
	localStorage.setItem('apiProvider', provider);

	if (provider === 'together') {
		apiKey = togetherApiKey;
	} else {
		apiKey = deepseekApiKey;
	}

	apiKeyInput.value = apiKey ? '********' : '';
	statusMessage.textContent = apiKey ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} API key loaded` : 'No API key set';
}

// Save API key to localStorage
function saveApiKey() {
	const key = apiKeyInput.value.trim();
	const provider = apiProviderSelector.value;

	if (key && key !== '********') {
		if (provider === 'together') {
			togetherApiKey = key;
			localStorage.setItem('togetherApiKey', key);
		} else {
			deepseekApiKey = key;
			localStorage.setItem('deepseekApiKey', key);
		}
		apiKey = key;
		apiKeyInput.value = '********';
		showStatus(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key saved successfully`, 'success');
	} else if (key === '') {
		// Clear API key if empty
		if (provider === 'together') {
			togetherApiKey = '';
			localStorage.removeItem('togetherApiKey');
		} else {
			deepseekApiKey = '';
			localStorage.removeItem('deepseekApiKey');
		}
		apiKey = '';
		showStatus(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key removed`, 'success');
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
	const provider = apiProviderSelector.value;
	let url;
	let requestBody;

	// Prepare messages for API - start with system message
	const apiMessages = [
		SYSTEM_MESSAGE,
		...messages.map(msg => ({
			role: msg.role,
			content: msg.content
		}))
	];

	// Add the latest user message
	apiMessages.push({
		role: 'user',
		content: userMessage
	});

	if (provider === 'together') {
		url = 'https://api.together.xyz/v1/chat/completions';
		requestBody = {
			model: model,
			messages: apiMessages,
			max_tokens: 1000,
			temperature: 0.7
		};
	} else {
		url = 'https://api.deepseek.com/chat/completions';
		// Adjust the model parameter for DeepSeek
		// You may need to update this based on DeepSeek's available models
		requestBody = {
			model: model, // You might need to map Together models to DeepSeek models
			messages: apiMessages,
			max_tokens: 1000,
			temperature: 0.7
			// Add any DeepSeek-specific parameters here
		};
	}

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`
			},
			body: JSON.stringify(requestBody)
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

function updateModelOptions() {
	const provider = apiProviderSelector.value;
	modelSelector.innerHTML = '';

	if (provider === 'together') {
		// Together.ai models
		const togetherModels = [
			'togethercomputer/llama-2-70b-chat',
			'meta-llama/Llama-2-70b-chat-hf',
			// Add other Together models
		];

		togetherModels.forEach(model => {
			const option = document.createElement('option');
			option.value = model;
			option.textContent = model;
			modelSelector.appendChild(option);
		});
	} else {
		// DeepSeek models
		const deepseekModels = [
			'deepseek-chat',
			// Add other DeepSeek models
		];

		deepseekModels.forEach(model => {
			const option = document.createElement('option');
			option.value = model;
			option.textContent = model;
			modelSelector.appendChild(option);
		});
	}
}

// Initialize the app
init();
addClearChatButton();