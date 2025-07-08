package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
)

// ChatRequest represents a request to the chat API
type APIRequest struct {
	Messages    []Message `json:"messages"`
	Temperature float64   `json:"temperature,omitempty"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
}

// ChatResponse represents a response from the chat API
type APIResponse struct {
	Message  string `json:"message"`
	Tokens   int    `json:"tokens"`
	Duration int    `json:"duration_ms"`
	Error    string `json:"error,omitempty"`
}

// ServerState holds the current server configuration that can be changed at runtime
type ServerState struct {
	mu                 sync.RWMutex
	currentProvider    Provider
	currentModel       Model
	currentAPIKey      string
	availableProviders ProviderMap
	apiKeys            APIKeys
	client             *ChatClient
}

// NewServerState creates a new server state with validated providers
func NewServerState(providersMap ProviderMap, apiKeys APIKeys, initialProvider Provider, initialModel Model, initialAPIKey string) *ServerState {
	// Filter providers to only include those with valid API keys
	validProviders := make(ProviderMap)
	for providerID, provider := range providersMap {
		apiKey, err := apiKeys.Get(providerID)
		if err == nil && !isDummyAPIKey(apiKey) {
			validProviders[providerID] = provider
		}
	}

	return &ServerState{
		currentProvider:    initialProvider,
		currentModel:       initialModel,
		currentAPIKey:      initialAPIKey,
		availableProviders: validProviders,
		apiKeys:            apiKeys,
		client:             NewChatClient(),
	}
}

// isDummyAPIKey checks if an API key is a placeholder/dummy value
func isDummyAPIKey(apiKey string) bool {
	if apiKey == "" {
		return true
	}
	// Check for common dummy patterns
	dummy := strings.ToLower(apiKey)
	return strings.Contains(dummy, "your") ||
		strings.Contains(dummy, "dummy") ||
		strings.Contains(dummy, "placeholder") ||
		strings.Contains(dummy, "replace") ||
		apiKey == "sk-..." ||
		len(apiKey) < 10 // Very short keys are likely dummy
}

// SetProvider changes the current provider and validates the current model
func (s *ServerState) SetProvider(providerID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	provider, exists := s.availableProviders[providerID]
	if !exists {
		return fmt.Errorf("provider %s not found or not available", providerID)
	}

	apiKey, err := s.apiKeys.Get(providerID)
	if err != nil {
		return fmt.Errorf("no API key for provider %s", providerID)
	}

	s.currentProvider = provider
	s.currentAPIKey = apiKey

	// Check if current model is available for this provider
	_, err = provider.GetModel(s.currentModel.ID)
	if err != nil {
		// If current model not available, switch to first available model
		if len(provider.Models) > 0 {
			s.currentModel = provider.Models[0]
		} else {
			return fmt.Errorf("provider %s has no available models", providerID)
		}
	}

	return nil
}

// SetModel changes the current model if it's available for the current provider
func (s *ServerState) SetModel(modelID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	model, err := s.currentProvider.GetModel(modelID)
	if err != nil {
		return fmt.Errorf("model %s not available for provider %s", modelID, s.currentProvider.ID)
	}

	s.currentModel = *model
	return nil
}

// GetCurrentState returns the current provider, model, and API key (thread-safe)
func (s *ServerState) GetCurrentState() (Provider, Model, string) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.currentProvider, s.currentModel, s.currentAPIKey
}

// GetAvailableProviders returns the map of available providers (thread-safe)
func (s *ServerState) GetAvailableProviders() ProviderMap {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.availableProviders
}

// ServeChatAPI sets up and runs an HTTP server that provides a chat API
func ServeChatAPI(providersMap ProviderMap, apiKeys APIKeys, initialProvider Provider, initialModel Model, initialAPIKey string) {
	// Initialize server state
	serverState := NewServerState(providersMap, apiKeys, initialProvider, initialModel, initialAPIKey)

	// Handler for chat requests
	http.HandleFunc("/api/chat", func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers for all responses
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Only accept POST requests
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Parse request body
		var req APIRequest
		decoder := json.NewDecoder(r.Body)
		if err := decoder.Decode(&req); err != nil {
			log.Printf("Error parsing request: %v", err)
			sendErrorResponse(w, "Invalid request format", http.StatusBadRequest)
			return
		}

		// Get current state
		provider, model, apiKey := serverState.GetCurrentState()

		// Set default values if not provided
		if req.Temperature == 0 {
			req.Temperature = model.DefaultTemperature
		}
		log.Printf("Request temperature = %f", req.Temperature)
		if req.MaxTokens == 0 {
			req.MaxTokens = provider.DefaultMaxTokens
		}

		// Ensure we have messages
		if len(req.Messages) == 0 {
			sendErrorResponse(w, "No messages provided", http.StatusBadRequest)
			return
		}

		log.Printf("Received chat request with %d messages", len(req.Messages))

		// Create and send chat request to the AI provider
		chatReq := serverState.client.AssembleRequest(
			model.ID,
			req.Temperature,
			req.MaxTokens,
			req.Messages,
			model.ExtraFields,
		)

		response, err, duration := serverState.client.SendRequest(chatReq, provider, apiKey)
		if err != nil {
			log.Printf("Error from AI provider: %v", err)
			sendErrorResponse(w, fmt.Sprintf("Error from AI provider: %v", err), http.StatusInternalServerError)
			return
		}

		// Log usage statistics
		log.Printf("Usage: prompt_tokens=%d, completion_tokens=%d, total_tokens=%d", 
			response.Usage.PromptTokens, response.Usage.CompletionTokens, response.Usage.TotalTokens)

		// Prepare response
		apiResp := APIResponse{
			Message:  response.Choices[0].Message.Content,
			Tokens:   response.Usage.TotalTokens,
			Duration: int(duration.Milliseconds()),
		}

		// Send response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(apiResp); err != nil {
			log.Printf("Error encoding response: %v", err)
		}
	})

	// Handler for health checks
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	// Handler for API information
	http.HandleFunc("/api/info", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		// Get current state
		provider, model, _ := serverState.GetCurrentState()
		availableProviders := serverState.GetAvailableProviders()

		info := map[string]interface{}{
			"provider":            provider.DisplayName,
			"provider_id":         provider.ID,
			"model":               model.DisplayName,
			"model_id":            model.ID,
			"temperature":         model.DefaultTemperature,
			"max_tokens":          provider.DefaultMaxTokens,
			"available_providers": availableProviders,
		}

		if err := json.NewEncoder(w).Encode(info); err != nil {
			log.Printf("Error encoding API info: %v", err)
		}
	})

	// Handler for changing provider
	http.HandleFunc("/api/provider", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != "POST" {
			sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			ProviderID string `json:"provider_id"`
		}

		decoder := json.NewDecoder(r.Body)
		if err := decoder.Decode(&req); err != nil {
			sendErrorResponse(w, "Invalid request format", http.StatusBadRequest)
			return
		}

		if req.ProviderID == "" {
			sendErrorResponse(w, "provider_id is required", http.StatusBadRequest)
			return
		}

		err := serverState.SetProvider(req.ProviderID)
		if err != nil {
			log.Printf("Error setting provider: %v", err)
			sendErrorResponse(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Get updated state and return it
		provider, model, _ := serverState.GetCurrentState()
		response := map[string]interface{}{
			"success":     true,
			"provider":    provider.DisplayName,
			"provider_id": provider.ID,
			"model":       model.DisplayName,
			"model_id":    model.ID,
		}

		log.Printf("Provider changed to: %s, Model: %s", provider.DisplayName, model.DisplayName)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	})

	// Handler for changing model
	http.HandleFunc("/api/model", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != "POST" {
			sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			ModelID string `json:"model_id"`
		}

		decoder := json.NewDecoder(r.Body)
		if err := decoder.Decode(&req); err != nil {
			sendErrorResponse(w, "Invalid request format", http.StatusBadRequest)
			return
		}

		if req.ModelID == "" {
			sendErrorResponse(w, "model_id is required", http.StatusBadRequest)
			return
		}

		err := serverState.SetModel(req.ModelID)
		if err != nil {
			log.Printf("Error setting model: %v", err)
			sendErrorResponse(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Get updated state and return it
		provider, model, _ := serverState.GetCurrentState()
		response := map[string]interface{}{
			"success":     true,
			"provider":    provider.DisplayName,
			"provider_id": provider.ID,
			"model":       model.DisplayName,
			"model_id":    model.ID,
		}

		log.Printf("Model changed to: %s", model.DisplayName)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	})

	// Serve static files from the web directory if it exists
	http.Handle("/", http.FileServer(http.Dir("./web")))

	// Start the server
	port := ":8080" // You might want to make this configurable
	provider, model, _ := serverState.GetCurrentState()
	log.Printf("Starting server on %s", port)
	log.Printf("API available at http://localhost%s/api/chat", port)
	log.Printf("Model: %s, Provider: %s", model.DisplayName, provider.DisplayName)

	// In a production environment, you would use HTTPS
	// log.Fatal(http.ListenAndServeTLS(port, "cert.pem", "key.pem", nil))
	log.Fatal(http.ListenAndServe(port, nil))
}

// Helper function to send error responses
func sendErrorResponse(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	resp := APIResponse{
		Error: message,
	}
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("Error encoding error response: %v", err)
	}
}
