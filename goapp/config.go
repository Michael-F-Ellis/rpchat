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

func (p *Provider) GetModel(modelID string) (*Model, error) {
	for _, model := range p.Models {
		if model.ID == modelID {
			return &model, nil
		}
	}
	return nil, fmt.Errorf("model not found: %s", modelID)
}

// APIKeys is a map of provider IDs to their API keys. We use a separate struct to
// allow provider maps to be shared without exposing the API keys.
type APIKeys struct {
	Map map[string]string `json:"map"`
}

// Get retrieves an API key for a provider
func (a APIKeys) Get(providerID string) (string, error) {
	apiKey, ok := a.Map[providerID]
	if !ok {
		return "", fmt.Errorf("no API key found for provider: %s", providerID)
	}
	return apiKey, nil
}

// Set adds or updates an API key for a provider
func (a *APIKeys) Set(providerID, apiKey string) {
	// Using pointer receiver so we can modify the map
	if a.Map == nil {
		a.Map = make(map[string]string)
	}
	a.Map[providerID] = apiKey
}

// Store serializes the API keys to JSON and writes it to a json file
func (a *APIKeys) Store(filepath string) error {
	jsonData, err := json.MarshalIndent(a, "", "  ")
	if err != nil {
		return fmt.Errorf("error marshaling API keys: %w", err)
	}

	// write the JSON data to the specified file
	if filepath == "" {
		filepath = "apikeys.json"
	}
	err = os.WriteFile(filepath, jsonData, 0600) // Using more restrictive permissions for API keys
	if err != nil {
		return fmt.Errorf("error writing API keys json to file: %w", err)
	}
	log.Printf("API keys marshaled to JSON and written to %s", filepath)
	return nil
}

// Load attempts to unmarshal the JSON data from a file into APIKeys.
func (a *APIKeys) Load(filepath string) error {
	jsonData, err := os.ReadFile(filepath)
	if err != nil {
		return fmt.Errorf("error reading API keys file: %w", err)
	}
	err = json.Unmarshal(jsonData, a)
	if err != nil {
		return fmt.Errorf("error unmarshaling API keys JSON: %w", err)
	}
	log.Printf("API keys unmarshaled from JSON from %s", filepath)
	return nil
}

// ProviderMap is a map of provider IDs to their configuration.
// This is the top-level structure that will be serialized to JSON.
type ProviderMap map[string]Provider

// Store serializes the provider map to JSON and writes it to a json file
func (p *ProviderMap) Store(filepath string) error {
	jsonData, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		return fmt.Errorf("error marshaling providers: %w", err)
	}
	// write the JSON data to providers.json
	if filepath == "" {
		filepath = "providers.json"
	}
	err = os.WriteFile(filepath, jsonData, 0644)
	if err != nil {
		return fmt.Errorf("error writing providers map json to file: %w", err)
	}
	log.Printf("Providers marshaled to JSON and written to %s", filepath)
	return nil
}

// Load attempts to unmarshal the JSON data from a json into a ProviderMap.
func (p *ProviderMap) Load(filepath string) error {
	jsonData, err := os.ReadFile(filepath)
	if err != nil {
		return fmt.Errorf("error reading file: %w", err)
	}
	err = json.Unmarshal(jsonData, p)
	if err != nil {
		return fmt.Errorf("error unmarshaling JSON: %w", err)
	}
	log.Printf("Providers unmarshaled from JSON from %s", filepath)
	return nil
}
