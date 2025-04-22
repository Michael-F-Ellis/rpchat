// Initialize the header elements using the classes and functions provided in config.js

/**
 * Initializes the API configuration elements in the header
 * @param {Object} config - Configuration object containing PROVIDERS and related settings
 */
function initializeAPIElements(config) {
	// Populate API Provider dropdown
	populateProviderSelector()

	// Set up event listeners
	setupEventListeners()

	// Initialize with stored values or defaults
	loadStoredSettings()

	/**
	 * Populates the API provider selector with available providers
	 */
	function populateProviderSelector() {
		apiProviderSelector.innerHTML = ''

		// Add options for each provider from config
		config.PROVIDERS.forEach(provider => {
			const option = document.createElement('option')
			option.value = provider.id
			option.textContent = provider.displayName
			apiProviderSelector.appendChild(option)
		})
	}

	/**
	 * Sets up event listeners for API configuration elements
	 */
	function setupEventListeners() {
		// Save API Key button
		saveKeyBtn.addEventListener('click', () => {
			const providerId = apiProviderSelector.value
			const provider = config.PROVIDERS.get(providerId)
			const apiKey = apiKeyInput.value.trim()

			if (apiKey) {
				// Get the provider-specific key name
				const keyName = provider.apiKeyName

				// Store the key in localStorage
				const apiKeys = JSON.parse(localStorage.getItem('apiKeys') || '{}')
				apiKeys[keyName] = apiKey
				localStorage.setItem('apiKeys', JSON.stringify(apiKeys))

				// Display confirmation
				showStatus(`API Key saved.`, 'success')
			}
		})

		// Provider selection change
		apiProviderSelector.addEventListener('change', () => {
			const providerId = apiProviderSelector.value
			const provider = config.PROVIDERS.get(providerId)

			// Update currentProvider in localStorage
			localStorage.setItem('apiProvider', providerId)

			// Update model selector based on the selected provider
			populateModelSelector(provider)

			// Load API key for the selected provider
			loadApiKey(provider)

			// Update temperature based on the first model or saved value
			updateTemperature(provider)
		})

		// Model selection change
		modelSelector.addEventListener('change', () => {
			const providerId = apiProviderSelector.value
			const provider = config.PROVIDERS.get(providerId)
			const selectedModelId = modelSelector.value

			// Save selected model to localStorage
			localStorage.setItem('selectedModelId', selectedModelId)

			// Update temperature based on selected model
			const model = provider.getModel(selectedModelId)
			temperatureInput.value = model.defaultTemperature
			localStorage.setItem('temperature', model.defaultTemperature)
		})

		// Temperature change
		temperatureInput.addEventListener('change', () => {
			const temperature = parseFloat(temperatureInput.value)
			localStorage.setItem('temperature', temperature)
		})
	}

	/**
	 * Populates the model selector with models from the given provider
	 * @param {Object} provider - Provider object containing models
	 */
	function populateModelSelector(provider) {
		modelSelector.innerHTML = ''

		provider.models.forEach(model => {
			const option = document.createElement('option')
			option.value = model.id
			option.textContent = model.displayName
			modelSelector.appendChild(option)
		})
	}

	/**
	 * Loads the API key for the selected provider from localStorage
	 * @param {Object} provider - Provider object
	 */
	function loadApiKey(provider) {
		const apiKeys = JSON.parse(localStorage.getItem('apiKeys') || '{}')
		const keyName = provider.apiKeyName

		if (apiKeys[keyName]) {
			apiKeyInput.value = apiKeys[keyName]
		} else {
			apiKeyInput.value = ''
		}
	}

	/**
	 * Updates the temperature input based on the provider's first model or saved setting
	 * @param {Object} provider - Provider object
	 */
	function updateTemperature(provider) {
		const selectedModelId = localStorage.getItem('selectedModelId')
		const savedTemperature = localStorage.getItem('temperature')

		if (selectedModelId && provider.getModel(selectedModelId)) {
			modelSelector.value = selectedModelId

			if (savedTemperature) {
				temperatureInput.value = savedTemperature
			} else {
				const model = provider.getModel(selectedModelId)
				temperatureInput.value = model.defaultTemperature
			}
		} else if (provider.models.length > 0) {
			const firstModel = provider.models[0]
			modelSelector.value = firstModel.id
			temperatureInput.value = firstModel.defaultTemperature
		}
	}

	/**
	 * Loads stored settings from localStorage or uses defaults
	 */
	function loadStoredSettings() {
		const savedProvider = localStorage.getItem('apiProvider')

		if (savedProvider && config.PROVIDERS.has(savedProvider)) {
			apiProviderSelector.value = savedProvider
			const provider = config.PROVIDERS.get(savedProvider)

			// Load models for the selected provider
			populateModelSelector(provider)

			// Load API key
			loadApiKey(provider)

			// Update temperature
			updateTemperature(provider)
		} else if (config.PROVIDERS.size > 0) {
			// Use the first provider as default
			const defaultProviderId = [...config.PROVIDERS.keys()][0]
			apiProviderSelector.value = defaultProviderId
			const defaultProvider = config.PROVIDERS.get(defaultProviderId)

			populateModelSelector(defaultProvider)
			updateTemperature(defaultProvider)
		}
	}
}

// Initialize the API module with required functions
window.RPChat = window.RPChat || {}
window.RPChat.api = {
	/**
	 * Sends a request to the AI provider API
	 * @param {string} endpoint - The API endpoint URL
	 * @param {string} apiKey - The API key for authentication
	 * @param {object} requestBody - The data to send (will be JSON-stringified)
	 * @param {function} onSuccess - Callback for successful responses
	 * @param {function} onError - Callback for errors
	 */
	sendRequest: function (endpoint, apiKey, requestBody, onSuccess, onError) {
		fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`
			},
			body: JSON.stringify(requestBody)
		})
			.then(response => {
				if (!response.ok) {
					return response.json().then(errorData => {
						throw new Error(errorData.error || `HTTP error! Status: ${response.status}`)
					}).catch(() => {
						throw new Error(`HTTP error! Status: ${response.status}`)
					})
				}
				return response.json()
			})
			.then(data => {
				onSuccess(data)
			})
			.catch(error => {
				onError(error)
			})
	},

	/**
	 * Extracts the content from an AI provider response
	 * @param {object} response - The response from the AI provider
	 * @returns {string} The extracted content
	 */
	extractResponseContent: function (response) {
		// For OpenAI/Together.ai standard format:
		if (response.choices && response.choices[0] && response.choices[0].message) {
			return response.choices[0].message.content
		}

		throw new Error('Unable to extract content from response')
	}
}
