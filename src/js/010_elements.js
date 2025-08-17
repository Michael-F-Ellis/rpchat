// DOM element references
const El = {
	apiProviderSelector: document.getElementById('api-provider'),
	apiKeyInput: document.getElementById('api-key'),
	saveKeyBtn: document.getElementById('save-key'),
	modelSelector: document.getElementById('model-selector'),
	systemPromptSelector: document.getElementById('system-prompt-selector'),
	temperatureInput: document.getElementById('temperature-input'),
	chatContainer: document.getElementById('chat-container'),
	sendButton: document.getElementById('send-button'),
	clearChatBtn: document.getElementById('clear-chat'),
	statusMessage: document.getElementById('status-message'),
	sendLabel: document.getElementById('send-label'),
	headerToggle: document.getElementById('header-toggle'),
	headerContent: document.getElementById('header-content'),
	// New elements for Markdown extraction
	extractMdBtn: document.getElementById('extract-chat-md'),
	extractMdModal: document.getElementById('extract-md-modal'),
	extractMdConfirmBtn: document.getElementById('extract-md-confirm'),
	extractMdCancelBtn: document.getElementById('extract-md-cancel'),
	mdIncludeAssistant: document.getElementById('md-include-assistant'),
	mdIncludeUser: document.getElementById('md-include-user'),
	mdIncludeSystem: document.getElementById('md-include-system'),
	mdIncludeLabels: document.getElementById('md-include-labels')
};
