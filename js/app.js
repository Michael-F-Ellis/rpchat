window.RPChat = window.RPChat || {};
window.RPChat.app = (function () {
	// DOM elements
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

	// Access exported items from config
	const { AIProvider, AIModel, PROVIDERS, SYSTEM_MESSAGE, DEFAULT_SYSTEM_MESSAGE } = window.RPChat.config;


	// State
	let apiKeys = {}; // Object to store API keys for different providers
	let currentProvider = localStorage.getItem('apiProvider') || 'together';
	let messages = [];
	let isProcessing = false;
	// Setup listener for model changes to update temperature
	function setupModelChangeListener() {
		modelSelector.addEventListener('change', () => {
			const providerId = apiProviderSelector.value;
			const provider = PROVIDERS.get(providerId);
			if (provider) {
				const selectedModelId = modelSelector.value;
				const selectedModel = provider.getModel(selectedModelId); // Use the existing helper method
				if (selectedModel && temperatureInput) { // Ensure temperatureInput is initialized
					temperatureInput.value = selectedModel.defaultTemperature.toFixed(2);
				}
			}
		});
	}

	// Initialize app
	function init() {
		// Populate provider selector
		apiProviderSelector.innerHTML = '';
		PROVIDERS.forEach((provider, id) => {
			const option = document.createElement('option');
			option.value = id;
			option.textContent = provider.displayName;
			apiProviderSelector.appendChild(option);

			// Load API keys for all providers
			const savedKey = localStorage.getItem(provider.apiKeyName);
			if (savedKey) {
				apiKeys[provider.apiKeyName] = savedKey;
			}
		});

		// Load saved provider preference if available
		const savedProvider = localStorage.getItem('apiProvider') || 'together';
		if (PROVIDERS.has(savedProvider)) {
			apiProviderSelector.value = savedProvider;
			currentProvider = savedProvider;
		}

		apiProviderSelector.addEventListener('change', () => {
			currentProvider = apiProviderSelector.value;
			localStorage.setItem('apiProvider', currentProvider);
			updateApiKeyDisplay();
			updateModelOptions();
		});

		// Add the temperature control to the UI
		addTemperatureControl();

		updateApiKeyDisplay();
		updateModelOptions();

		// Setup the model change listener
		setupModelChangeListener();

		const provider = PROVIDERS.get(currentProvider);
		const keyName = provider.apiKeyName;
		const apiKey = apiKeys[keyName];

		if (!apiKey) {
			showStatus('Please enter your API key', 'error');
			return;
		}

		// Load chat history from localStorage if available
		const savedMessages = localStorage.getItem('chatHistory');
		if (savedMessages) {
			messages = JSON.parse(savedMessages);
			renderMessages();
		}

		// Load saved system prompt if available
		const savedSystemPrompt = localStorage.getItem('systemPrompt');
		if (savedSystemPrompt) {
			SYSTEM_MESSAGE.content = savedSystemPrompt;
		}

		// Initialize the system prompt textarea
		systemPromptTextarea.value = SYSTEM_MESSAGE.content;

		// Set up the expanding textarea behavior
		setupExpandingSystemPrompt();

		// Set up the expanding user input behavior
		setupExpandingUserInput();

		// Add event listeners for system prompt controls
		saveSystemPromptBtn.addEventListener('click', saveSystemPrompt);
		resetSystemPromptBtn.addEventListener('click', resetSystemPrompt);

		// Event listeners
		saveKeyBtn.addEventListener('click', saveApiKey);
		sendButton.addEventListener('click', sendMessage);
		userInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				sendMessage();
			}
		});
		// Call this in init() or after addClearChatButton()
		addClearChatButton();
		const header = document.querySelector('header');
		window.RPChat.importExport.setupImportExport(
			header,
			messages,  // Make sure this is the same messages array used for rendering
			SYSTEM_MESSAGE,
			systemPromptTextarea,
			renderMessages,  // Pass the actual function reference
			showStatus
		);
	}

	function updateApiKeyDisplay() {
		const provider = PROVIDERS.get(currentProvider);

		if (!provider) {
			showStatus(`Provider ${currentProvider} not found`, 'error');
			return;
		}

		const keyName = provider.apiKeyName;
		const apiKey = apiKeys[keyName];

		apiKeyInput.value = apiKey ? '********' : '';

		statusMessage.textContent = apiKey ?
			`${provider.displayName} API key loaded` :
			'No API key set';
	}

	// Save API key to localStorage
	function saveApiKey() {
		const key = apiKeyInput.value.trim();
		const provider = PROVIDERS.get(currentProvider);

		if (!provider) {
			showStatus(`Provider ${currentProvider} not found`, 'error');
			return;
		}

		const keyName = provider.apiKeyName;

		if (key && key !== '********') {
			apiKeys[keyName] = key;
			localStorage.setItem(keyName, key);
			apiKeyInput.value = '********';
			showStatus(`${provider.displayName} API key saved successfully`, 'success');
		} else if (key === '') {
			// Clear API key if empty
			delete apiKeys[keyName];
			localStorage.removeItem(keyName);
			showStatus(`${provider.displayName} API key removed`, 'success');
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

		const provider = PROVIDERS.get(currentProvider);
		const keyName = provider.apiKeyName;
		const apiKey = apiKeys[keyName];

		if (!apiKey) {
			showStatus('Please enter your API key', 'error');
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

	// Fetch response from current provider API
	async function fetchAIResponse(userMessage, model) {
		const providerId = apiProviderSelector.value;
		const provider = PROVIDERS.get(providerId);

		if (!provider) {
			throw new Error(`Provider ${providerId} not found`);
		}

		const keyName = provider.apiKeyName;
		const apiKey = apiKeys[keyName];

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

		// Use the provider's helper method to prepare the request body
		const requestBody = provider.prepareRequestBody(model, apiMessages);

		try {
			const response = await fetch(provider.endpoint, {
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

			// Enhanced error handling
			if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
				showStatus('Network error. Please check your internet connection.', 'error');
			} else if (response && response.status === 401) {
				showStatus('Invalid API key. Please check your credentials.', 'error');
			} else {
				showStatus(`Error: ${error.message || 'Unknown error occurred'}`, 'error');
			}

			// For failed requests, remove the last user message and put it back in the input area
			handleFailedRequest(userMessage);

			throw error;
		}
	}

	// Function to handle failed requests
	function handleFailedRequest(userMessage) {
		// Remove the last message (which should be the user message that failed)
		if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
			messages.pop();
			localStorage.setItem('chatHistory', JSON.stringify(messages));
			renderMessages();

			// Put the message back in the input area
			userInput.value = userMessage;

			showStatus('Message removed from chat history and restored to input area', 'success');
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
		// Clear the chat history completely
		chatHistory.innerHTML = '';

		// Rebuild the UI from the messages array
		messages.forEach((message) => {
			const messageEl = createMessageElement(message);
			chatHistory.appendChild(messageEl);
		});

		// Ensure we scroll to the bottom
		chatHistory.scrollTop = chatHistory.scrollHeight;
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

		createMessageControlButtons(message.id, controlsEl);

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

		createMessageControlButtons(messageId, controlsEl);
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
		const providerId = apiProviderSelector.value;
		const provider = PROVIDERS.get(providerId);

		if (!provider) {
			console.error(`Provider ${providerId} not found`);
			return;
		}

		modelSelector.innerHTML = '';

		// Add each model from the provider to the selector
		provider.models.forEach(model => {
			const option = document.createElement('option');
			option.value = model.id;
			option.textContent = model.displayName;
			modelSelector.appendChild(option);
		});

		// Select the first model by default if available
		if (provider.models.length > 0) {
			modelSelector.value = provider.models[0].id;
			// Set the temperature to the default for this model
			const defaultModel = provider.models[0];
			temperatureInput.value = defaultModel.defaultTemperature.toFixed(2);
		}
	}

	// Function to save the system prompt
	function saveSystemPrompt() {
		const newPrompt = systemPromptTextarea.value.trim();
		if (newPrompt) {
			SYSTEM_MESSAGE.content = newPrompt;
			localStorage.setItem('systemPrompt', newPrompt);
			showStatus('System prompt updated successfully', 'success');
		} else {
			showStatus('System prompt cannot be empty', 'error');
		}
	}

	// Function to reset the system prompt to default
	function resetSystemPrompt() {
		if (confirm('Are you sure you want to reset the system prompt to default?')) {
			SYSTEM_MESSAGE.content = DEFAULT_SYSTEM_MESSAGE.content;
			systemPromptTextarea.value = DEFAULT_SYSTEM_MESSAGE.content;
			localStorage.removeItem('systemPrompt');
			showStatus('System prompt reset to default', 'success');
		}
	}


	// Add this function to your app.js file
	function setupExpandingSystemPrompt() {
		// Store the original height
		const originalHeight = getComputedStyle(systemPromptTextarea).height;

		// Set a data attribute to store the original height for reference
		systemPromptTextarea.dataset.originalHeight = originalHeight;

		// Add focus event listener
		systemPromptTextarea.addEventListener('focus', () => {
			// Expand the textarea when focused
			systemPromptTextarea.style.height = '300px';
		});

		// Add blur event listener
		systemPromptTextarea.addEventListener('blur', () => {
			// Return to original height when not focused
			systemPromptTextarea.style.height = systemPromptTextarea.dataset.originalHeight;
		});
	}
	function setupExpandingUserInput() {
		// Store the original height
		const originalHeight = getComputedStyle(userInput).height;

		// Set a data attribute to store the original height for reference
		userInput.dataset.originalHeight = originalHeight;

		// Add focus event listener
		userInput.addEventListener('focus', () => {
			// Expand the textarea when focused
			userInput.style.height = '150px'; // You can adjust this value as needed
		});

		// Add blur event listener
		userInput.addEventListener('blur', () => {
			// If the textarea is empty, return to original height when not focused
			if (userInput.value.trim() === '') {
				userInput.style.height = userInput.dataset.originalHeight;
			}
		});

		// Add input event listener to adjust height based on content
		userInput.addEventListener('input', () => {
			// Make sure the height is at least the expanded height when typing
			const minHeight = userInput.matches(':focus') ? '150px' : userInput.dataset.originalHeight;

			// If there's content, keep the expanded height even when blurred
			if (userInput.value.trim() !== '') {
				userInput.style.height = '150px';
			}
		});
	}

	// Delete a single message
	function deleteMessage(messageId) {
		if (confirm('Are you sure you want to delete this message?')) {
			const messageIndex = messages.findIndex(msg => msg.id === messageId);

			if (messageIndex !== -1) {
				// If deleting a user message that has an AI response right after it,
				// also delete the AI response
				if (
					messages[messageIndex].role === 'user' &&
					messageIndex + 1 < messages.length &&
					messages[messageIndex + 1].role === 'assistant'
				) {
					messages.splice(messageIndex, 2); // Remove both messages
				} else {
					messages.splice(messageIndex, 1); // Remove just this message
				}

				// Update localStorage and UI
				localStorage.setItem('chatHistory', JSON.stringify(messages));
				renderMessages();
				showStatus('Message deleted', 'success');
			}
		}
	}

	// Delete all messages from a certain point onwards
	function deleteFromHere(messageId) {
		if (confirm('Are you sure you want to delete this message and all that follow?')) {
			const messageIndex = messages.findIndex(msg => msg.id === messageId);

			if (messageIndex !== -1) {
				messages = messages.slice(0, messageIndex);
				localStorage.setItem('chatHistory', JSON.stringify(messages));
				renderMessages();
				showStatus('Messages deleted', 'success');
			}
		}
	}

	// Create a helper function to generate message control buttons
	function createMessageControlButtons(messageId, controlsEl) {
		// Add edit button
		const editBtn = document.createElement('button');
		editBtn.className = 'icon-button edit-message';
		editBtn.innerHTML = '🖊️';
		editBtn.addEventListener('click', () => startEditing(messageId));
		controlsEl.appendChild(editBtn);

		// Add delete button
		const deleteBtn = document.createElement('button');
		deleteBtn.className = 'icon-button delete-message';
		deleteBtn.innerHTML = '🗑️';
		deleteBtn.addEventListener('click', () => deleteMessage(messageId));
		controlsEl.appendChild(deleteBtn);

		// Add delete-from-here button (only for user messages)
		const message = messages.find(msg => msg.id === parseInt(messageId));
		if (message && message.role === 'user') {
			const deleteFromHereBtn = document.createElement('button');
			deleteFromHereBtn.className = 'icon-button delete-from-here';
			deleteFromHereBtn.innerHTML = '🗑️⬇️';
			deleteFromHereBtn.addEventListener('click', () => deleteFromHere(messageId));
			controlsEl.appendChild(deleteFromHereBtn);
		}

	}

	// Add this function to create and insert the temperature control
	function addTemperatureControl() {
		// Create container for temperature control
		const tempContainer = document.createElement('div');
		tempContainer.className = 'temperature-container';

		// Create label
		const tempLabel = document.createElement('label');
		tempLabel.htmlFor = 'temperature-input';
		tempLabel.textContent = 'Temperature:';

		// Create input
		const tempInput = document.createElement('input'); // Keep this local const
		tempInput.type = 'number';
		tempInput.id = 'temperature-input';
		tempInput.min = '0';
		tempInput.step = '0.01';
		tempInput.value = '0.7'; // Default value

		// Assign the created element to the global variable
		temperatureInput = tempInput;

		// Add elements to container
		tempContainer.appendChild(tempLabel);
		tempContainer.appendChild(tempInput);

		// Find a reliable parent element
		const inputParent = userInput.parentElement;

		// Insert before the user input
		inputParent.insertBefore(tempContainer, userInput);
	}

	// Add a getter for the messages array
	function getMessages() {
		return messages;
	}

	return {
		init: init,
		getMessages: getMessages
	};
})();

// Initialize the app
document.addEventListener('DOMContentLoaded', function () {
	window.RPChat.app.init();
});
