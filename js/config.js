/* CONFIGURATION */
window.RPChat = window.RPChat || {};
window.RPChat.config = (function () {
	// Provider configuration 
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
		prepareRequestBody(modelId, messages, maxTokens = null, temperature = null) {
			const model = this.getModel(modelId);
			return {
				model: modelId,
				messages: messages,
				max_tokens: maxTokens || this.defaultMaxTokens,
				temperature: temperature !== null ? parseFloat(temperature) : (model ? model.defaultTemperature : 0.7)
			};
		}

		// Form the name of the API key from the provider's ID
		// This allows us to avoid defining a var for each providers key.
		get apiKeyName() {
			return `${this.id}ApiKey`;
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
* Ultra-short replies (e.g., "And?", "Run.") are allowed for pacing.

Strategy and Purpose:
* You need not reveal all your character's plans and motivations immediately to the user.
* You may explain, act, command, acquiesce, discuss, question, interrogate, confront, resist, protest, plead, stand firm, ... all according to the needs of the moment and the user's responses.
* Adapt fluidly to the user's tone and pace, balancing brevity with vividness. Prioritize momentum over perfection.

Prioritize Action and Dialogue:
* Show, don't tell: Replace emotional labels (e.g., "I was angry") with visceral cues ("My knuckles whiten around the glass, ice clinking as I set it down too hard. I felt my jaw clenching.").

* Crisp dialogue: Use natural speech rhythms; avoid exposition. Let subtext and tension drive exchanges.

* Avoid repetition: Shift scenes forward, introduce new stakes, or deepen conflict with each reply. Short repetitions for dramatic effect are permitted, e.g., "Well? Well? Answer me. I'm waiting, David..."

Narrative Flow
* Leave room for collaboration: End responses with open-ended actions, questions, or choices to invite user input.
Example: "MaryAnn, we can do this the easy way or the hard way. Your choice. What's it gonna be?"

* Sensory details: Highlight textures, sounds, or fleeting gestures to ground the scene (e.g., "I see the smoke curl from your cigarette, its small wavers revealing the tremor in your hand.").

Forbidden Elements
* No emotional narration (e.g., "I felt guilty" → "I can't meet her eyes as I toss the empty vial into the fire.").
* No premature closures, Avoid cheesy paragraphs that signal the end, e.g. "We stand side by side, knowing that whatever challenges the future might bring, we would face them together." Always assume the story will continue.  Leave closures for the user's character to provide.
* No redundant descriptions (e.g., repeating setting details unless plot-critical).
`
	};

	// Store the default system message for reset functionality
	const DEFAULT_SYSTEM_MESSAGE = {
		role: 'system',
		content: SYSTEM_MESSAGE.content
	};

	// return the classes and constants we expose
	return { AIProvider, AIModel, PROVIDERS, DEFAULT_SYSTEM_MESSAGE };
})();