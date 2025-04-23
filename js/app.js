// Main application code for RPChat using ChatManager and ChatMessage components

// Define state variables
let apiKeys = {};
let currentProvider = null;
let selectedModelId = null;
let temperature = null;
let isProcessing = false;
let chatManager = null;

// DOM element references
const elements = {
	apiProviderSelector: document.getElementById('api-provider'),
	apiKeyInput: document.getElementById('api-key'),
	saveKeyBtn: document.getElementById('save-key'),
	modelSelector: document.getElementById('model-selector'),
	temperatureInput: document.getElementById('temperature-input'),
	chatContainer: document.getElementById('chat-container'),
	sendButton: document.getElementById('send-button'),
	clearChatBtn: document.getElementById('clear-chat'),
	statusMessage: document.getElementById('status-message')
};

// Initialize application
function init() {	// Load saved state from localStorage
	loadStateFromStorage();

	// Set up UI elements based on configuration
	initializeUIElements();

	// Initialize ChatManager with system prompt
	initializeChatManager();

	// Attach event listeners
	attachEventListeners();

	// Show initialization status
	showStatus('Application initialized');

	// Initialize import/export functionality
	initImportExport();
}

// Set up import/export functionality
function initImportExport() {
	// Set up the import/export functionality
	RPChat.importExport.setupImportExport(
		chatManager,                     // Pass the entire chatManager object
		showStatus                       // Function to show status messages
	);
}

// Load state from localStorage
function loadStateFromStorage() {
	try {
		// Keep API keys in localStorage for sharing across tabs
		apiKeys = JSON.parse(localStorage.getItem('apiKeys')) || {};

		// Use sessionStorage for everything else
		currentProvider = sessionStorage.getItem('apiProvider') ||
			localStorage.getItem('apiProvider') || // fallback for existing users
			Array.from(window.RPChat.config.PROVIDERS.keys())[0];
		selectedModelId = sessionStorage.getItem('selectedModelId') ||
			localStorage.getItem('selectedModelId') || // fallback
			null;
		temperature = sessionStorage.getItem('temperature') ?
			parseFloat(sessionStorage.getItem('temperature')) :
			(localStorage.getItem('temperature') ? // fallback
				parseFloat(localStorage.getItem('temperature')) :
				null);
	} catch (error) {
		console.error('Error loading state from storage:', error);
		// Set defaults if loading fails
		currentProvider = Array.from(window.RPChat.config.PROVIDERS.keys())[0];
	}
}

// Initialize UI elements based on configuration
function initializeUIElements() {
	// Set up provider selector
	populateProviderSelector();

	// Set up model selector for the current provider
	updateModelSelector();

	// Load API key if available
	if (apiKeys[getProvider().apiKeyName]) {
		elements.apiKeyInput.value = '********'; // Show masked value
	}

	// Set temperature value
	if (temperature === null && selectedModelId) {
		const model = getProvider().getModel(selectedModelId);
		if (model) {
			temperature = model.defaultTemperature;
		}
	}

	if (temperature !== null) {
		elements.temperatureInput.value = temperature;
	}
}

// Initialize ChatManager
function initializeChatManager() {
	// Get system prompt from sessionStorage, fall back to localStorage, then default
	const systemPrompt = sessionStorage.getItem('systemPrompt') ||
		localStorage.getItem('systemPrompt') ||
		window.RPChat.config.DEFAULT_SYSTEM_MESSAGE.content;

	// Store in sessionStorage for future use
	sessionStorage.setItem('systemPrompt', systemPrompt);

	// Create ChatManager with system prompt and notification handler
	chatManager = new ChatManager(
		systemPrompt,
		showStatus,
		elements.chatContainer,
		onChatUpdate
	);

	// Try to load saved messages from sessionStorage
	try {
		const savedMessages = sessionStorage.getItem('chatMessages');
		if (savedMessages) {
			chatManager.parseMessagesJSON(savedMessages);
		} else {
			// Try localStorage as fallback for existing users
			const legacyMessages = localStorage.getItem('chatMessages');
			if (legacyMessages) {
				chatManager.parseMessagesJSON(legacyMessages);
				// Move to sessionStorage
				sessionStorage.setItem('chatMessages', legacyMessages);
			}
		}
	} catch (error) {
		console.error('Error loading saved messages:', error);
		showStatus('Failed to load saved chat messages', 'error');
	}

	// Render the chat
	chatManager.render();

	// Scroll to the bottom to show messages
	scrollToBottom();
}

