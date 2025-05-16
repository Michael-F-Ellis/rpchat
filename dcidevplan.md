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
        *   Update existing calls to `createMessage` to pass default values (e.g., `characterId: 0, visibility: 1`) where appropriate (like for the initial system prompt if not otherwise specified, or for app messages).
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
    *   Import the chat and verify messages are restored correctly (still in single-user mode).
    *   Import an old chat file (without these fields) and ensure it loads with default values.

---

### Phase 1: Implementing Core Two-Character Logic (Backend First)

**Objective:** Implement the fundamental logic for assembling API requests from the perspective of alternating characters, without significant UI changes yet. Testing might involve console commands or temporarily hardcoding states.

**Step 4: Introduce Multi-Character State Management**
*   **Tasks:**
    *   In the main application scope (outside classes, near `apiKeys`, `currentProvider`, etc.):
        *   Add `isMultiCharacterMode: boolean = false;`
        *   Add `characterDefinitions: Array<{id: number, privatePrompt: string, model?: string}> = [];` (Initially, we can assume two characters, e.g., IDs 1 and 2).
        *   Add `currentCharacterTurn: number = 1;` (To track whose turn it is).
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
        *   If `isMultiCharacterMode` is true:
            1.  Determine `nextCharacterId` (e.g., `currentCharacterTurn`).
            2.  Get all messages from `chatManager.messages`.
            3.  Call `chatManager.prepareApiMessagesForCharacter(nextCharacterId, chatManager.messages)` to get the `apiMessages`.
            4.  Proceed with `callAPI(apiMessages)`.
            5.  In `handleApiResponse`, when adding the assistant's message, set its `characterId` to `nextCharacterId` and `visibility` to `1` (public).
            6.  After a successful response, update `currentCharacterTurn` (e.g., if it was 1, set to 2; if 2, set to 1).
        *   Else (single-user mode): Use existing logic (`chatManager.getMessagesJSON()`).
*   **Testing:**
    *   Temporarily set `isMultiCharacterMode = true` and hardcode/console-add initial character prompts (private system messages for char 1 & 2) and an opening public message from char 1.
    *   Trigger `handleSendMessage`. Verify the correct API payload is generated for char 2.
    *   After char 2 responds, trigger again. Verify payload for char 1.

---

### Phase 2: UI for Mode Selection and Initial Character Setup

**Objective:** Provide UI elements for the user to switch to multi-character mode and define the initial private/system prompts for each character.

**Step 7: UI for Mode Switching**
*   **Tasks:**
    *   Add a simple UI element (e.g., a checkbox or a toggle button in the header/footer) to switch `isMultiCharacterMode` between `true` and `false`.
    *   When switching to multi-character mode, perhaps prompt for the number of characters (default to 2 for now).
    *   Store `isMultiCharacterMode` in `sessionStorage`.
*   **Testing:** Toggle the mode and verify the application state changes.

**Step 8: "Add to History" Functionality & Initial Setup UI**
*   **Tasks:**
    *   Create a new input mechanism or modify the existing one to allow adding messages directly to `chatManager` *without* sending them to the API. This is for setting up initial prompts.
        *   This might involve a new button "Add to History" next to the "Send" button.
        *   When adding, UI elements (dropdowns?) should allow setting `role`, `characterId` (0 for global, 1 for Char1, 2 for Char2), and `visibility` (private/public) for the message being added.
    *   Guide the user (perhaps via placeholder text or a small instruction panel when in multi-character mode) to:
        1.  Add a global system prompt (`characterId: 0, visibility: 1`).
        2.  Add Character 1's private prompt (`characterId: 1, visibility: 0, role: ROLES.SYSTEM`).
        3.  Add Character 2's private prompt (`characterId: 2, visibility: 0, role: ROLES.SYSTEM`).
        4.  Add Character 1's first public utterance (`characterId: 1, visibility: 1, role: ROLES.USER` or a new specific role).
*   **Testing:** Use the new UI to set up a 2-character scenario. Verify messages are added to `chatManager.messages` with correct properties.

**Step 9: Adapt "Send" Button for Turn-Based Interaction**
*   **Tasks:**
    *   If `isMultiCharacterMode` is true:
        *   Change the "Send" button's label to reflect whose turn it is (e.g., "Generate for Character X").
        *   The button should trigger the logic from Step 6.
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
*   **Testing:** Ensure no unwanted empty messages appear at the end of multi-character chats.

**Step 13: Import/Export for Multi-Character Chats**
*   **Tasks:**
    *   Thoroughly test exporting a multi-character chat session.
    *   Verify that importing this session correctly restores `isMultiCharacterMode`, `characterDefinitions` (if stored), `currentCharacterTurn`, and all message properties (`characterId`, `visibility`).
    *   The `chatManager.parseMessagesJSON` should already handle the message properties from Step 3. Additional app state might need to be saved/loaded in `init()` and `loadStateFromStorage()`.
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