# RPChat - Dual Character Interaction Development Plan

## 1. Goals

*   Enable two AI-driven characters to interact with each other within the RPChat interface.
*   Allow each character to have private knowledge (via system prompts) not visible to the other character's AI model.
*   Maintain the user's ability to observe, edit responses from both characters, and manually trigger each character's turn.
*   Ensure that the entire interaction, including private prompts and character assignments, can be saved and loaded via the existing import/export functionality.
*   Implement these changes incrementally, ensuring the application remains functional for standard single-user chat throughout the development process.

## 2. Implementation Plan

This plan focuses on a step-by-step approach, aiming to keep the codebase in a working state as much as possible. We'll start with backend data structures and logic, then move to UI elements.

---

### Phase 0: Core Data Structure Modifications (Minimal UI Impact)

**Objective:** Introduce `characterId` and `visibility` to `ChatMessage` and adapt `ChatManager` to handle these new properties gracefully, ensuring existing single-user functionality remains unchanged.

**Step 1: Enhance `ChatMessage` Class**
*   **Tasks:**
    *   Add `characterId: number` property to `ChatMessage`. Default to `0` (representing the human user or global context).
    *   Add `visibility: number` property to `ChatMessage`. Default to `1` (public). `0` will represent private.
    *   Update the `ChatMessage` constructor to accept and initialize `characterId` and `visibility`.
    *   In `createMessageElement`, add `data-character-id` and `data-visibility` attributes to the main message element (`messageEl.dataset.characterId = this.characterId; messageEl.dataset.visibility = this.visibility;`).
    *   Add a console log method that prints the new vars and attributes and call it when a message is created.
*   **Testing:** Ensure the app loads and basic chat (single user) still functions. No visual changes expected yet.

**Step 2: Adapt `ChatManager` for New Message Properties**
*   **Tasks:**
    *   Modify `ChatManager.createMessage()` to accept `characterId` and `visibility` and pass them to the `ChatMessage` constructor.
        *   Update existing calls to `createMessage` to pass default values (e.g., `characterId: 0, visibility: 1`) where appropriate (like for the initial system prompt if not otherwise spe  cified, or for app messages).
    *   The `_ensureTrailingUserMessage` method should create user messages with `characterId: 0, visibility: 1`.
*   **Testing:** Verify single-user chat, including adding new messages, still works. System prompt and user messages should have default `characterId` and `visibility`.

**Step 3: Update Persistence (`getMessagesJSON`, `parseMessagesJSON`)**
*   **Tasks:**
    *   In `ChatManager.getMessagesJSON()`:
        *   Ensure `characterId` and `visibility` are included in the objects returned for each message.
    *   In `ChatManager.parseMessagesJSON()`:
        *   When recreating `ChatMessage` instances from loaded data, read `characterId` and `visibility` and pass them to `createMessage`. Provide default values if these fields are missing from older chat exports (for backward compatibility).
*   **Testing:**
    *   Export a chat, inspect the JSON to confirm new fields are present.
    *   Import the chat and verify messages are restored correctly (still in single-user m  ode).
    *   Import an old chat file (without these fields) and ensure it loads with default values.

---

### Phase 1: Implementing Core Two-Character Logic (Backend First)

**Objective:** Implement the fundamental logic for assembling API requests from the perspective of alternating characters, without significant UI changes yet. Testing might involve console commands or temporarily hardcoding states.

**Step 4: Introduce Multi-Character State Management**
*   **Tasks:**
    *   In the `ChatManager` class:
        *   Add `isMultiCharacterMode: boolean` property, defaulting to `false`.
        *   Add `characterDefinitions: Array<{id: number, privatePrompt: string, model?: string}>` property, defaulting to an empty array.
        *   Add `currentCharacterTurn: number` property, defaulting to `1` (or a suitable initial value).
    *   Update the `ChatManager` constructor to initialize these properties, or add new methods (e.g., `enableMultiCharacterMode(definitions)`, `setCharacters(definitions)`) to manage this state.
    *   **Testing:** No direct functional change yet, but these properties will be used in subsequent steps. `ChatManager` instances should correctly initialize these values.
*   **Testing:** No direct functional change, but these variables will be used in subsequent steps.

