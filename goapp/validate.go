package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
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

// ValidationResult stores the result of a model validation
type ValidationResult struct {
	Provider     string
	Model        string
	Success      bool
	ErrorMessage string
	Response     string
	Duration     time.Duration
}

// ValidateAllProviders tests each model of each provider with a simple prompt
func ValidateAllProviders(providersFile, apiKeysFile string) []ValidationResult {
	// Load providers
	var providers ProviderMap
	err := providers.Load(providersFile)
	if err != nil {
		log.Fatalf("Failed to load providers: %v", err)
	}

	// Load API keys
	var apiKeys APIKeys
	err = apiKeys.Load(apiKeysFile)
	if err != nil {
		log.Printf("Warning: Failed to load API keys from %s: %v", apiKeysFile, err)
		log.Printf("Attempting to load default API keys...")

		// Try to load default API keys
		err = apiKeys.Load("default_apikeys.json")
		if err != nil {
			log.Printf("Warning: Failed to load default API keys: %v", err)
			apiKeys.Map = make(map[string]string)
		} else {
			log.Printf("Loaded default API keys. These are dummy keys - please replace with your actual keys.")
		}
	}

	results := []ValidationResult{}

	// HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Test each provider and model
	for providerID, provider := range providers {
		// Get API key
		apiKey, err := apiKeys.Get(providerID)
		if err != nil {
			log.Printf("Skipping provider %s: %v", providerID, err)
			continue
		}

		// Test each model
		for _, model := range provider.Models {
			log.Printf("Testing %s - %s...", provider.DisplayName, model.DisplayName)

			result := ValidationResult{
				Provider: provider.DisplayName,
				Model:    model.DisplayName,
			}

			startTime := time.Now()

			// Prepare request
			chatRequest := ChatRequest{
				Model:       model.ID,
				Messages:    []Message{{Role: "user", Content: "Say 'Hello'"}},
				Temperature: model.DefaultTemperature,
				MaxTokens:   100,
			}

			jsonData, err := json.Marshal(chatRequest)
			if err != nil {
				result.Success = false
				result.ErrorMessage = fmt.Sprintf("Failed to marshal request: %v", err)
				results = append(results, result)
				continue
			}

			// Create request
			req, err := http.NewRequest("POST", provider.Endpoint, bytes.NewBuffer(jsonData))
			if err != nil {
				result.Success = false
				result.ErrorMessage = fmt.Sprintf("Failed to create request: %v", err)
				results = append(results, result)
				continue
			}

			// Set headers
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))

			// Execute request
			resp, err := client.Do(req)
			if err != nil {
				result.Success = false
				result.ErrorMessage = fmt.Sprintf("Request failed: %v", err)
				results = append(results, result)
				continue
			}
			defer resp.Body.Close()

			// Read response
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				result.Success = false
				result.ErrorMessage = fmt.Sprintf("Failed to read response: %v", err)
				results = append(results, result)
				continue
			}

			result.Duration = time.Since(startTime)

			// Check if response is success
			if resp.StatusCode != http.StatusOK {
				result.Success = false
				result.ErrorMessage = fmt.Sprintf("API returned status code %d: %s", resp.StatusCode, string(body))
				results = append(results, result)
				continue
			}

			// Parse response
			var chatResponse ChatResponse
			err = json.Unmarshal(body, &chatResponse)
			if err != nil {
				result.Success = false
				result.ErrorMessage = fmt.Sprintf("Failed to parse response: %v\nResponse body: %s", err, string(body))
				results = append(results, result)
				continue
			}

			// Check if we got a valid message
			if len(chatResponse.Choices) == 0 {
				result.Success = false
				result.ErrorMessage = "No choices returned in response"
			} else {
				result.Success = true
				result.Response = chatResponse.Choices[0].Message.Content
				log.Printf("Success! Response: %s", result.Response)
			}

			results = append(results, result)
		}
	}

	// Print summary
	log.Println("\n=== Validation Summary ===")
	successCount := 0
	failureCount := 0

	for _, result := range results {
		if result.Success {
			log.Printf("✅ %s - %s: Success (%.2fs)", result.Provider, result.Model, result.Duration.Seconds())
			successCount++
		} else {
			log.Printf("❌ %s - %s: Failed - %s", result.Provider, result.Model, result.ErrorMessage)
			failureCount++
		}
	}

	log.Printf("\nTotal: %d, Success: %d, Failures: %d", len(results), successCount, failureCount)

	return results
}
