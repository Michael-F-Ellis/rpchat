// systemprompts.go provides a struct to hold system prompts
package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"log"
	"os"
)

//go:embed default_systemprompts.json
var defaultSystemPromptsJSON []byte

type SysPrompts struct {
	Map map[string]string `json:"map"`
}

// Get retrieves a system prompt's content by name
func (p *SysPrompts) Get(name string) string {
	return p.Map[name]
}

// GetFirst returns the first system prompt content (minimal by default)
func (p *SysPrompts) GetFirst() string {
	// Try to get "minimal" first, then fallback to first available
	if content, exists := p.Map["minimal"]; exists {
		return content
	}
	// If minimal doesn't exist, return first available
	for _, content := range p.Map {
		return content
	}
	return "You are a helpful assistant."
}

// Set adds or updates a system prompt
func (p *SysPrompts) Set(name, content string) {
	p.Map[name] = content
}

// Store saves SysPrompts to a JSON file
func (p *SysPrompts) Store(filepath string) error {
	jsonData, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		return fmt.Errorf("error marshaling system prompts: %w", err)
	}

	// write the JSON data to the specified file
	if filepath == "" {
		filepath = "default_systemprompts.json"
	}
	err = os.WriteFile(filepath, jsonData, 0600) // Using more restrictive permissions for system prompts
	if err != nil {
		return fmt.Errorf("error writing system prompts json to file: %w", err)
	}
	log.Printf("System prompts marshaled to JSON and written to %s", filepath)
	return nil
}

// Load attempts to unmarshal the JSON data from a file into SysPrompts.
func (p *SysPrompts) Load(filepath string) error {
	jsonData, err := os.ReadFile(filepath)
	if err != nil {
		return fmt.Errorf("error reading system prompts file: %w", err)
	}
	err = json.Unmarshal(jsonData, p)
	if err != nil {
		return fmt.Errorf("error unmarshaling system prompts: %w", err)
	}
	log.Printf("System prompts unmarshaled from JSON")
	return nil
}

func initDefaultSystemPrompts() error {

	err := json.Unmarshal(defaultSystemPromptsJSON, &SystemPromptsMap)
	if err != nil {
		return fmt.Errorf("error unmarshaling embedded system prompts: %w", err)
	}

	return nil
}
