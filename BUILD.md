# RPChat Build System

This project uses a simple Python build system to generate `index.html` from a template and configuration files.

## Files

- `index.html.template` - The HTML template file with placeholders for providers and system prompts
- `providers.json` - Configuration for API providers and their models
- `systemprompts.json` - Configuration for system prompts
- `build.py` - Build script that processes the template and generates `index.html`

## Usage

To build the `index.html` file, run:

```bash
python3 build.py
```

This will:
1. Read `index.html.template` 
2. Load provider configuration from `providers.json`
3. Load system prompt configuration from `systemprompts.json`
4. Replace placeholders in the template with generated JavaScript code
5. Write the result to `index.html`

## Template Placeholders

The template uses these placeholder markers:

- `// {{PROVIDERS_PLACEHOLDER}}` - Replaced with JavaScript code that creates the PROVIDERS Map
- `// {{SYSTEM_PROMPTS_PLACEHOLDER}}` - Replaced with JavaScript code that initializes the systemPrompts array

## System Prompt Selection

The generated `index.html` includes a system prompt selector that allows users to choose from the available system prompts defined in `systemprompts.json`. The system prompts are displayed with user-friendly names derived from their keys in the JSON file.

## Provider Configuration

Providers are configured in `providers.json` with support for:
- Multiple models per provider
- Custom endpoints
- Model-specific temperature defaults
- Extra fields for advanced model configuration (e.g., Gemini safety settings)

## Development Workflow

1. Edit `index.html.template` to modify the HTML structure or JavaScript code
2. Edit `providers.json` to add/modify API providers
3. Edit `systemprompts.json` to add/modify system prompts
4. Run `python3 build.py` to regenerate `index.html`
5. Test the generated `index.html` in a browser

## Notes

- The original `index.html` is overwritten by the build process
- Use git to track changes and revert if needed
- The build script automatically escapes special characters in system prompts for JavaScript compatibility
