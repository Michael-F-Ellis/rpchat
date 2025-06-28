package main

import (
	"log"
	"time"
)

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
	client := NewChatClient()

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

			// Use the SimpleChat method to send a test message
			response, err, duration := client.SimpleChat(provider, model, apiKey, "Say 'Hello'")
			result.Duration = duration

			if err != nil {
				result.Success = false
				result.ErrorMessage = err.Error()
			} else {
				result.Success = true
				result.Response = response.Choices[0].Message.Content
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
