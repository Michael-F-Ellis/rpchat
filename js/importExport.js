window.RPChat = window.RPChat || {};
window.RPChat.importExport = (function () {
	// Function to export chat data
	function exportChat(messages, systemMessage) {
		const chatData = {
			messages: messages,
			systemPrompt: systemMessage.content,
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

	// Function to set up import/export UI elements
	function setupImportExport(header, messagesRef, systemPromptAccess, renderMessages, showStatus) {
		// Remove any existing buttons to prevent duplicates
		const existingExportBtn = document.getElementById('export-chat');
		const existingImportBtn = document.getElementById('import-chat');
		const existingImportInput = document.getElementById('import-input');

		if (existingExportBtn) existingExportBtn.remove();
		if (existingImportBtn) existingImportBtn.remove();
		if (existingImportInput) existingImportInput.remove();

		const exportBtn = document.createElement('button');
		exportBtn.id = 'export-chat';
		exportBtn.textContent = 'Export Chat';
		exportBtn.addEventListener('click', () => exportChat(messagesRef, SYSTEM_MESSAGE));

		const importInput = document.createElement('input');
		importInput.type = 'file';
		importInput.id = 'import-input';
		importInput.accept = '.json';
		importInput.style.display = 'none';

		const importBtn = document.createElement('button');
		importBtn.id = 'import-chat';
		importBtn.textContent = 'Import Chat';
		importBtn.addEventListener('click', () => importInput.click());

		importInput.addEventListener('change', (event) => {
			const file = event.target.files[0];
			if (file) {
				const reader = new FileReader();

				reader.onload = function (e) {
					try {
						const importedData = JSON.parse(e.target.result);

						// Basic validation
						if (!importedData || !Array.isArray(importedData.messages) || typeof importedData.systemPrompt !== 'string') {
							throw new Error('Invalid chat file format.');
						}

						// Clear existing messages and push imported ones
						messagesRef.length = 0; // Clear the array in place
						messagesRef.push(...importedData.messages); // Add new messages

						// Update system prompt using the setter
						systemPromptAccess.set(importedData.systemPrompt);

						// Persist changes
						localStorage.setItem('chatHistory', JSON.stringify(messagesRef));
						localStorage.setItem('systemPrompt', importedData.systemPrompt);

						renderMessages(); // Update the UI with the imported messages

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

		// Append buttons and input to the header
		header.appendChild(exportBtn);
		header.appendChild(importBtn);
		header.appendChild(importInput); // Keep the input in the DOM, just hidden
	}

	return {
		setupImportExport: setupImportExport,
		exportChat: exportChat
	};
})();