// Callback for when chat is updated
function onChatUpdate() {
	// Save messages to sessionStorage
	const messagesJSON = chatManager.getMessagesJSON();
	sessionStorage.setItem('chatMessages', JSON.stringify(messagesJSON));

	// Enable/disable send button based on edit state and content
	updateSendButtonState();
}

// Update send button state based on trailing message state
function updateSendButtonState() {
	if (!elements.sendButton) return;

	const trailingMessage = chatManager.getTrailingUserMessage();

	// Disable send button if:
	// 1. Any message is being edited (besides trailing user message)
	// 2. The trailing message doesn't exist, is empty, or not being/just been edited
	if (chatManager.hasActiveEdits() ||
		!trailingMessage ||
		(!trailingMessage.isBeingEdited() && trailingMessage.content.trim() === '')) {
		elements.sendButton.disabled = true;
	} else {
		elements.sendButton.disabled = false;
	}
}

// Populate provider selector dropdown
function populateProviderSelector() {
	elements.apiProviderSelector.innerHTML = '';

	window.RPChat.config.PROVIDERS.forEach((provider, id) => {
		const option = document.createElement('option');
		option.value = id;
		option.textContent = provider.displayName;
		elements.apiProviderSelector.appendChild(option);
	});

	elements.apiProviderSelector.value = currentProvider;
}

// Update model selector based on current provider
function updateModelSelector() {
	elements.modelSelector.innerHTML = '';

	const provider = getProvider();
	if (!provider) return;

	provider.models.forEach(model => {
		const option = document.createElement('option');
		option.value = model.id;
		option.textContent = model.displayName;
		elements.modelSelector.appendChild(option);
	});

	// Set selected model
	if (selectedModelId && provider.getModel(selectedModelId)) {
		elements.modelSelector.value = selectedModelId;
	} else {
		// Select first model by default
		selectedModelId = provider.models[0]?.id;
		elements.modelSelector.value = selectedModelId;
	}

	// Update temperature based on selected model
	updateTemperature();
}

// Update temperature input based on selected model
function updateTemperature() {
	if (!selectedModelId) return;

	const model = getProvider().getModel(selectedModelId);
	if (!model) return;

	if (temperature === null) {
		temperature = model.defaultTemperature;
		elements.temperatureInput.value = temperature;
	}
}

// Get current provider object
function getProvider() {
	return window.RPChat.config.PROVIDERS.get(currentProvider);
}

// Attach event listeners to UI elements
function attachEventListeners() {
	// Provider selection
	elements.apiProviderSelector.addEventListener('change', handleProviderChange);

	// API key management
	elements.saveKeyBtn.addEventListener('click', handleSaveApiKey);

	// Model selection
	elements.modelSelector.addEventListener('change', handleModelChange);

	// Temperature control
	elements.temperatureInput.addEventListener('input', handleTemperatureChange);

	// Send button
	elements.sendButton.addEventListener('click', handleSendMessage);

	// Clear chat
	elements.clearChatBtn?.addEventListener('click', handleClearChat);

	// Add a mutation observer to detect changes to the chat container
	// This helps update the send button state when edits start/end
	if (elements.chatContainer) {
		const observer = new MutationObserver(() => {
			updateSendButtonState();
		});
		observer.observe(elements.chatContainer, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ['contenteditable']
		});
	}

	// Initial button state
	updateSendButtonState();

}

// Handle provider change
function handleProviderChange(event) {
	currentProvider = event.target.value;
	sessionStorage.setItem('apiProvider', currentProvider);

	// Update model selector for new provider
	updateModelSelector();

	// Update API key input
	if (apiKeys[getProvider().apiKeyName]) {
		elements.apiKeyInput.value = '********'; // Masked
	} else {
		elements.apiKeyInput.value = '';
	}

	showStatus(`Provider changed to ${getProvider().displayName}`);
}

// Handle saving API key
function handleSaveApiKey() {
	const apiKey = elements.apiKeyInput.value.trim();

	if (!apiKey) {
		showStatus('Please enter an API key', 'error');
		return;
	}

	const keyName = getProvider().apiKeyName;

	// Don't overwrite if user just sees the masked value
	if (apiKey !== '********') {
		apiKeys[keyName] = apiKey;
		localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
		elements.apiKeyInput.value = '********'; // Mask after saving
	}

	showStatus('API key saved successfully');
}

// Handle model change
function handleModelChange(event) {
	selectedModelId = event.target.value;
	sessionStorage.setItem('selectedModelId', selectedModelId);

	// Update temperature with model default
	const model = getProvider().getModel(selectedModelId);
	if (model) {
		temperature = model.defaultTemperature;
		elements.temperatureInput.value = temperature;
		sessionStorage.setItem('temperature', temperature);
	}

	showStatus(`Model changed to ${model?.displayName || selectedModelId}`);
}

