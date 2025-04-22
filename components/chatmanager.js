// ChatManager is a class that manages a list of ChatMessages.

// It provides the delete callbacks and methods to create the JSON body
// of the list of chat messages used to send context and prompt to
// an AI API. It can also parse a JSON body of messages received from
// an input file.

// It enforces that there is exactly one system message and it is always the first message.
// It ensures the last message is always a user message (potentially empty) for continuation.

// It doesn't handle communication with servers or file i/0 or manage
// session storage.

// Assumes ChatMessage class and its constants (ROLES, CSS_CLASSES) are available globally or imported.
// Assumes a global showStatus function exists, or it's passed via notificationCB.

class ChatManager {
	/**
	 * Manages a collection of ChatMessage objects.
	 * Enforces exactly one system message at the beginning.
	 * Ensures the last message is always a user message.
	 * @param {string} [initialSystemPrompt='You are a helpful assistant.'] - The initial system prompt content. Cannot be empty.
	 * @param {function} [notificationCB=null] - Callback for displaying status messages (e.g., showStatus). Defaults to console.log.
	 * @param {HTMLElement} [container=null] - The DOM element to render messages into.
	 * @param {function} [onUpdateCallback=null] - Callback function to execute when the message list is modified.
	 */
	constructor(initialSystemPrompt = 'You are a helpful assistant.', notificationCB = null, container = null, onUpdateCallback = null) {
		this.messages = [];
		this.onUpdate = onUpdateCallback; // Store the update callback
		// Use provided notification callback or a default console log
		this.notificationHandler = notificationCB || function (message, type = 'info') {
			console.log(`[${type.toUpperCase()}] ${message}`);
		};
		this.container = container; // Store the container for rendering

		// Bind methods that will be used as callbacks to ensure 'this' context
		this.handleDelete = this.handleDelete.bind(this);
		this.handleDeleteFromHere = this.handleDeleteFromHere.bind(this);
		this._ensureTrailingUserMessage = this._ensureTrailingUserMessage.bind(this);

		// --- Enforce System Message Rule ---
		// Ensure initialSystemPrompt is provided (or use a default)
		const systemPromptContent = initialSystemPrompt || 'You are a helpful assistant.'; // Ensure non-empty

		// Create and add the mandatory system message FIRST.
		const systemMessage = new ChatMessage(
			ROLES.SYSTEM,
			systemPromptContent,
			this.handleDelete,
			this.handleDeleteFromHere,
			this.notificationHandler
		);
		this.messages.push(systemMessage);
		// --- End System Message Enforcement ---

		// --- Ensure Trailing User Message ---
		this._ensureTrailingUserMessage(); // Add initial empty user message
		// --- End Trailing User Message ---

		// Note: No initial rendering from constructor to allow setup completion.
		// Call render() explicitly after instantiation if needed immediately.
	}

	/**
	 * Calls the registered onUpdate callback, if provided.
	 * @private
	 */
	_notifyUpdate() {
		if (typeof this.onUpdate === 'function') {
			this.onUpdate();
		}
	}
	/**
	 * Helper method to ensure there's always a trailing empty user message.
	 * @private
	 */
	_ensureTrailingUserMessage() {
		const lastMessage = this.messages[this.messages.length - 1];
		if (!lastMessage || lastMessage.role !== ROLES.USER || lastMessage.content !== '') {
			const emptyUserMessage = new ChatMessage(
				ROLES.USER,
				'',
				this.handleDelete,
				this.handleDeleteFromHere,
				this.notificationHandler
			);
			this.messages.push(emptyUserMessage);
			// No direct render call here; rely on the calling method to notify
		}
	}

