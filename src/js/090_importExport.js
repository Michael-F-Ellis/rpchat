/* IMPORT EXPORT */
window.RPChat = window.RPChat || {};
window.RPChat.importExport = (function () {
	// Function to export chat data
	function exportChat(messages) {
		const chatData = {
			messages: messages, // Just export the data, not the full objects
			exportDate: new Date().toISOString()
		};

		const dataStr = JSON.stringify(chatData, null, 2);
		const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

		const exportFileDefaultName = `rpchat-export-${new Date().toISOString().slice(0, 10)}.json`;

		const linkElement = document.createElement('a');
		linkElement.setAttribute('href', dataUri);
		linkElement.setAttribute('download', exportFileDefaultName);
		linkElement.click();
	}

	// Function to set up import/export UI elements using existing buttons
	function setupImportExport(chatManager, showStatus) {
		// Get references to existing buttons in the footer
		const exportBtn = document.getElementById('export-chat');
		const importBtn = document.getElementById('import-chat');
		const extractBtn = document.getElementById('extract-chat-md');

		// Create a hidden file input for import
		const importInput = document.createElement('input');
		importInput.type = 'file';
		importInput.id = 'import-input';
		importInput.accept = '.json';
		importInput.style.display = 'none';
		document.body.appendChild(importInput);

		// Add event listeners to the existing buttons
		if (exportBtn) {
			exportBtn.addEventListener('click', () => {
				exportChat(chatManager.getMessagesJSON());
			});
		} else {
			console.error('Export button not found in the DOM');
		}

		if (importBtn) {
			importBtn.addEventListener('click', () => importInput.click());
		} else {
			console.error('Import button not found in the DOM');
		}

		// New logic for Markdown extraction
		if (extractBtn) {
			const modal = El.extractMdModal;

			extractBtn.addEventListener('click', () => {
				modal.style.display = 'flex';
			});

			El.extractMdCancelBtn.addEventListener('click', () => {
				modal.style.display = 'none';
			});

			El.extractMdConfirmBtn.addEventListener('click', () => {
				const assistant = El.mdIncludeAssistant.checked;
				const user = El.mdIncludeUser.checked;
				const system = El.mdIncludeSystem.checked;
				const labels = El.mdIncludeLabels.checked;

				const markdownContent = window.extractChatToMarkdown(assistant, user, system, labels);

				if (markdownContent) {
					const dataUri = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdownContent);
					const exportFileDefaultName = `rpchat-extract-${new Date().toISOString().slice(0, 10)}.md`;

					const linkElement = document.createElement('a');
					linkElement.setAttribute('href', dataUri);
					linkElement.setAttribute('download', exportFileDefaultName);
					linkElement.click();
				}
				modal.style.display = 'none';
			});

			window.addEventListener('click', (event) => {
				if (event.target === modal) {
					modal.style.display = 'none';
				}
			});

		} else {
			console.error('Extract button not found in the DOM');
		}

		importInput.addEventListener('change', (event) => {
			const file = event.target.files[0];
			if (file) {
				const reader = new FileReader();

				reader.onload = function (e) {
					try {
						const importedData = JSON.parse(e.target.result);

						// Basic validation
						if (!importedData || !Array.isArray(importedData.messages)) {
							throw new Error('Invalid chat file format.');
						}

						// Clear existing messages
						chatManager.messages.length = 0;

						// Use ChatManager's methods to properly create new ChatMessage instances
						// First add the system message (should be the first one in the array)
						const systemMessage = importedData.messages.find(msg => msg.role === 'system');

						// Save the imported system prompt to sessionStorage
						if (systemMessage) {
							sessionStorage.setItem('importedSystemPrompt', systemMessage.content);
						}

						// Create a batch of messages to add
						const messagesToAdd = [];

						// Add system message first if it exists
						if (systemMessage) {
							messagesToAdd.push(systemMessage);
						}

						// Add all non-system messages in order
						importedData.messages
							.filter(msg => msg.role !== 'system')
							.forEach(msg => {
								messagesToAdd.push(msg);
							});

						// Add all messages in one batch
						chatManager.addMessages(messagesToAdd);

						// Persist changes
						sessionStorage.setItem('chatMessages', JSON.stringify(chatManager.getMessagesJSON()));

						// Update the system prompt selector to include the "Imported" option
						updateSystemPromptSelector();

						// Set the selector to "Imported" if we have an imported system prompt
						if (systemMessage) {
							El.systemPromptSelector.value = 'imported';
						}

						// Render the chat
						chatManager.render();

						showStatus('Chat imported successfully', 'success');

					} catch (error) {
						console.error('Error importing chat:', error);
						showStatus(`Error importing chat: ${error.message}`, 'error');
					} finally {
						// Reset the input value to allow importing the same file again
						importInput.value = '';
					}
				};

				reader.onerror = function () {
					showStatus('Error reading file', 'error');
					// Reset the input value
					importInput.value = '';
				};

				reader.readAsText(file);
			}
		});
	}

	return {
		setupImportExport: setupImportExport,
		exportChat: exportChat
	};
})();
