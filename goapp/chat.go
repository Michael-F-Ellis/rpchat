package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// Message represents a chat message for the API request
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatRequest represents the request body for OpenAI-compatible APIs
type ChatRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature float64   `json:"temperature"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
	Stream      bool      `json:"stream,omitempty"`
}

// ChatResponse represents the common fields in OpenAI-compatible API responses
type ChatResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int    `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

// ChatClient handles communication with AI chat providers
type ChatClient struct {
	HTTPClient *http.Client
}

// NewChatClient creates a new ChatClient with default settings
func NewChatClient() *ChatClient {
	return &ChatClient{
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// AssembleRequest creates a ChatRequest with the provided parameters
func (c *ChatClient) AssembleRequest(modelID string, temperature float64, maxTokens int, messages []Message, extraFields map[string]json.RawMessage) *ChatRequest {
	req := &ChatRequest{
		Model:       modelID,
		Messages:    messages,
		Temperature: temperature,
		MaxTokens:   maxTokens,
	}

	// Merge extra fields into the request
	if len(extraFields) > 0 {
		// Log the extra fields being sent
		extraFieldsJSON, _ := json.Marshal(extraFields)
		fmt.Printf("Sending extra fields: %s\n", string(extraFieldsJSON))

		// Convert request to map for merging
		reqJSON, _ := json.Marshal(req)
		var reqMap map[string]interface{}
		err := json.Unmarshal(reqJSON, &reqMap)
		if err != nil {
			log.Printf("Can't unmarshal request: %s", reqJSON)
		}

		// Add extra fields
		for key, value := range extraFields {
			var fieldValue interface{}
			if err := json.Unmarshal(value, &fieldValue); err != nil {
				log.Printf("Warning: failed to unmarshal extra field %s: %v", key, err)
				continue
			}
			reqMap[key] = fieldValue
		}

		// Convert back to ChatRequest
		mergedJSON, err := json.Marshal(reqMap)
		if err != nil {
			log.Printf("Warning: failed to marshal merged request: %v", err)
		} else {
			if err := json.Unmarshal(mergedJSON, req); err != nil {
				log.Printf("Warning: failed to unmarshal merged request: %v", err)
			}
		}
	}

	return req
}

// SendRequest sends a chat request to the specified provider
func (c *ChatClient) SendRequest(req *ChatRequest, provider Provider, apiKey string) (*ChatResponse, error, time.Duration) {
	startTime := time.Now()

	// Marshal the request to JSON
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err), time.Since(startTime)
	}

	// Create HTTP request
	httpReq, err := http.NewRequest("POST", provider.Endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err), time.Since(startTime)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))

	// Send the request
	resp, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err), time.Since(startTime)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err), time.Since(startTime)
	}

	// Check response status
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status code %d: %s", resp.StatusCode, string(body)), time.Since(startTime)
	}

	// Parse response
	var chatResponse ChatResponse
	err = json.Unmarshal(body, &chatResponse)
	if err != nil {
		return nil, fmt.Errorf("failed to parse response: %w\nResponse body: %s", err, string(body)), time.Since(startTime)
	}

	// Validate response has choices
	if len(chatResponse.Choices) == 0 {
		return nil, fmt.Errorf("no choices returned in response"), time.Since(startTime)
	}

	// Log full response if finish reason is not STOP
	if len(chatResponse.Choices) > 0 && strings.ToLower(chatResponse.Choices[0].FinishReason) != "stop" {
		// Parse raw response as generic map to see all fields
		var rawResponse map[string]interface{}
		if err := json.Unmarshal(body, &rawResponse); err != nil {
			log.Printf("Warning: failed to unmarshal raw response for logging: %v", err)
			return &chatResponse, nil, time.Since(startTime)
		}

		rawJSON, _ := json.MarshalIndent(rawResponse, "", "  ")
		fmt.Printf("Full response with finish reason '%s':\n%s\n", chatResponse.Choices[0].FinishReason, string(rawJSON))
	}

	return &chatResponse, nil, time.Since(startTime)
}

// SimpleChat is a convenience function for sending a single message and getting a response
func (c *ChatClient) SimpleChat(provider Provider, model Model, apiKey, message string) (*ChatResponse, error, time.Duration) {
	req := c.AssembleRequest(
		model.ID,
		model.DefaultTemperature,
		100, // Default max tokens for simple requests
		[]Message{{Role: "user", Content: message}},
		model.ExtraFields,
	)

	return c.SendRequest(req, provider, apiKey)
}
