# AGENT.md - RPChat Development Guide

## Commands
- **Build**: `go build` (in goapp/ directory)
- **Test All**: `go test -v` (in goapp/ directory)  
- **Test Single**: `go test -v -run TestName` (in goapp/ directory)
- **Run CLI**: `go run . -provider gemini -model gemini-2.5-flash-preview-04-17`
- **Run Server**: `go run . -serve`
- **Validate**: `go run . -validate`

## Architecture
- **Frontend**: Single-file HTML/CSS/JS in `index.html` - editable AI chat interface
- **Backend**: Go application in `goapp/` - CLI chat client and HTTP API server
- **Config**: JSON files for providers (`providers.json`), API keys (`apikeys.json`), system prompts
- **Core Components**: 
  - `chat.go` - OpenAI-compatible API client
  - `config.go` - Provider/model configuration and API key management
  - `serve.go` - HTTP server for chat API
  - `validate.go` - Provider/model validation
  - `main.go` - CLI interface and application entry point

## Code Style
- **Go**: Standard Go formatting, camelCase for exported functions, PascalCase for types
- **Error Handling**: Return errors explicitly, use `log.Fatalf` for fatal errors
- **JSON Tags**: Use json struct tags for API serialization
- **Testing**: Unit tests in `*_test.go` files, use table-driven tests when applicable
- **Comments**: Document exported functions and types, minimal inline comments
