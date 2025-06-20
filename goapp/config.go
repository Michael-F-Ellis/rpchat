package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
)

// Model corresponds to the AIModel class in JavaScript.
// It holds the configuration for a specific AI model.
type Model struct {
	ID                 string  `json:"id"`
	DisplayName        string  `json:"displayName"`
	DefaultTemperature float64 `json:"defaultTemperature"`
}

// Provider corresponds to the AIProvider class in JavaScript.
// It holds the configuration for an API provider and a list of its models.
type Provider struct {
	ID               string  `json:"id"`
	DisplayName      string  `json:"displayName"`
	Endpoint         string  `json:"endpoint"`
	Models           []Model `json:"models"`
	DefaultMaxTokens int     `json:"defaultMaxTokens"`
}

// APIKeyName generates the key used to look up the API key for this provider.
// This is the Go equivalent of the `apiKeyName` getter in the JS class.
func (p *Provider) APIKeyName() string {
	return fmt.Sprintf("%sApiKey", p.ID)
}

// ProviderMap is a map of provider IDs to their configuration.
// This is the top-level structure that will be serialized to JSON.
type ProviderMap map[string]Provider

func main() {
	// --- Step 1: Define the provider data in Go, mirroring the JS configuration ---

	// This is the Go representation of your `PROVIDERS` map.
	providers := ProviderMap{
		"deepseek": {
			ID:               "deepseek",
			DisplayName:      "DeepSeek",
			Endpoint:         "https://api.deepseek.com/chat/completions",
			DefaultMaxTokens: 1000,
			Models: []Model{
				{ID: "deepseek-chat", DisplayName: "DeepSeek Chat", DefaultTemperature: 0.7},
				{ID: "deepseek-reasoner", DisplayName: "DeepSeek Reasoner", DefaultTemperature: 0.5},
			},
		},
		"together": {
			ID:               "together",
			DisplayName:      "Together.ai",
			Endpoint:         "https://api.together.xyz/v1/chat/completions",
			DefaultMaxTokens: 1000,
			Models: []Model{
				{ID: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", DisplayName: "Meta Llama 3.1 405B", DefaultTemperature: 0.7},
				{ID: "mistralai/Mixtral-8x22B-Instruct-v0.1", DisplayName: "Mixtral 8x22B", DefaultTemperature: 0.8},
				{ID: "microsoft/WizardLM-2-8x22B", DisplayName: "WizardLM 2 8x22B", DefaultTemperature: 0.7},
				{ID: "Qwen/Qwen2.5-72B-Instruct-Turbo", DisplayName: "Qwen 2.5 72B", DefaultTemperature: 0.6},
			},
		},
		"gemini": {
			ID:               "gemini",
			DisplayName:      "Google Gemini",
			Endpoint:         "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
			DefaultMaxTokens: 1000,
			Models: []Model{
				{ID: "gemini-2.5-pro-preview-05-06", DisplayName: "Gemini 2.5 Pro", DefaultTemperature: 0.7},
				{ID: "gemini-2.5-flash-preview-04-17", DisplayName: "Gemini 2.5 Flash", DefaultTemperature: 0.7},
			},
		},
	}

	// --- Step 2: Serialize (Marshal) the Go data to JSON and save to a file ---

	configFileName := "providers.json"

	// Marshal the data with indentation for readability.
	jsonData, err := json.MarshalIndent(providers, "", "  ")
	if err != nil {
		log.Fatalf("Error marshaling to JSON: %v", err)
	}

	// Write the JSON data to a file on the server.
	err = os.WriteFile(configFileName, jsonData, 0644) // 0644 are standard file permissions
	if err != nil {
		log.Fatalf("Error writing JSON to file: %v", err)
	}

	fmt.Printf("✅ Successfully wrote provider configuration to %s\n\n", configFileName)

	// --- Step 3: Read from the file and Deserialize (Unmarshal) back into Go structs ---

	// Clear the variable to prove we are loading from the file.
	var loadedProviders ProviderMap

	// Read the raw bytes from the file.
	fileBytes, err := os.ReadFile(configFileName)
	if err != nil {
		log.Fatalf("Error reading from file: %v", err)
	}

	// Unmarshal the JSON bytes into our Go struct.
	err = json.Unmarshal(fileBytes, &loadedProviders)
	if err != nil {
		log.Fatalf("Error unmarshaling JSON: %v", err)
	}

	fmt.Printf("✅ Successfully loaded and parsed %s\n\n", configFileName)

	// --- Step 4: Use the loaded data ---

	// You can now access the configuration data as if it were defined in Go.
	// Let's test it.
	geminiProvider := loadedProviders["gemini"]
	fmt.Printf("Loaded Gemini Provider:\n")
	fmt.Printf("  Display Name: %s\n", geminiProvider.DisplayName)
	fmt.Printf("  Endpoint: %s\n", geminiProvider.Endpoint)
	fmt.Printf("  First Model: %s\n", geminiProvider.Models[0].DisplayName)

	// Test the APIKeyName() method
	fmt.Printf("  API Key Name: %s\n", geminiProvider.APIKeyName())
}
