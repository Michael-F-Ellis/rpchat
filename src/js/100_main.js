// Main application code for RPChat using ChatManager and ChatMessage components

// Define state variables
let apiKeys = {};
let currentProvider = null;
let selectedModelId = null;
let temperature = null;
let isProcessing = false;
let chatManager = null;

/**
 * Extracts the current chat to a Markdown formatted string.
 * This function is available on the window object for console access.
 * @param {boolean} [assistant=true] - Include assistant messages.
 * @param {boolean} [user=true] - Include user messages.
 * @param {boolean} [system=false] - Include system messages.
 * @param {boolean} [labels=false] - Add role labels to each message.
 * @returns {string} The chat content in Markdown format.
 */
window.extractChatToMarkdown = function (assistant = true, user = true, system = false, labels = false) {
	if (!chatManager) {
		console.error("ChatManager not initialized.");
		return "Error: ChatManager not found.";
	}

	// Filter out the trailing empty user message
	const messagesToExport = chatManager.getMessagesJSON();

	let markdown = '';

	messagesToExport.forEach(message => {
		let include = false;
		if (assistant && message.role === ROLES.ASSISTANT) {
			include = true;
		}
		if (user && message.role === ROLES.USER && message.content) { // Exclude empty user messages
			include = true;
		}
		if (system && message.role === ROLES.SYSTEM) {
			include = true;
		}

		if (include) {
			if (labels) {
				markdown += `**${message.role.charAt(0).toUpperCase() + message.role.slice(1)}:** `;
			}
			markdown += `${message.content.trim()}\n\n`;
		}
	});

	// For easy copying, log to console and return
	console.log(markdown);

	return markdown;
}

// Provider and model management functions
window.createProvider = function (providerData) {
	return new Promise((resolve, reject) => {
		if (!db) return reject('DB not initialized');
		const transaction = db.transaction(['providers'], 'readwrite');
		const store = transaction.objectStore('providers');
		const request = store.add(providerData);
		request.onsuccess = () => resolve(providerData);
		request.onerror = (event) => reject(event.target.error);
	});
};

window.readProvider = function (providerId) {
	return new Promise((resolve, reject) => {
		if (!db) return reject('DB not initialized');
		const transaction = db.transaction(['providers', 'models'], 'readonly');
		const providerStore = transaction.objectStore('providers');
		const modelStore = transaction.objectStore('models');

		const providerRequest = providerStore.get(providerId);

		providerRequest.onsuccess = () => {
			const provider = providerRequest.result;
			if (!provider) {
				resolve(null);
				return;
			}

			const modelIndex = modelStore.index('providerId');
			const modelsRequest = modelIndex.getAll(providerId);

			modelsRequest.onsuccess = () => {
				provider.models = modelsRequest.result;
				resolve(provider);
			};
		};
		transaction.onerror = (event) => reject(event.target.error);
	});
};

window.updateProvider = function (providerId, providerData) {
	if (providerData.id !== providerId) {
		return Promise.reject('Provider ID mismatch');
	}
	return new Promise((resolve, reject) => {
		if (!db) return reject('DB not initialized');
		const transaction = db.transaction(['providers'], 'readwrite');
		const store = transaction.objectStore('providers');
		const dataToStore = { ...providerData };
		delete dataToStore.models; // Models are managed in their own store
		const request = store.put(dataToStore);
		request.onsuccess = () => resolve(providerData);
		request.onerror = (event) => reject(event.target.error);
	});
};

window.deleteProvider = function (providerId) {
	return new Promise((resolve, reject) => {
		if (!db) return reject('DB not initialized');
		const transaction = db.transaction(['providers', 'models'], 'readwrite');
		const providerStore = transaction.objectStore('providers');
		const modelStore = transaction.objectStore('models');

		providerStore.delete(providerId);

		const modelIndex = modelStore.index('providerId');
		const modelsRequest = modelIndex.openCursor(providerId);

		modelsRequest.onsuccess = () => {
			const cursor = modelsRequest.result;
			if (cursor) {
				modelStore.delete(cursor.primaryKey);
				cursor.continue();
			}
		};

		transaction.oncomplete = () => resolve(providerId);
		transaction.onerror = (event) => reject(event.target.error);
	});
};