**Step 5: Develop `ChatManager.prepareApiMessagesForCharacter()`**
*   **Tasks:**
    *   Create a new method: `prepareApiMessagesForCharacter(nextCharacterId: number, allMessages: ChatMessage[])`.
    *   This method will iterate through `allMessages` and build a new array of plain message objects (`{role: string, content: string}`) according to the rules:
        *   Global system messages (`characterId: 0, visibility: 1`) -> `role: 'system'`.
        *   Private messages for `nextCharacterId` (`characterId: nextCharacterId, visibility: 0`) -> `role: 'system'`.
        *   Public messages *from* `nextCharacterId` (`characterId: nextCharacterId, visibility: 1`) -> `role: 'assistant'`.
        *   Public messages *from other characters* (`characterId !== nextCharacterId && characterId !== 0, visibility: 1`) -> `role: 'user'`.
        *   Public messages from human user (`characterId: 0, visibility: 1` and `role: ROLES.USER`) -> `role: 'user'`.
        *   Omit private messages not belonging to `nextCharacterId`.
        *   Preserve message order.
*   **Testing:** Unit test this method with various `allMessages` scenarios to ensure correct context generation for each character.

**Step 6: Modify API Call Logic for Multi-Character Mode**
*   **Tasks:**
    *   In `handleSendMessage()` (or a new function `handleCharacterTurn()`):
        *   If `chatManager.isMultiCharacterMode` is true:
            1.  Determine `nextCharacterId` (e.g., from `chatManager.currentCharacterTurn` or a new `chatManager.getNextCharacterId()` method).
            2.  Get all messages from `chatManager.messages`.
            3.  Call `chatManager.prepareApiMessagesForCharacter(nextCharacterId, chatManager.messages)` to get the `apiMessages`.
            4.  Proceed with `callAPI(apiMessages)`.
            5.  In `handleApiResponse`, when adding the assistant's message, set its `characterId` to `nextCharacterId` and `visibility` to `1` (public).
            6.  After a successful response, `chatManager` should update its `currentCharacterTurn` (e.g., via a method like `chatManager.advanceTurn()`).
        *   Else (single-user mode): Use existing logic (which might now internally use `chatManager.getMessagesForApi()` or similar, rather than `chatManager.getMessagesJSON()` if that's purely for export).
*   **Testing:**
    *   Temporarily set `chatManager.isMultiCharacterMode = true` (perhaps via a `chatManager.setMultiCharacterMode(true)` call) and use `chatManager` methods to set up `characterDefinitions`. Add initial character prompts and an opening public message.
    *   Trigger `handleSendMessage`. Verify the correct API payload is generated for char 2.
    *   After char 2 responds, trigger again. Verify payload for char 1.

---

### Phase 2: UI for Mode Selection and Character Setup

**Objective:** Provide UI elements for the user to switch to multi-character mode and define the initial private/system prompts for each character.

**Step 7: UI for Mode Switching**
*   **Tasks:**
    *   Add a simple UI element (e.g., a checkbox or a toggle button in the header/footer) to switch `isMultiCharacterMode` between `true` and `false`.
        *   This UI element should call a method on `chatManager` (e.g., `chatManager.setMultiCharacterMode(true/false)` or `chatManager.toggleMultiCharacterMode()`).
    *   When switching to multi-character mode, the UI might prompt for character definitions, which are then passed to `chatManager`.
    *   `ChatManager` should handle the persistence of its `isMultiCharacterMode` state (and related `characterDefinitions`, `currentCharacterTurn`) as part of its overall state management (see Step 13).
    *   **Testing:** Toggle the mode. Verify `chatManager.isMultiCharacterMode` updates. The application's behavior in `handleSendMessage` should change accordingly.
*   **Testing:** Toggle the mode and verify the application state changes.

**Step 8: "Add to History" Functionality & Initial Setup UI**
*   **Tasks:**
    *   Create a new input mechanism or modify the existing one to allow adding messages directly to `chatManager` *without* sending them to the API. This is for setting up initial prompts.
        *   This might involve a new button "Add to History" next to the "Send" button.
        *   When adding, UI elements (dropdowns?) should allow setting `role`, `characterId` (0 for global, 1 for Char1, 2 for Char2), and `visibility` (private/public) for the message being added.
    *   Guide the user (perhaps via placeholder text or a small instruction panel when in multi-character mode) to:
        1.  Add a global system prompt (`characterId: 0, visibility: 1`).
        2.  Use a new UI (or modified existing UI) to define characters (e.g., private prompts, models) which will update `chatManager.characterDefinitions`.
        2.  Add Character 1's private prompt (`characterId: 1, visibility: 0, role: ROLES.SYSTEM`).
        3.  Add Character 2's private prompt (`characterId: 2, visibility: 0, role: ROLES.SYSTEM`).
        4.  Add Character 1's first public utterance (`characterId: 1, visibility: 1, role: ROLES.USER` or a new specific role).
*   **Testing:** Use the new UI to set up a 2-character scenario. Verify messages are added to `chatManager.messages` with correct properties.

**Step 9: Adapt "Send" Button for Turn-Based Interaction**
*   **Tasks:**
    *   If `isMultiCharacterMode` is true:
        *   Change the "Send" button's label to reflect whose turn it is (e.g., "Generate for Character X"), using `chatManager.currentCharacterTurn` and `chatManager.characterDefinitions` to get character info.
        *   The button should trigger the multi-character logic from Step 6.
    *   The main text input area might be disabled or repurposed in multi-character mode if turns are purely AI-generated after setup. (User edits messages directly).
*   **Testing:** Perform a full 2-character interaction using the UI.

---

### Phase 3: Visual Distinction and Enhanced Controls

**Objective:** Make it clear which character said what and indicate message visibility.

**Step 10: Styling Messages by Character and Visibility**
*   **Tasks:**
    *   In `ChatMessage.createMessageElement()`:
        *   Add CSS classes based on `this.characterId` (e.g., `character-1`, `character-2`).
        *   Add a CSS class if `this.visibility === 0` (e.g., `private-message`).
    *   Define CSS rules for these classes (e.g., different background colors, borders, or alignment for characters; opacity or an icon for private messages).
*   **Testing:** Visually confirm that messages are styled correctly in a multi-character chat.

**Step 11: (Optional Stretch) UI Controls for `characterId` and `visibility` on Messages**
*   **Tasks:**
    *   When a message is being edited (`startEditing()`), display its current `characterId` and `visibility`.
    *   Provide controls (dropdowns?) to change these values during an edit.
    *   Consider the implications of changing these on an existing message.
*   **Testing:** Edit messages and verify changes to these properties are saved and reflected.

---

### Phase 4: Refinements, Edge Cases, and Finalization

**Objective:** Polish the feature, ensure robustness, and handle interactions with existing features.

**Step 12: Address `_ensureTrailingUserMessage()`**
*   **Tasks:**
    *   In `ChatManager`, modify `_ensureTrailingUserMessage()` so it does *not* add a trailing user message if `isMultiCharacterMode` is true, as the flow is different.
        *   This check will now use `this.isMultiCharacterMode` within the `ChatManager` method.
*   **Testing:** Ensure no unwanted empty messages appear at the end of multi-character chats.

**Step 13: Import/Export for Multi-Character Chats**
*   **Tasks:**
    *   Thoroughly test exporting a multi-character chat session.
    *   Verify that importing this session correctly restores `ChatManager`'s internal state, including `isMultiCharacterMode`, `characterDefinitions`, and `currentCharacterTurn`, in addition to all message properties (`characterId`, `visibility`).
    *   `ChatManager.getMessagesJSON()` might need to be augmented or a new method like `getChatStateJSON()` created to include this additional state.
    *   `ChatManager.parseMessagesJSON()` or a new `loadChatStateJSON(data)` method will need to parse this state and rehydrate the `ChatManager` instance.
    *   The main application's `loadStateFromStorage` and `onChatUpdate` (for saving) will interact with these new/updated `ChatManager` methods.
*   **Testing:** Full export/import cycle of a multi-character conversation.

**Step 14: User Editing Flow in Multi-Character Mode**
*   **Tasks:**
    *   Ensure that editing any message (global system, private character prompt, or public utterance) works smoothly.
    *   After an edit is saved, the next "Generate for Character X" should use the updated content.
*   **Testing:** Edit various messages in a multi-character chat and observe the impact on subsequent AI generations.

**Step 15: Review, Refactor, and Document**
*   **Tasks:**
    *   Review all new code for clarity, efficiency, and potential bugs.
    *   Refactor as needed.
    *   Update any relevant comments or internal documentation.
    *   Update `README.md` to explain the new multi-character feature.
*   **Testing:** General usability testing.

---

This plan provides a structured approach. We'll likely discover nuances and adjust as we go. The key is to test thoroughly at each step.