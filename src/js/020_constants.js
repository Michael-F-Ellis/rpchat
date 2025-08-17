/* Chat Message Class and Constants
 * 
 * This class represents a chat message with various properties and methods.
 * It also defines a set of CSS classes used for styling and identifying message roles.
 */
const CSS_CLASSES = {
	MESSAGE: 'message',
	SYSTEM_MESSAGE: 'system-message',
	USER_MESSAGE: 'user-message',
	ASSISTANT_MESSAGE: 'assistant-message',
	EDITABLE_CONTENT: 'editable-content',
	MESSAGE_CONTROLS: 'message-controls',
	ICON_BUTTON: 'icon-button',
	// New classes for collapsibility
	COLLAPSIBLE: 'collapsible',       // Marker for collapsible messages
	MESSAGE_BODY: 'message-body',     // Wrapper for content+controls that gets hidden
	TOGGLE_COLLAPSE: 'toggle-collapse', // Class for the toggle button
	COLLAPSED: 'collapsed',           // State class when content is hidden
};
const ROLES = {
	SYSTEM: 'system',
	USER: 'user',
	ASSISTANT: 'assistant',
	APP: 'app', // messages from the app itself, typically error notifications.
};