window.createModel = function (providerId, modelData) {
	return new Promise((resolve, reject) => {
		if (!db) return reject('DB not initialized');
		const transaction = db.transaction(['models'], 'readwrite');
		const store = transaction.objectStore('models');
		const dataToAdd = { ...modelData, providerId: providerId };
		const request = store.add(dataToAdd);
		request.onsuccess = () => resolve(dataToAdd);
		request.onerror = (event) => reject(event.target.error);
	});
};

window.readModel = function (providerId, modelId) {
	return new Promise((resolve, reject) => {
		if (!db) return reject('DB not initialized');
		const transaction = db.transaction(['models'], 'readonly');
		const store = transaction.objectStore('models');
		const request = store.get(modelId);
		request.onsuccess = () => {
			const model = request.result;
			if (model && model.providerId === providerId) {
				resolve(model);
			} else {
				resolve(null);
			}
		};
		request.onerror = (event) => reject(event.target.error);
	});
};

window.updateModel = function (providerId, modelId, modelData) {
	if (modelData.id !== modelId) {
		return Promise.reject('Model ID mismatch');
	}
	return new Promise((resolve, reject) => {
		if (!db) return reject('DB not initialized');
		const transaction = db.transaction(['models'], 'readwrite');
		const store = transaction.objectStore('models');
		const dataToUpdate = { ...modelData, providerId: providerId };
		const request = store.put(dataToUpdate);
		request.onsuccess = () => resolve(dataToUpdate);
		request.onerror = (event) => reject(event.target.error);
	});
};

window.deleteModel = function (providerId, modelId) {
	return new Promise((resolve, reject) => {
		if (!db) return reject('DB not initialized');
		const transaction = db.transaction(['models'], 'readwrite');
		const store = transaction.objectStore('models');

		const getRequest = store.get(modelId);
		getRequest.onsuccess = () => {
			const model = getRequest.result;
			if (model && model.providerId === providerId) {
				const deleteRequest = store.delete(modelId);
				deleteRequest.onsuccess = () => resolve(modelId);
				deleteRequest.onerror = (event) => reject(event.target.error);
			} else if (model) {
				reject(`Model ${modelId} does not belong to provider ${providerId}`);
			} else {
				resolve(null); // Not found, but not an error for delete
			}
		};
		getRequest.onerror = (event) => reject(event.target.error);
	});
};

// Database management
const DB_NAME = 'rpchatDB';
const DB_VERSION = 1; // Using a simple integer for IndexedDB version
let db;

function initDB() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = (event) => {
			const db = event.target.result;
			console.log('Upgrading database...');

			// Create providers object store
			if (!db.objectStoreNames.contains('providers')) {
				const providersStore = db.createObjectStore('providers', { keyPath: 'id' });
				console.log('Created providers object store');
			}

			// Create models object store
			if (!db.objectStoreNames.contains('models')) {
				const modelsStore = db.createObjectStore('models', { keyPath: 'id' });
				modelsStore.createIndex('providerId', 'providerId', { unique: false });
				console.log('Created models object store and providerId index');
			}
		};

		request.onsuccess = (event) => {
			db = event.target.result;
			console.log('Database initialized successfully');
			resolve(db);
		};

		request.onerror = (event) => {
			console.error('Database error:', event.target.error);
			reject(event.target.error);
		};
	});
}


