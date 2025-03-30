// Provider configuration class
class AIProvider {
	constructor(id, displayName, endpoint, models, defaultMaxTokens = 1000) {
		this.id = id;
		this.displayName = displayName;
		this.endpoint = endpoint;
		this.models = models; // Array of model objects
		this.defaultMaxTokens = defaultMaxTokens;
	}

	// Helper method to get a specific model by ID
	getModel(modelId) {
		return this.models.find(model => model.id === modelId);
	}

	// Helper method to prepare request body
	prepareRequestBody(modelId, messages, maxTokens = null) {
		const model = this.getModel(modelId);
		return {
			model: modelId,
			messages: messages,
			max_tokens: maxTokens || this.defaultMaxTokens,
			temperature: model ? model.defaultTemperature : 0.7
		};
	}
}

// Model configuration class
class AIModel {
	constructor(id, displayName, defaultTemperature = 0.7) {
		this.id = id;
		this.displayName = displayName;
		this.defaultTemperature = defaultTemperature;
	}
}

// Create a map of providers
const PROVIDERS = new Map([
	['together', new AIProvider(
		'together',
		'Together.ai',
		'https://api.together.xyz/v1/chat/completions',
		[
			new AIModel('meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', 'Meta Llama 3.1 405B', 0.7),
			new AIModel('mistralai/Mixtral-8x22B-Instruct-v0.1', 'Mixtral 8x22B', 0.8),
			new AIModel('microsoft/WizardLM-2-8x22B', 'WizardLM 2 8x22B', 0.7),
			new AIModel('Qwen/Qwen2.5-72B-Instruct-Turbo', 'Qwen 2.5 72B', 0.6)
		]
	)],

	['deepseek', new AIProvider(
		'deepseek',
		'DeepSeek',
		'https://api.deepseek.com/chat/completions',
		[
			new AIModel('deepseek-chat', 'DeepSeek Chat', 0.7),
			new AIModel('deepseek-reasoner', 'DeepSeek Reasoner', 0.5)
		]
	)],

	['gemini', new AIProvider(
		'gemini',
		'Google Gemini',
		'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
		[
			new AIModel('gemini-2.5-pro-exp-03-25', 'Gemini 2.5 Pro', 0.7)
		]
	)]
]);
