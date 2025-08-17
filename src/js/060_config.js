/* CONFIGURATION */
window.RPChat = window.RPChat || {};
window.RPChat.config = (function () {
	// Provider configuration 
	class AIProvider {
		constructor(id, displayName, endpoint, models, defaultMaxTokens = 1000, apiFormat = 'openai') {
			this.id = id;
			this.displayName = displayName;
			this.endpoint = endpoint;
			this.models = models; // Array of model objects
			this.defaultMaxTokens = defaultMaxTokens;
			this.apiFormat = apiFormat;
		}

		// Helper method to get a specific model by ID
		getModel(modelId) {
			return this.models.find(model => model.id === modelId);
		}

		// Helper method to prepare request body
		prepareRequestBody(modelId, messages, maxTokens = null, temperature = null) {
			const model = this.getModel(modelId);

			if (this.apiFormat === 'gemini-native') {
				return this.prepareGeminiRequestBody(modelId, messages, maxTokens, temperature, model);
			} else {
				// Default to OpenAI format
				return this.prepareOpenAIRequestBody(modelId, messages, maxTokens, temperature, model);
			}
		}

		// OpenAI-compatible request body
		prepareOpenAIRequestBody(modelId, messages, maxTokens, temperature, model) {
			const requestBody = {
				model: modelId,
				messages: messages,
				max_tokens: maxTokens || this.defaultMaxTokens,
				temperature: temperature !== null ? parseFloat(temperature) : (model ? model.defaultTemperature : 0.7)
			};

			// Include extraFields if they exist
			if (model && model.extraFields) {
				console.log('Model extraFields:', model.extraFields);
				Object.assign(requestBody, model.extraFields);
				console.log('Request body after extraFields merge:', requestBody);
			}

			return requestBody;
		}

		// Gemini native request body
		prepareGeminiRequestBody(modelId, messages, maxTokens, temperature, model) {
			// Separate system instruction from conversation messages
			let systemInstruction = null;
			const contents = [];

			for (const msg of messages) {
				if (msg.role === 'system') {
					// Extract system instruction (only use the first one)
					if (!systemInstruction) {
						systemInstruction = {
							parts: [{ text: msg.content }]
						};
					}
				} else if (msg.role === 'user' || msg.role === 'assistant') {
					// Convert to Gemini format
					contents.push({
						role: msg.role === 'assistant' ? 'model' : 'user',
						parts: [{ text: msg.content }]
					});
				}
			}

			const requestBody = {
				contents: contents,
				generationConfig: {
					temperature: temperature !== null ? parseFloat(temperature) : (model ? model.defaultTemperature : 0.7),
					maxOutputTokens: maxTokens || this.defaultMaxTokens
				}
			};

			// Add system instruction if present
			if (systemInstruction) {
				requestBody.system_instruction = systemInstruction;
			}

			// Include extraFields (like safetySettings) if they exist
			if (model && model.extraFields) {
				console.log('Model extraFields:', model.extraFields);
				Object.assign(requestBody, model.extraFields);
				console.log('Request body after extraFields merge:', requestBody);
			}

			return requestBody;
		}

		// Form the name of the API key from the provider's ID
		// This allows us to avoid defining a var for each providers key.
		get apiKeyName() {
			return `${this.id}ApiKey`;
		}
	}

	// Model configuration class
	class AIModel {
		constructor(id, displayName, defaultTemperature = 0.7, extraFields = null) {
			this.id = id;
			this.displayName = displayName;
			this.defaultTemperature = defaultTemperature;
			this.extraFields = extraFields;
			// The following are used at run time to track cumulative tokens
			this.tokensSent = 0;
			this.tokensReceived = 0;
			this.tokensThinking = 0;
		}
	}

	// Create a map of providers
	// {{PROVIDERS_PLACEHOLDER}}

	// return the classes and constants we expose
	return { AIProvider, AIModel, PROVIDERS };
})();