// Handle temperature change
function handleTemperatureChange(event) {
	temperature = parseFloat(event.target.value);
	sessionStorage.setItem('temperature', temperature);
}

// Handle send button click
function handleSendMessage() {
	// Check if any message is being edited (other than the trailing one)
	if (chatManager.hasActiveEdits()) {
		showStatus('Please save or cancel any active edits before sending', 'error');
		return;
	}

	// Get the trailing user message
	const trailingMessage = chatManager.getTrailingUserMessage();
	if (!trailingMessage || trailingMessage.content.trim() === '') {
		showStatus('Please enter a message before sending', 'error');
		return;
	}

	// If the trailing message is still in edit mode, save it first
	if (trailingMessage.isBeingEdited()) {
		trailingMessage.saveEdit();
	}

	sendMessage(trailingMessage.content);
}

// Send message to API
function sendMessage(content) {
	if (isProcessing) return;

	if (!content || content.trim() === '') {
		showStatus('Cannot send empty message', 'error');
		return;
	}

	const provider = getProvider();
	const apiKey = apiKeys[provider.apiKeyName];

	if (!apiKey) {
		showStatus('Please enter and save an API key first', 'error');
		return;
	}

	// Start processing
	isProcessing = true;
	elements.sendButton.disabled = true;
	showStatus('Processing...');

	// Get messages for API (ChatManager gives us properly formatted messages)
	const apiMessages = chatManager.getMessagesJSON();

	// Call API
	callAPI(apiMessages);
}

// Call AI provider API
function callAPI(apiMessages) {
	const provider = getProvider();
	const apiKey = apiKeys[provider.apiKeyName];

	// Prepare request body
	const requestBody = provider.prepareRequestBody(
		selectedModelId,
		apiMessages,
		null, // use default max tokens
		temperature
	);

	// Make API call using the API module
	window.RPChat.api.sendRequest(
		provider.endpoint,
		apiKey,
		requestBody,
		handleApiResponse,
		handleApiError
	);
}

// Handle successful API response
function handleApiResponse(response) {
	isProcessing = false;
	elements.sendButton.disabled = false;

	try {
		// Extract AI response content
		const responseContent = window.RPChat.api.extractResponseContent(response);

		// Add assistant message using ChatManager
		chatManager.addMessage(ROLES.ASSISTANT, responseContent);

		// Explicitly render the chat to update the UI
		chatManager.render();

		// Scroll to the bottom to show new message
		scrollToBottom();

		showStatus('Response received');
	} catch (error) {
		handleApiError(error);
	}
}

// Handle API errors
function handleApiError(error) {
	isProcessing = false;
	elements.sendButton.disabled = false;

	console.error('API Error:', error);

	// Create app message for error
	chatManager.addMessage(ROLES.APP, `Error: ${error.message || 'Unknown error occurred'}`);

	// Explicitly render the chat to update the UI
	chatManager.render();

	// Scroll to the bottom to show new message
	scrollToBottom();

	showStatus('Error occurred while calling API', 'error');
}

// Handle clear chat button
function handleClearChat() {
	if (confirm('Are you sure you want to clear the chat history?')) {
		// Create a new ChatManager with the same system prompt
		const systemPrompt = chatManager.getSystemPrompt();
		chatManager = new ChatManager(
			systemPrompt,
			showStatus,
			elements.chatContainer,
			onChatUpdate
		);

		// Clear sessionStorage (except system prompt and settings)
		sessionStorage.removeItem('chatMessages');

		// Render empty chat
		chatManager.render();

		showStatus('Chat cleared');
	}
}

// Show status message and use as notification handler for ChatManager
function showStatus(message, type = 'info') {
	if (!elements.statusMessage) return;

	elements.statusMessage.textContent = message;
	elements.statusMessage.className = type;

	// Clear after a delay for non-errors
	if (type !== 'error') {
		setTimeout(() => {
			if (elements.statusMessage) {
				elements.statusMessage.textContent = '';
				elements.statusMessage.className = '';
			}
		}, 3000);
	}
}

// Initialize the application
function initializeAPIElements(config) {
	window.RPChat = window.RPChat || {};
	window.RPChat.config = config;

	// Wait for DOM to be fully loaded
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
}

// Call initialization
initializeAPIElements(window.RPChat.config);

// Utility function to scroll chat container to bottom
function scrollToBottom() {
	if (elements.chatContainer) {
		elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
	}
}