	/**
	 * Adds a new USER or ASSISTANT message to the chat.
	 * System messages cannot be added via this method.
	 * Ensures a trailing empty user message exists if an assistant message was added.
	 * @param {string} role - The role ('user', 'assistant'). MUST NOT be 'system'.
	 * @param {string} content - The message content. Cannot be empty for 'user' role if it's meant to replace the trailing empty message.
	 * @returns {ChatMessage|null} The newly created ChatMessage instance, or null if role is invalid.
	 */
	addMessage(role, content) {
		// --- Enforce System Message Rule ---
		if (role === ROLES.SYSTEM) {
			this.notificationHandler('Cannot add another system message. Edit the existing one.', 'error');
			console.error("Attempted to add a system message via addMessage. Use constructor or load for system message.");
			return null; // Prevent adding system messages here
		}
		// --- End System Message Enforcement ---

		// Validate role is user or assistant
		if (role !== ROLES.USER && role !== ROLES.ASSISTANT) {
			this.notificationHandler(`Invalid role "${role}". Only "${ROLES.USER}" or "${ROLES.ASSISTANT}" can be added.`, 'error');
			console.error(`Invalid role passed to addMessage: ${role}`);
			return null;
		}

		// If adding a non-empty user message, remove the trailing empty one if it exists
		if (role === ROLES.USER && content !== '') {
			const lastMessage = this.messages[this.messages.length - 1];
			if (lastMessage && lastMessage.role === ROLES.USER && lastMessage.content === '') {
				this.messages.pop();
			}
		}

		const newMessage = new ChatMessage(
			role,
			content,
			this.handleDelete,         // Pass the bound delete handler
			this.handleDeleteFromHere, // Pass the bound delete-from-here handler
			this.notificationHandler   // Pass the notification handler
		);
		this.messages.push(newMessage); // Add to the end

		// --- Ensure Trailing User Message ---
		// If we just added an assistant message, make sure there's a user message after it.
		this._ensureTrailingUserMessage(); // Ensure it exists after any addition
		// --- End Trailing User Message ---

		this._notifyUpdate(); // Notify that the message list has changed

		return newMessage;
	}

	/**
	 * Callback handler for deleting a single message.
	 * Passed to ChatMessage instances. System message cannot be deleted.
	 * Ensures a trailing empty user message exists after deletion.
	 * @param {string} messageId - The ID of the message to delete.
	 */
	handleDelete(messageId) {
		const index = this.messages.findIndex(msg => msg.id === messageId);
		if (index !== -1) {
			// --- Enforce System Message Rule ---
			if (index === 0 && this.messages[index].role === ROLES.SYSTEM) {
				this.notificationHandler('System message cannot be deleted.', 'error');
				return;
			}
			// Additional safety check (should be redundant due to above)
			if (this.messages[index].role === ROLES.SYSTEM) {
				this.notificationHandler('System message cannot be deleted.', 'error');
				return;
			}
			// --- End System Message Enforcement ---
			// Require confirmation from user before deleting
			if (!confirm(`Are you sure you want to delete this message?`)) {
				return;
			}

			this.messages.splice(index, 1);
			this.notificationHandler('Message deleted.', 'success');

			// --- Ensure Trailing User Message ---
			this._ensureTrailingUserMessage(); // Add if needed
			// --- End Trailing User Message ---

			this._notifyUpdate(); // Notify that the message list has changed
		} else {
			this.notificationHandler('Could not find message to delete.', 'error');
		}
	}

	/**
	 * Callback handler for deleting messages from a specific point onwards.
	 * Passed to ChatMessage instances (typically user messages).
	 * Ensures the system message is never deleted.
	 * Ensures a trailing empty user message exists after deletion.
	 * @param {string} messageId - The ID of the message to delete from (inclusive).
	 */
	handleDeleteFromHere(messageId) {
		const index = this.messages.findIndex(msg => msg.id === messageId);
		if (index !== -1) {
			// --- Enforce System Message Rule ---
			if (index === 0) {
				this.notificationHandler('Cannot "delete from here" starting at the system message.', 'warning');
				return;
			}
			// --- End System Message Enforcement ---
			// require confirmation from user before deleting
			if (!confirm(`Are you sure you want to delete all messages from this message onward?`)) {
				return;
			}
			const deleteCount = this.messages.length - index;
			this.messages.splice(index); // Remove from index to the end
			this.notificationHandler(`${deleteCount} message(s) deleted from here.`, 'success');

			// --- Ensure Trailing User Message ---
			this._ensureTrailingUserMessage(); // Add if needed
			// --- End Trailing User Message ---

			this._notifyUpdate(); // Notify that the message list has changed
		} else {
			this.notificationHandler('Could not find starting message for deletion.', 'error');
		}
	}

