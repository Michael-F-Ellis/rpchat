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
	 * Sends a request to Gemini native API (no authorization header)
	 * @param {string} endpoint - The API endpoint
	 * @param {object} requestBody - The request body
	 * @param {function} onSuccess - Callback for successful response
	 * @param {function} onError - Callback for errors
	 */
	sendGeminiRequest: function (endpoint, requestBody, onSuccess, onError) {
		fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
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
	 * Gets a formatted string for token usage from an AI provider response.
	 * @param {object} response - The response from the AI provider.
	 * @returns {string|null} A formatted string of token counts, or null if no tokens were used.
		*/
	getTokenUsageString: function (response) {
		let sentTokens = 0;
		let receivedTokens = 0;
		let thinkingTokens = 0;

		// Gemini native API format
		if (response.usageMetadata) {
			sentTokens = response.usageMetadata.promptTokenCount || 0;
			receivedTokens = response.usageMetadata.candidatesTokenCount || 0;
			thinkingTokens = response.usageMetadata.totalTokenCount - sentTokens - receivedTokens;
		}
		// OpenAI/Together.ai standard format
		else if (response.usage) {
			sentTokens = response.usage.prompt_tokens || 0;
			receivedTokens = response.usage.completion_tokens || 0;
		}

		if (sentTokens > 0 || receivedTokens > 0) {
			let logMessage = `Tokens: ${sentTokens} sent,  ${receivedTokens} received`;
			if (thinkingTokens > 0) {
				logMessage += ` (+ ${thinkingTokens} thinking)`;
			}
			return logMessage;
		}
		return null;
	},

	/**
	 * Extracts the content from an AI provider response
	 * @param {object} response - The response from the AI provider
	 * @returns {string} The extracted content
	 */
	extractResponseContent: function (response) {
		// For Gemini native API format:
		if (response.candidates && response.candidates[0] && response.candidates[0].content) {
			console.log(response)
			return response.candidates[0].content.parts[0].text
		}

		// For OpenAI/Together.ai standard format:
		if (response.choices && response.choices[0] && response.choices[0].message) {
			console.log(response)
			return response.choices[0].message.content
		}

		throw new Error('Unable to extract content from response')
	}
}
