package main

import (
	"bytes"
	"flag"
	"fmt"
	"log"
	"os"
)

func main() {
	// Add command line flags
	validateFlag := flag.Bool("validate", false, "Validate all providers and models")
	flag.Parse()

	// Run validation if requested
	if *validateFlag {
		log.Println("Running model validation...")
		ValidateAllProviders("providers.json", "apikeys.json")
		return
	}
	err := initDefaultSystemPrompts()
	if err != nil {
		log.Fatalf("Error initializing default system prompts: %v", err)
	}
	// Otherwise run your normal application code
	var providersMap = ProviderMap{}
	err = providersMap.Load("default_providers.json")
	if err != nil {
		log.Fatalf("Error unmarshaling providers: %v", err)
	}

	configFileName := "providers.json"
	// Marshal the data with indentation for readability.
	err = providersMap.Store(configFileName)
	if err != nil {
		log.Fatalf("Error marshaling providers: %v", err)
	}

	originalData, err := os.ReadFile("default_providers.json")
	if err != nil {
		log.Fatalf("Error reading original file: %v", err)
	}

	newData, err := os.ReadFile("providers.json")
	if err != nil {
		log.Fatalf("Error reading new file: %v", err)
	}

	if bytes.Equal(originalData, newData) {
		fmt.Println("✅ The new file matches the original.")
	} else {
		fmt.Println("❌ The new file does not match the original.")
	}

	fmt.Printf("✅ Successfully loaded and parsed %s\n\n", configFileName)
	log.Fatal("main is not implemented.")
}