// Initialize application
async function init() { // Load saved state from sessionStorage
	try {
		await initDB();
	} catch (error) {
		showStatus('Failed to initialize database. Provider management will not work.', 'error');
	}
	loadStateFromStorage();

	// Set up UI elements based on configuration
	initializeUIElements();

	// Initialize ChatManager with system prompt
	initializeChatManager();

	// Test function for prepareApiMessagesForCharacter.
	// Add this after the chatManager initialization in the init() function
	// This makes the test function globally accessible from the browser console
	window.testPrepareApiMessagesForCharacter = function () {
		console.log("=== Testing prepareApiMessagesForCharacter() ===");

		// Create an array of test messages with various combinations
		const testMessages = [
			{
				id: "1",
				role: ROLES.SYSTEM,
				content: "Global system message",
				characterId: 0,
				visibility: 1,
				expected: { char1: "system", char2: "system", char3: "system" }
			},
			{
				id: "2",
				role: ROLES.USER,
				content: "User message (human)",
				characterId: 0,
				visibility: 1,
				expected: { char1: "user", char2: "user", char3: "user" }
			},
			{
				id: "3",
				role: ROLES.ASSISTANT,
				content: "Character 1 public message",
				characterId: 1,
				visibility: 1,
				expected: { char1: "assistant", char2: "user", char3: "user" }
			},
			{
				id: "4",
				role: ROLES.ASSISTANT,
				content: "Character 2 public message",
				characterId: 2,
				visibility: 1,
				expected: { char1: "user", char2: "assistant", char3: "user" }
			},
			{
				id: "5",
				role: ROLES.ASSISTANT,
				content: "Character 1 private message",
				characterId: 1,
				visibility: 0,
				expected: { char1: "system", char2: null, char3: null }
			},
			{
				id: "6",
				role: ROLES.ASSISTANT,
				content: "Character 3 private message",
				characterId: 3,
				visibility: 0,
				expected: { char1: null, char2: null, char3: "system" }
			}
		];

		// Convert the test messages into ChatMessage instances
		const mockMessages = testMessages.map(msg => {
			return {
				id: msg.id,
				role: msg.role,
				content: msg.content,
				characterId: msg.characterId,
				visibility: msg.visibility,
				element: document.createElement('div'), // Mock element
				expected: msg.expected
			};
		});

		// Test for different character IDs
		const characterIds = [1, 2, 3];

		// Results table for visual comparison
		console.log("Test Message Summary:");
		console.table(testMessages.map(m => ({
			ID: m.id,
			Content: m.content,
			Role: m.role,
			CharId: m.characterId,
			Visible: m.visibility === 1 ? "Public" : "Private"
		})));

		// Run tests for each character
		characterIds.forEach(charId => {
			console.log(`\n=== Testing for Character ID: ${charId} ===`);

			// Call the method with the current character ID
			const result = chatManager.prepareApiMessagesForCharacter(charId, mockMessages);

			// Log the raw result
			console.log("Raw result:", result);

			// Check if each message was processed correctly
			const expectedResults = mockMessages
				.filter(msg => msg.expected[`char${charId}`] !== null)
				.map(msg => ({
					content: msg.content,
					expectedRole: msg.expected[`char${charId}`]
				}));

			// Create comparison table
			const comparisonTable = result.map((item, index) => {
				const expected = expectedResults[index];
				return {
					"Message": item.content,
					"Actual Role": item.role,
					"Expected Role": expected?.expectedRole || "Should be omitted",
					"Match": expected && item.role === expected.expectedRole ? "✅" : "❌"
				};
			});

			console.log(`Results for Character ${charId}:`);
			console.table(comparisonTable);

			// Verify message count
			const expectedCount = expectedResults.length;
			console.log(`Expected ${expectedCount} messages, got ${result.length}: ${expectedCount === result.length ? "✅" : "❌"}`);
		});

		return "Test completed - check console for results";
	};

	console.log("Test function added! Run window.testPrepareApiMessagesForCharacter() in console to test.");

	// Attach event listeners
	attachEventListeners();

	// Initialize import/export functionality
	initImportExport();

	// Show initialization status
	showStatus('Application initialized');

}

// Set up import/export functionality
function initImportExport() {
	// Set up the import/export functionality
	RPChat.importExport.setupImportExport(
		chatManager,                     // Pass the entire chatManager object
		showStatus                       // Function to show status messages
	);
}

