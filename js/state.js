window.RPChat = window.RPChat || {};
window.RPChat.state = (function () {
	// Import config
	const { AIProvider, AIModel, PROVIDERS, SYSTEM_MESSAGE, DEFAULT_SYSTEM_MESSAGE } = window.RPChat.config;

	// State variables
	let apiKeys = {}; // Object to store API keys for different providers
	let currentProvider = localStorage.getItem('apiProvider') || 'together';
	let messages = [];
	let isProcessing = false;
	let systemPrompt = localStorage.getItem('systemPrompt') || DEFAULT_SYSTEM_MESSAGE;

	// Initialize state from localStorage
	function init() {
		// Load API keys from localStorage
		PROVIDERS.forEach((provider, id) => {
			const keyName = provider.apiKeyName;
			const savedKey = localStorage.getItem(keyName);
			if (savedKey) {
				apiKeys[keyName] = savedKey;
			}
		});

		// Load messages from localStorage
		const savedMessages = localStorage.getItem('chatHistory');
		if (savedMessages) {
			try {
				messages = JSON.parse(savedMessages);
			} catch (e) {
				console.error('Failed to parse saved messages:', e);
				messages = [];
			}
		}
	}

	// Save messages to localStorage
	function saveMessages() {
		localStorage.setItem('chatHistory', JSON.stringify(messages));
	}

	// Save API key to localStorage
	function saveApiKey(provider, key) {
		const keyName = provider.apiKeyName;
		apiKeys[keyName] = key;
		localStorage.setItem(keyName, key);
	}

	// Get API key for current provider
	function getCurrentApiKey() {
		const provider = PROVIDERS.get(currentProvider);
		return provider ? apiKeys[provider.apiKeyName] : null;
	}

	// Set current provider
	function setCurrentProvider(providerId) {
		currentProvider = providerId;
		localStorage.setItem('apiProvider', providerId);
	}

	// Add a message to the chat history
	function addMessage(role, content) {
		const message = {
			id: Date.now().toString(),
			role,
			content,
			timestamp: new Date().toISOString()
		};
		messages.push(message);
		saveMessages();
		return message;
	}

	// Update a message in the chat history
	function updateMessage(id, content) {
		const messageIndex = messages.findIndex(m => m.id === id);
		if (messageIndex !== -1) {
			messages[messageIndex].content = content;
			messages[messageIndex].edited = true;
			saveMessages();
			return true;
		}
		return false;
	}

	// Delete a message from the chat history
	function deleteMessage(id) {
		const initialLength = messages.length;
		messages = messages.filter(m => m.id !== id);
		if (messages.length !== initialLength) {
			saveMessages();
			return true;
		}
		return false;
	}

	// Clear all messages
	function clearMessages() {
		messages = [];
		saveMessages();
	}

	// Save system prompt
	function saveSystemPrompt(prompt) {
		systemPrompt = prompt;
		localStorage.setItem('systemPrompt', prompt);
	}

	// Reset system prompt to default
	function resetSystemPrompt() {
		systemPrompt = DEFAULT_SYSTEM_MESSAGE;
		localStorage.setItem('systemPrompt', DEFAULT_SYSTEM_MESSAGE);
	}

	// Set processing state
	function setProcessing(state) {
		isProcessing = state;
	}

	// Public API
	return {
		init,
		getMessages: () => messages,
		getMessagesForAPI: () => {
			// Create a copy of messages with system prompt at the beginning
			return [
				{ role: 'system', content: systemPrompt },
				...messages.map(m => ({ role: m.role, content: m.content }))
			];
		},
		addMessage,
		updateMessage,
		deleteMessage,
		clearMessages,
		getCurrentProvider: () => currentProvider,
		setCurrentProvider,
		getCurrentApiKey,
		saveApiKey,
		getSystemPrompt: () => systemPrompt,
		saveSystemPrompt,
		resetSystemPrompt,
		isProcessing: () => isProcessing,
		setProcessing
	};
})();