	/**
	 * Gets the current chat messages as an array of plain objects suitable for JSON serialization.
	 * Filters out the trailing empty user message if present, as it's UI-only.
	 * Assumes ChatMessage.saveEdit() updates the instance's `content` property.
	 * @returns {Array<{role: string, content: string}>}
	 */
	getMessagesJSON() {
		// Make a copy to potentially modify for export
		let messagesToExport = [...this.messages];

		// Check if the last message is an empty user message (added by _ensureTrailingUserMessage)
		const lastMessage = messagesToExport[messagesToExport.length - 1];
		if (lastMessage && lastMessage.role === ROLES.USER && lastMessage.content === '') {
			// Remove it for the JSON output, as it's primarily for UI interaction state
			messagesToExport.pop();
		}

		return messagesToExport.map(message => ({
			role: message.role,
			content: message.content
		}));
	}

	/**
	 * Parses a JSON string or an array of message objects and replaces the current chat history.
	 * Validates that the input data has exactly one system message at the beginning.
	 * Ensures a trailing empty user message exists after parsing.
	 * @param {string | Array<{role: string, content: string}>} jsonData - JSON string or array of message objects.
	 */
	parseMessagesJSON(jsonData) {
		let parsedMessages;
		try {
			// 1. Parse Input
			if (typeof jsonData === 'string') {
				parsedMessages = JSON.parse(jsonData);
			} else if (Array.isArray(jsonData)) {
				parsedMessages = jsonData;
			} else {
				throw new Error("Input must be a JSON string or an array.");
			}

			if (!Array.isArray(parsedMessages)) {
				throw new Error("Parsed data is not an array.");
			}

			// 2. --- Validate Structure and System Message Rule ---
			if (parsedMessages.length === 0) {
				// Allow loading just a system prompt if needed, constructor handles default
				// throw new Error("Cannot load empty chat history. Must contain at least a system message.");
				// If empty, we'll just end up with the default system + empty user
			} else {
				// Check first message is system if messages exist
				if (parsedMessages[0]?.role !== ROLES.SYSTEM) {
					throw new Error(`Invalid chat history: First message must have role "${ROLES.SYSTEM}`);
				}
				// Check for other system messages
				const otherSystemMessages = parsedMessages.slice(1).filter(m => m.role === ROLES.SYSTEM);
				if (otherSystemMessages.length > 0) {
					throw new Error(`Invalid chat history: Only one message with role "${ROLES.SYSTEM}" is allowed (must be the first).`);
				}
				// Basic validation of remaining message structure
				if (!parsedMessages.every(m => typeof m === 'object' && m !== null && 'role' in m && 'content' in m && Object.values(ROLES).includes(m.role))) {
					throw new Error("Invalid message structure found in parsed data.");
				}
			}
			// --- End Validation ---

			// 3. Clear existing messages (only after validation passes)
			this.messages = [];

			// 4. Add messages from parsed data
			parsedMessages.forEach(msgData => {
				// Recreate ChatMessage instances
				const newMessage = new ChatMessage(
					msgData.role,
					msgData.content,
					this.handleDelete,
					this.handleDeleteFromHere,
					this.notificationHandler
				);
				this.messages.push(newMessage);
			});

			// --- Ensure System Message and Trailing User Message ---
			if (this.messages.length === 0 || this.messages[0]?.role !== ROLES.SYSTEM) {
				// Add default system message if none exists
				const systemMessage = new ChatMessage(
					ROLES.SYSTEM,
					'You are a helpful assistant.',
					this.handleDelete,
					this.handleDeleteFromHere,
					this.notificationHandler
				);
				this.messages.unshift(systemMessage);
			}
			this._ensureTrailingUserMessage(); // Add trailing user message if needed
			// --- End System Message and Trailing User Message ---

			this.notificationHandler('Chat history loaded successfully.', 'success');

			this._notifyUpdate(); // Notify that the message list has changed

		} catch (error) {
			console.error("Failed to parse messages JSON:", error);
			this.notificationHandler(`Failed to load chat history: ${error.message}`, 'error');
			// Do not modify this.messages if parsing/validation failed
		}
	}