// Load state from local and session storage
function loadStateFromStorage() {
	// Init fallback values using first item from PROVIDERS
	const firstProvider = Array.from(window.RPChat.config.PROVIDERS.values())[0];
	const firstProviderKey = Array.from(window.RPChat.config.PROVIDERS.keys())[0];
	const fp = firstProviderKey
	const fm = firstProvider.models[0].id;
	const tmp = firstProvider.models[0].defaultTemperature;
	try {
		// Keep API keys are in localStorage for sharing across tabs
		apiKeys = JSON.parse(localStorage.getItem('apiKeys')) || {};

		// We use sessionStorage for everything else
		currentProvider = sessionStorage.getItem('apiProvider') || fp;

		selectedModelId = sessionStorage.getItem('selectedModelId') || fm;
		null;
		temperature = sessionStorage.getItem('temperature') ?
			parseFloat(sessionStorage.getItem('temperature')) :
			tmp;
	} catch (error) {
		showStatus('Error loading state from storage:', 'error');
	}
}

// Initialize UI elements based on configuration
function initializeUIElements() {
	// Set up provider selector
	populateProviderSelector();

	// Set up model selector for the current provider
	updateModelSelector();

	// Set up system prompt selector
	updateSystemPromptSelector();

	// Load API key if available
	if (apiKeys[getProvider().apiKeyName]) {
		El.apiKeyInput.value = '********'; // Show masked value
	}

	// Set temperature value if not set and a model is selected
	if (temperature === null && selectedModelId) {
		const model = getProvider().getModel(selectedModelId);
		if (model) {
			temperature = model.defaultTemperature;
		}
	}

	if (temperature !== null) {
		El.temperatureInput.value = temperature;
	}
}

