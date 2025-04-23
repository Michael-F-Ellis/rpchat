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

class ChatMessage {
	constructor(role, content, deleteCB, deleteFromHereCB, notificationHandler) {
		this.role = role;
		if (!Object.values(ROLES).includes(role)) {
			throw new Error(`Invalid role: must be one of ${Object.values(ROLES).join(', ')}`);
		}
		this.content = content || '';
		this.id = crypto.randomUUID(); // Modern browsers
		this.element = this.createMessageElement();
		this.deleteCB = deleteCB || function () { console.log('deleteCB not provided'); };
		this.deleteFromHereCB = deleteFromHereCB || function () { console.log('deleteFromHereCB not provided'); };
		this.notificationHandler = notificationHandler || function (message, type) { console.log(`Notification (${type}): ${message}`); };
	}
	createMessageElement() {
		const messageEl = document.createElement('div');
		// Assign base classes and role-specific class
		messageEl.className = `${CSS_CLASSES.MESSAGE} ${this.role === ROLES.USER ? CSS_CLASSES.USER_MESSAGE :
			this.role === ROLES.ASSISTANT ? CSS_CLASSES.ASSISTANT_MESSAGE :
				CSS_CLASSES.SYSTEM_MESSAGE
			}`;
		messageEl.dataset.id = this.id;

		// --- Content and Controls ---
		const contentEl = document.createElement('div');
		contentEl.className = CSS_CLASSES.EDITABLE_CONTENT;
		contentEl.textContent = this.content;

		const controlsEl = document.createElement('div');
		controlsEl.className = CSS_CLASSES.MESSAGE_CONTROLS;
		this.createMessageControlButtons(this.id, controlsEl);

		// --- Conditional Structure for System Messages ---
		if (this.role === ROLES.SYSTEM) {
			messageEl.classList.add(CSS_CLASSES.COLLAPSIBLE);

			// Create Toggle Button
			const toggleBtn = document.createElement('button');
			toggleBtn.className = CSS_CLASSES.TOGGLE_COLLAPSE;
			toggleBtn.textContent = '▶️ Show System Prompt'; // Initial state: collapsed
			// Add ARIA attributes for accessibility
			toggleBtn.setAttribute('aria-expanded', 'false');
			// Ideally, the message body would have an ID, but we can select it later
			// toggleBtn.setAttribute('aria-controls', `system-body-${this.id}`);

			// Create Wrapper for Content + Controls
			const messageBody = document.createElement('div');
			messageBody.className = `${CSS_CLASSES.MESSAGE_BODY} ${CSS_CLASSES.COLLAPSED}`; // Start collapsed
			// messageBody.id = `system-body-${this.id}`; // For aria-controls
			messageBody.setAttribute('aria-hidden', 'true');

			// Append original content and controls to the wrapper
			messageBody.appendChild(contentEl);
			messageBody.appendChild(controlsEl);

			// Add Event Listener to Toggle Button
			toggleBtn.addEventListener('click', (event) => {
				const isCollapsed = messageBody.classList.toggle(CSS_CLASSES.COLLAPSED);
				const isHidden = messageBody.classList.contains(CSS_CLASSES.COLLAPSED); // Re-check after toggle

				// Update button text/icon and ARIA attributes
				event.target.textContent = isHidden ? '▶️ Show System Prompt' : '▼ Hide System Prompt';
				event.target.setAttribute('aria-expanded', !isHidden);
				messageBody.setAttribute('aria-hidden', isHidden);
			});

			// Append Toggle Button and Collapsible Body to Message Element
			messageEl.appendChild(toggleBtn);
			messageEl.appendChild(messageBody);

		} else {
			// For User, Assistant and App messages, append directly
			messageEl.appendChild(contentEl);
			messageEl.appendChild(controlsEl);
		}

		return messageEl;
	}	// Generate message control buttons
	createMessageControlButtons(messageId, controlsEl) {
		// Add edit button (Applies to system, user, and assistant)
		if (this.role !== ROLES.APP) {
			const editBtn = document.createElement('button');
			editBtn.className = `${CSS_CLASSES.ICON_BUTTON} edit-message`; // Using constant
			editBtn.textContent = '🖊️'; // Using textContent
			editBtn.addEventListener('click', () => this.startEditing());
			controlsEl.appendChild(editBtn);
		}
		// Add delete button ONLY if the role is NOT system
		if (this.role !== ROLES.SYSTEM) {
			const deleteBtn = document.createElement('button');
			deleteBtn.className = `${CSS_CLASSES.ICON_BUTTON} delete-message`; // Using constant
			deleteBtn.textContent = '🗑️'; // Using textContent
			deleteBtn.addEventListener('click', () => this.deleteCB(messageId));
			controlsEl.appendChild(deleteBtn);
		}

		// Add delete-from-here button (only for user messages - remains unchanged)
		if (this.role === ROLES.USER) {
			const deleteFromHereBtn = document.createElement('button');
			deleteFromHereBtn.className = `${CSS_CLASSES.ICON_BUTTON} delete-from-here`; // Using constant
			deleteFromHereBtn.textContent = '🗑️⬇️'; // Using textContent
			deleteFromHereBtn.addEventListener('click', () => this.deleteFromHereCB(messageId));
			controlsEl.appendChild(deleteFromHereBtn);
		}
	}	// Start editing a message
	startEditing() {
		// get the content element. It's a child of this.element
		const contentEl = this.element.querySelector('.editable-content');
		// stash the original content
		this.originalContent = contentEl.textContent.trim();
		// Make content editable
		contentEl.contentEditable = true;
		contentEl.focus();

		// Set editing state
		this.isEditing = true;

		// Change controls
		const controlsEl = this.element.querySelector('.message-controls')
		controlsEl.innerHTML = '';

		const saveBtn = document.createElement('button'); saveBtn.className = 'save-edit';
		saveBtn.textContent = 'Save';
		saveBtn.addEventListener('click', () => this.saveEdit());

		const cancelBtn = document.createElement('button');
		cancelBtn.className = 'cancel-edit';
		cancelBtn.textContent = 'Cancel';
		cancelBtn.addEventListener('click', () => this.cancelEdit());

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

	// Save edited message (called when user clicks save)
	// No explicit save required, simply leave edited content
	saveEdit() {
		// Reset UI
		const contentEl = this.element.querySelector('.editable-content');
		contentEl.contentEditable = false;

		// Update content property with edited text
		this.content = contentEl.textContent.trim();

		// Reset editing state
		this.isEditing = false;

		// Restore normal controls
		this.resetMessageControls();

		showStatus('Message updated successfully', 'success');
	}

	// Cancel editing
	cancelEdit() {
		// restore content saved by startEditing
		const contentEl = this.element.querySelector('.editable-content');
		contentEl.textContent = this.originalContent;

		// Reset UI
		contentEl.contentEditable = false;

		// Reset editing state
		this.isEditing = false;

		// Restore normal controls
		this.resetMessageControls();
	}

	// Add a method to check if message is being edited
	isBeingEdited() {
		return this.isEditing;
	}	// Reset message controls after editing
	resetMessageControls() {
		// Clear existing controls
		const controlsEl = this.element.querySelector('.message-controls');
		controlsEl.innerHTML = '';

		this.createMessageControlButtons(this.id, controlsEl);
	}

	render(container) {
		if (!(container instanceof Node)) {
			console.error('ChatMessage.render: Provided container is not a valid DOM Node.', container);
			return; // Or throw an error
		}
		container.appendChild(this.element);
	}
}

