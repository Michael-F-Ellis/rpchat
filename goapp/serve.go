package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
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

// ServeChatAPI sets up and runs an HTTP server that provides a chat API
func ServeChatAPI(provider Provider, model Model, apiKey string) {
	// Initialize the chat client
	client := NewChatClient()

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

		// Set default values if not provided
		if req.Temperature == 0 {
			req.Temperature = model.DefaultTemperature
		}
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
		chatReq := client.AssembleRequest(
			model.ID,
			req.Temperature,
			req.MaxTokens,
			req.Messages,
		)

		response, err, duration := client.SendRequest(chatReq, provider, apiKey)
		if err != nil {
			log.Printf("Error from AI provider: %v", err)
			sendErrorResponse(w, fmt.Sprintf("Error from AI provider: %v", err), http.StatusInternalServerError)
			return
		}

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

		info := map[string]interface{}{
			"provider":    provider.DisplayName,
			"model":       model.DisplayName,
			"model_id":    model.ID,
			"temperature": model.DefaultTemperature,
			"max_tokens":  provider.DefaultMaxTokens,
		}

		if err := json.NewEncoder(w).Encode(info); err != nil {
			log.Printf("Error encoding API info: %v", err)
		}
	})

	// Serve static files from the web directory if it exists
	http.Handle("/", http.FileServer(http.Dir("./web")))

	// Start the server
	port := ":8080" // You might want to make this configurable
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
