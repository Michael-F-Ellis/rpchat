package main

import (
	"bufio"
	"flag"
	"fmt"
	"log"
	"os"
)

// Global SystemPrompts variable
var SystemPromptsMap SysPrompts

func main() {
	// Add command line flags
	validateFlag := flag.Bool("validate", false, "Validate all providers and models")
	configFileFlag := flag.String("config", "providers.json", "Specify a config file to use")
	providerFlag := flag.String("provider", "gemini", "Specify a provider to use")
	modelFlag := flag.String("model", "gemini-2.5-flash", "Specify a model to use")
	serveFlag := flag.Bool("serve", false, "Serve the chat API over https if true. Otherwise, chat via command line.")
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
	err = providersMap.Load(*configFileFlag)
	if err != nil {
		log.Fatalf("Error unmarshaling providers: %v", err)
	}
	APIKeysMap := APIKeys{}
	err = APIKeysMap.Load("apikeys.json")
	if err != nil {
		log.Fatalf("Error unmarshaling API keys: %v", err)
	}

	provider, ok := providersMap[*providerFlag]
	if !ok {
		log.Fatalf("Error: provider %s not found", *providerFlag)
	}
	model, err := provider.GetModel(*modelFlag)
	if err != nil {
		log.Fatalf("Error getting model: %v", err)
	}

	apiKey, err := APIKeysMap.Get(*providerFlag)
	if err != nil {
		log.Fatalf("Error getting API key: %v", err)
	}

	fmt.Printf("Provider: %v\n", provider)
	fmt.Printf("Model: %v\n", model)
	fmt.Printf("API Key: %s\n", apiKey)

	if *serveFlag {
		ServeChatAPI(providersMap, APIKeysMap, provider, *model, apiKey)
		return
	}
	// Enter a command line evaluation loop here that uses the provider, model, and API key
	// to chat with the model via the API. User should be able to terminate the chat with Ctrl+C.
	chatWithModel(provider, *model, apiKey, "You are a helpful assistant.")
}

// chatWithModel implements an interactive chat loop with the specified model
func chatWithModel(provider Provider, model Model, apiKey string, systemPrompt string) {
	fmt.Println("Starting chat session. Type 'exit' or 'quit' to end the conversation.")
	fmt.Println("Enter your message:")

	// Initialize the chat client
	client := NewChatClient()

	// Keep track of the conversation history
	messages := []Message{}

	// Add system prompt if provided
	if systemPrompt != "" {
		messages = append(messages, Message{
			Role:    "system",
			Content: systemPrompt,
		})
		fmt.Printf("System: %s\n", systemPrompt)
	}

	// Input scanner
	scanner := bufio.NewScanner(os.Stdin)

	// Main chat loop
	for {
		fmt.Print("\nYou: ")
		if !scanner.Scan() {
			break // Handle Ctrl+D
		}

		userInput := scanner.Text()

		// Check for exit commands
		if userInput == "exit" || userInput == "quit" {
			fmt.Println("Ending chat session.")
			break
		}

		// Add user message to history
		messages = append(messages, Message{
			Role:    "user",
			Content: userInput,
		})

		// Create chat request
		req := client.AssembleRequest(
			model.ID,
			model.DefaultTemperature,
			provider.DefaultMaxTokens,
			messages,
			model.ExtraFields,
		)

		// Send request to API
		fmt.Println("\nWaiting for response...")
		response, err, duration := client.SendRequest(req, provider, apiKey)

		if err != nil {
			fmt.Printf("Error: %v\n", err)
			continue
		}

		// Get the assistant's response
		if len(response.Choices) > 0 {
			assistantMsg := response.Choices[0].Message.Content
			fmt.Printf("\n%s: %s\n", model.DisplayName, assistantMsg)

			// Add assistant message to history
			messages = append(messages, Message{
				Role:    "assistant",
				Content: assistantMsg,
			})

			// Print some debug info
			fmt.Printf("\n[Response time: %.2fs, Tokens: %d]\n",
				duration.Seconds(),
				response.Usage.TotalTokens)
		} else {
			fmt.Println("Error: No response from model")
		}
	}

	if scanner.Err() != nil {
		fmt.Printf("Scanner error: %v\n", scanner.Err())
	}
}