	/**
	 * Renders all managed messages into the specified container element.
	 * Clears the container before rendering.
	 * @param {HTMLElement} [container=this.container] - The DOM element to render messages into. If not provided, uses the container set in the constructor.
	 */
	render(container = this.container) {
		const targetContainer = container || this.container;
		if (!targetContainer) {
			console.error("ChatManager.render: No container element provided or set.");
			this.notificationHandler("Cannot render chat: Container not specified.", "error");
			return;
		}
		if (!(targetContainer instanceof Node)) {
			console.error('ChatManager.render: Provided container is not a valid DOM Node.', targetContainer);
			this.notificationHandler("Cannot render chat: Invalid container.", "error");
			return;
		}

		// Store container if passed and not already set
		if (container && !this.container) {
			this.container = container;
		}

		// Clear existing content
		targetContainer.innerHTML = '';

		// Render each message
		this.messages.forEach(message => {
			message.render(targetContainer);
		});
	}

	/**
	 * Sets or updates the container element for rendering.
	 * @param {HTMLElement} containerElement - The DOM element.
	 */
	setContainer(containerElement) {
		if (containerElement instanceof Node) {
			this.container = containerElement;
		} else {
			console.error("ChatManager.setContainer: Invalid container element provided.");
		}
	}

	/**
	 * Gets the system prompt message content.
	 * @returns {string} The content of the system message.
	 */
	getSystemPrompt() {
		// The system message is guaranteed to be the first element.
		return this.messages[0]?.content || '';
	}

	/**
	 * Updates the content of the system prompt message.
	 * @param {string} newContent - The new content for the system prompt.
	 */
	updateSystemPrompt(newContent) {
		// The system message is guaranteed to be the first element.
		const systemMsg = this.messages[0];
		if (systemMsg && systemMsg.role === ROLES.SYSTEM) {
			systemMsg.content = newContent; // Update internal content

			// Update the DOM element directly if it exists
			const contentEl = systemMsg.element?.querySelector(`.${CSS_CLASSES.EDITABLE_CONTENT}`);
			if (contentEl) {
				contentEl.textContent = newContent;
			}

			this.notificationHandler('System prompt updated.', 'info');

			// Note: Technically only content changed, not the structure.
			// A full update notification might trigger a full re-render, which is slightly inefficient here.
			// However, for simplicity, we notify of an update. A more complex system might have different notification types.
			this._notifyUpdate();
		} else {
			// This case should theoretically not happen due to constructor enforcement
			console.error("Could not find the system message to update.");
			this.notificationHandler('Error updating system prompt.', 'error');
		}
	}
	/**
	 * Checks if any message in the chat is currently being edited.
	 * @returns {boolean} True if any message is being edited, false otherwise.
	 */
	hasActiveEdits() {
		return this.messages.some(message => message.isBeingEdited());
	}

	/**
	 * Gets the trailing user message (which should be empty unless being edited)
	 * @returns {ChatMessage|null} The trailing user message or null if not found
	 */
	getTrailingUserMessage() {
		const lastMessage = this.messages[this.messages.length - 1];
		if (lastMessage && lastMessage.role === ROLES.USER) {
			return lastMessage;
		}
		return null;
	}
}