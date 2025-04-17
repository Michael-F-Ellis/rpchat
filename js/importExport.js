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
	function setupImportExport(header, messagesRef, SYSTEM_MESSAGE, systemPromptTextarea, renderMessages, showStatus) {
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
				reader.onload = (e) => {
					try {
						const importedData = JSON.parse(e.target.result);
						if (confirm('Import this chat? Current chat will be replaced.')) {
							// Get a reference to the outer scope messages array
							const messagesArray = window.RPChat.app.getMessages();

							// Clear the existing messages array
							messagesArray.length = 0;

							// Add the imported messages
							if (Array.isArray(importedData.messages)) {
								importedData.messages.forEach(msg => messagesArray.push(msg));
							}

							if (importedData.systemPrompt) {
								SYSTEM_MESSAGE.content = importedData.systemPrompt;
								systemPromptTextarea.value = importedData.systemPrompt;
								localStorage.setItem('systemPrompt', importedData.systemPrompt);
							}

							localStorage.setItem('chatHistory', JSON.stringify(messagesArray));
							renderMessages();
							showStatus('Chat imported successfully', 'success');
						}
					} catch (error) {
						console.error('Import error:', error);
						showStatus('Error importing chat: Invalid format', 'error');
					}
				};
				reader.readAsText(file);
			}
		});

		header.appendChild(exportBtn);
		header.appendChild(importBtn);
		document.body.appendChild(importInput);
	}

	// Public API
	return {
		setupImportExport: setupImportExport,
		exportChat: exportChat
	};
})();
