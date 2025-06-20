package main

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestModelStruct(t *testing.T) {
	model := Model{
		ID:                 "test-model",
		DisplayName:        "Test Model",
		DefaultTemperature: 0.7,
	}

	if model.ID != "test-model" {
		t.Errorf("Expected model ID to be 'test-model', got '%s'", model.ID)
	}

	if model.DisplayName != "Test Model" {
		t.Errorf("Expected model DisplayName to be 'Test Model', got '%s'", model.DisplayName)
	}

	if model.DefaultTemperature != 0.7 {
		t.Errorf("Expected model DefaultTemperature to be 0.7, got '%f'", model.DefaultTemperature)
	}
}

func TestProviderStruct(t *testing.T) {
	provider := Provider{
		ID:               "test-provider",
		DisplayName:      "Test Provider",
		Endpoint:         "https://api.test.com/chat",
		DefaultMaxTokens: 1000,
		Models: []Model{
			{ID: "model1", DisplayName: "Model 1", DefaultTemperature: 0.7},
			{ID: "model2", DisplayName: "Model 2", DefaultTemperature: 0.5},
		},
	}

	if provider.ID != "test-provider" {
		t.Errorf("Expected provider ID to be 'test-provider', got '%s'", provider.ID)
	}

	if len(provider.Models) != 2 {
		t.Errorf("Expected provider to have 2 models, got %d", len(provider.Models))
	}

	if provider.Models[0].ID != "model1" {
		t.Errorf("Expected first model ID to be 'model1', got '%s'", provider.Models[0].ID)
	}
}

func TestAPIKeys(t *testing.T) {
	// Test initialization
	apiKeys := APIKeys{}
	if apiKeys.Map != nil {
		t.Errorf("Expected empty APIKeys to have nil Map, got %v", apiKeys.Map)
	}

	// Test Set method
	apiKeys.Set("provider1", "key1")

	if len(apiKeys.Map) != 1 {
		t.Errorf("Expected APIKeys map to have 1 entry, got %d", len(apiKeys.Map))
	}

	// Test Get method
	key, err := apiKeys.Get("provider1")
	if err != nil {
		t.Errorf("Unexpected error getting API key: %v", err)
	}
	if key != "key1" {
		t.Errorf("Expected key to be 'key1', got '%s'", key)
	}

	// Test Get with non-existent provider
	_, err = apiKeys.Get("nonexistent")
	if err == nil {
		t.Errorf("Expected error getting non-existent API key, got nil")
	}
}

func TestAPIKeysStoreAndLoad(t *testing.T) {
	// Create a temporary directory for test files
	tempDir, err := os.MkdirTemp("", "apikeys_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir) // Clean up

	// Create test file path
	testFilePath := filepath.Join(tempDir, "test_apikeys.json")

	// Create and populate APIKeys
	apiKeys := APIKeys{}
	apiKeys.Set("provider1", "key1")
	apiKeys.Set("provider2", "key2")

	// Test Store method
	err = apiKeys.Store(testFilePath)
	if err != nil {
		t.Errorf("Unexpected error storing API keys: %v", err)
	}

	// Check if file exists
	if _, err := os.Stat(testFilePath); os.IsNotExist(err) {
		t.Errorf("Expected file to exist after Store operation")
	}

	// Test Load method
	loadedKeys := APIKeys{}
	err = loadedKeys.Load(testFilePath)
	if err != nil {
		t.Errorf("Unexpected error loading API keys: %v", err)
	}

	// Compare original and loaded keys
	if !reflect.DeepEqual(apiKeys.Map, loadedKeys.Map) {
		t.Errorf("Loaded keys don't match original. Original: %v, Loaded: %v",
			apiKeys.Map, loadedKeys.Map)
	}

	// Test Load with non-existent file
	badKeys := APIKeys{}
	err = badKeys.Load(filepath.Join(tempDir, "nonexistent.json"))
	if err == nil {
		t.Errorf("Expected error loading non-existent file, got nil")
	}
}

func TestProviderMapStoreAndLoad(t *testing.T) {
	// Create a temporary directory for test files
	tempDir, err := os.MkdirTemp("", "providers_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir) // Clean up

	// Create test file path
	testFilePath := filepath.Join(tempDir, "test_providers.json")

	// Create and populate ProviderMap
	providers := ProviderMap{
		"provider1": {
			ID:               "provider1",
			DisplayName:      "Provider 1",
			Endpoint:         "https://api.provider1.com/chat",
			DefaultMaxTokens: 1000,
			Models: []Model{
				{ID: "model1", DisplayName: "Model 1", DefaultTemperature: 0.7},
			},
		},
		"provider2": {
			ID:               "provider2",
			DisplayName:      "Provider 2",
			Endpoint:         "https://api.provider2.com/chat",
			DefaultMaxTokens: 2000,
			Models: []Model{
				{ID: "model2", DisplayName: "Model 2", DefaultTemperature: 0.5},
			},
		},
	}

	// Test Store method
	err = providers.Store(testFilePath)
	if err != nil {
		t.Errorf("Unexpected error storing providers: %v", err)
	}

	// Check if file exists
	if _, err := os.Stat(testFilePath); os.IsNotExist(err) {
		t.Errorf("Expected file to exist after Store operation")
	}

	// Test Load method
	loadedProviders := ProviderMap{}
	err = loadedProviders.Load(testFilePath)
	if err != nil {
		t.Errorf("Unexpected error loading providers: %v", err)
	}

	// Compare original and loaded providers
	if !reflect.DeepEqual(providers, loadedProviders) {
		t.Errorf("Loaded providers don't match original")
	}

	// Test Load with non-existent file
	badProviders := ProviderMap{}
	err = badProviders.Load(filepath.Join(tempDir, "nonexistent.json"))
	if err == nil {
		t.Errorf("Expected error loading non-existent file, got nil")
	}
}