// Initialize ChatManager
function initializeChatManager() {

	// Create ChatManager with system prompt and notification handler
	chatManager = new ChatManager(
		getCurrentSystemPrompt(),
		showStatus,
		El.chatContainer,
		onChatUpdate
	);

	// Try to load saved messages from sessionStorage
	try {
		const savedMessages = sessionStorage.getItem('chatMessages');
		if (savedMessages) {
			chatManager.parseMessagesJSON(savedMessages);
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
	if (!El.sendButton) return;

	const trailingMessage = chatManager.getTrailingUserMessage();

	// Disable send button if:
	// 1. Any message is being edited (besides trailing user message)
	// 2. The trailing message doesn't exist, is empty, or not being/just been edited
	const hasClosedEmptyFinalPrompt = trailingMessage && !trailingMessage.isBeingEdited() && trailingMessage.content.trim() === '';
	if (chatManager.hasActiveEdits()) {
		El.sendButton.disabled = true;
		El.sendLabel.textContent = "One or more messages are being edited";
	} else if (hasClosedEmptyFinalPrompt) {
		El.sendButton.disabled = true;
		El.sendLabel.textContent = "Final prompt is empty";
	}
	else {
		El.sendButton.disabled = false;
		El.sendLabel.textContent = "Ready"
	}
}

// Populate provider selector dropdown
function populateProviderSelector() {
	El.apiProviderSelector.innerHTML = '';

	window.RPChat.config.PROVIDERS.forEach((provider, id) => {
		const option = document.createElement('option');
		option.value = id;
		option.textContent = provider.displayName;
		El.apiProviderSelector.appendChild(option);
	});

	El.apiProviderSelector.value = currentProvider;
}

// Update model selector based on current provider
function updateModelSelector() {
	El.modelSelector.innerHTML = '';

	const provider = getProvider();
	if (!provider) return;

	provider.models.forEach(model => {
		const option = document.createElement('option');
		option.value = model.id;
		option.textContent = model.displayName;
		El.modelSelector.appendChild(option);
	});

	// Set selected model
	if (selectedModelId && provider.getModel(selectedModelId)) {
		El.modelSelector.value = selectedModelId;
	} else {
		// Select first model by default
		selectedModelId = provider.models[0]?.id;
		El.modelSelector.value = selectedModelId;
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
		El.temperatureInput.value = temperature;
	}
}

// Get current provider object
function getProvider() {
	return window.RPChat.config.PROVIDERS.get(currentProvider);
}

// Attach event listeners to UI elements
function attachEventListeners() {
	// Provider selection
	El.apiProviderSelector.addEventListener('change', handleProviderChange);

	// API key management
	El.saveKeyBtn.addEventListener('click', handleSaveApiKey);

	// Model selection
	El.modelSelector.addEventListener('change', handleModelChange);

	// System prompt selection
	El.systemPromptSelector.addEventListener('change', updateSystemPrompt);

	// Temperature control - apply debouncing (300ms delay)
	El.temperatureInput.addEventListener('input', debounce(handleTemperatureChange, 300));

	// Send button
	El.sendButton.addEventListener('click', handleSendMessage);

	// Clear chat
	El.clearChatBtn.addEventListener('click', handleClearChat);

	// Add a mutation observer to detect changes to the chat container
	// This helps update the send button state when edits start/end
	if (El.chatContainer) {
		const observer = new MutationObserver(() => {
			updateSendButtonState();
		});
		observer.observe(El.chatContainer, {
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
		El.apiKeyInput.value = '********'; // Masked
	} else {
		El.apiKeyInput.value = '';
	}

	showStatus(`Provider changed to ${getProvider().displayName}`);
}

// Handle saving API key
function handleSaveApiKey() {
	const apiKey = El.apiKeyInput.value.trim();

	if (!apiKey) {
		showStatus('Please enter an API key', 'error');
		return;
	}

	const keyName = getProvider().apiKeyName;

	// Don't overwrite if user just sees the masked value
	if (apiKey !== '********') {
		apiKeys[keyName] = apiKey;
		localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
		El.apiKeyInput.value = '********'; // Mask after saving
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
		El.temperatureInput.value = temperature;
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
	El.sendButton.disabled = true;
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
	// Start the timer when API call begins
	const startTime = Date.now();
	const timerInterval = setInterval(() => {
		if (!isProcessing) {
			clearInterval(timerInterval);
			return;
		}
		const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
		El.sendLabel.textContent = `Waiting for response... ${elapsedSeconds.toString().padStart(2, '0')}`;
	}, 1000);

	// Prepare request body
	const requestBody = provider.prepareRequestBody(
		selectedModelId,
		apiMessages,
		null, // use default max tokens
		temperature
	);

	// Prepare endpoint and make API call
	let endpoint = provider.endpoint;
	if (provider.apiFormat === 'gemini-native') {
		// Replace {{model}} placeholder with actual model ID
		endpoint = endpoint.replace('{{model}}', selectedModelId);
		// Add API key as URL parameter
		endpoint += `?key=${apiKey}`;

		// Make API call without authorization header for Gemini
		window.RPChat.api.sendGeminiRequest(
			endpoint,
			requestBody,
			(response) => handleApiResponse(response, requestBody),
			handleApiError
		);
	} else {
		// Use standard OpenAI-compatible API
		window.RPChat.api.sendRequest(
			endpoint,
			apiKey,
			requestBody,
			(response) => handleApiResponse(response, requestBody),
			handleApiError
		);
	}
}

// Handle successful API response
function handleApiResponse(response, requestBody) {
	isProcessing = false;
	El.sendButton.disabled = false;

	try {
		// Check finish_reason and log if not 'stop'
		let finishReason = null;

		// For Gemini native API format:
		if (response.candidates && response.candidates[0] && response.candidates[0].finishReason) {
			finishReason = response.candidates[0].finishReason;
		}
		// For OpenAI/Together.ai standard format:
		else if (response.choices && response.choices[0] && response.choices[0].finish_reason) {
			finishReason = response.choices[0].finish_reason;
		}

		if (finishReason && finishReason !== 'STOP' && finishReason !== 'stop') {
			console.log('Non-stop finish_reason detected:', finishReason);
			console.log('Request body:', requestBody);
		}

		// Extract AI response content
		const responseContent = window.RPChat.api.extractResponseContent(response);

		// Add assistant message using ChatManager
		chatManager.addMessage(ROLES.ASSISTANT, responseContent);

		// Explicitly render the chat to update the UI
		chatManager.render();

		// Scroll to the top of the last assistant message to bring it into view
		scrollToTopOfLastAssistantMessage();

		const tokenInfo = window.RPChat.api.getTokenUsageString(response);
		showStatus(tokenInfo || 'Response received', 'token-count');
	} catch (error) {
		handleApiError(error);
	}
}

// Handle API errors
function handleApiError(error) {
	isProcessing = false;
	El.sendButton.disabled = false;

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
		// Reset system prompt selector to first option
		El.systemPromptSelector.selectedIndex = 0;

		// Create a new ChatManager with the first system prompt
		chatManager = new ChatManager(
			getCurrentSystemPrompt(),
			showStatus,
			El.chatContainer,
			onChatUpdate
		);

		// Clear sessionStorage (except system prompt and settings)
		sessionStorage.removeItem('chatMessages');

		// Render empty chat
		chatManager.render();

		// Force update of internal state to match the new empty chat
		chatManager._notifyUpdate();

		showStatus('Chat cleared');
	}
}

// Show status message and use as notification handler for ChatManager
function showStatus(message, type = 'info') {
	if (!El.statusMessage) return;
	console.log('status message:', message)

	El.statusMessage.textContent = message;
	El.statusMessage.className = type;

	/*
	// Leave the message visible for token counts and error
	if (type == 'error' || type=='token-count') {
		return;
	}
	// Otherwise, auto-clear after a delay
	let timeout = 10000;
	if (type === 'success') {
		timeout = 500; // just a quick acknowledgement
	}
	setTimeout(() => {
		if (El.statusMessage) {
			El.statusMessage.textContent = '';
			El.statusMessage.className = '';
			console.log('status message cleared')
		}
	}, timeout);
	*/
}

// Initialize the application
function initializeApp() {
	// Wait for DOM to be fully loaded
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
}

// Header toggle functionality
function initHeaderToggle() {
	// Check if we're on mobile
	function isMobile() {
		return window.innerWidth <= 768;
	}

	// Set initial state based on screen size
	function setInitialHeaderState() {
		if (isMobile()) {
			El.headerContent.classList.remove('expanded');
			El.headerToggle.setAttribute('aria-expanded', 'false');
		} else {
			El.headerContent.classList.add('expanded');
			El.headerToggle.setAttribute('aria-expanded', 'true');
		}
		// Gear icon stays the same regardless of state
		El.headerToggle.textContent = '⚙️';
	}

	// Toggle header content
	function toggleHeader() {
		const isExpanded = El.headerContent.classList.contains('expanded');

		if (isExpanded) {
			El.headerContent.classList.remove('expanded');
			El.headerToggle.setAttribute('aria-expanded', 'false');
		} else {
			El.headerContent.classList.add('expanded');
			El.headerToggle.setAttribute('aria-expanded', 'true');
		}
		// Gear icon stays the same regardless of state
		El.headerToggle.textContent = '⚙️';
	}

	// Add event listeners
	El.headerToggle.addEventListener('click', toggleHeader);

	// Handle window resize
	window.addEventListener('resize', setInitialHeaderState);

	// Set initial state
	setInitialHeaderState();
}

// Initialize header toggle
initHeaderToggle();

// Call initialization
initializeApp();

// Utility function to scroll to the top of the last assistant message
function scrollToTopOfLastAssistantMessage() {
	if (El.chatContainer) {
		const assistantMessages = El.chatContainer.querySelectorAll('.assistant-message');
		if (assistantMessages.length > 0) {
			const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
			const containerRect = El.chatContainer.getBoundingClientRect();
			const messageRect = lastAssistantMessage.getBoundingClientRect();

			// Calculate the scroll amount needed to bring the message's top to the container's top.
			const scrollAmount = El.chatContainer.scrollTop + (messageRect.top - containerRect.top);

			El.chatContainer.scrollTo({
				top: scrollAmount,
				behavior: 'smooth'
			});
		}
	}
}

// Utility function to scroll chat container to bottom
function scrollToBottom() {
	if (El.chatContainer) {
		El.chatContainer.scrollTop = El.chatContainer.scrollHeight;
	}
}
