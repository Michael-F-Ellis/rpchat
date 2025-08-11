#!/usr/bin/env python3
"""
Build script for RPChat index.html
Processes index.template.html and injects providers and system prompts from JSON files
"""

import json
import os
import sys

Template_path = 'index.template.html'

def load_json_file(filepath):
    """Load and parse a JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: File {filepath} not found")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {filepath}: {e}")
        sys.exit(1)

def escape_js_string(s):
    """Escape a string for use in JavaScript"""
    return s.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')

def generate_providers_js(providers_data):
    """Generate JavaScript code for providers configuration"""
    providers_js = "const PROVIDERS = new Map([\n"
    
    for provider_id, provider_config in providers_data.items():
        provider_js = f"""				['{provider_id}', new AIProvider(
					'{provider_config['id']}',
					'{provider_config['displayName']}',
					'{provider_config['endpoint']}',
					[
"""
        
        # Add models
        for model in provider_config['models']:
            extra_fields = model.get('extraFields', {})
            extra_fields_str = f", {json.dumps(extra_fields)}" if extra_fields else ""
            provider_js += f"""						new AIModel('{model['id']}', '{model['displayName']}', {model['defaultTemperature']}{extra_fields_str}),\n"""
        
        provider_js += f"""					],
					{provider_config.get('defaultMaxTokens', 5000)},
					'{provider_config.get('apiFormat', 'openai')}'
				)],
"""
        providers_js += provider_js
    
    providers_js += "\t\t\t]);"
    
    return providers_js

def generate_system_prompts_js(system_prompts_data):
    """Generate JavaScript code for system prompts configuration"""
    prompts_map = system_prompts_data.get('map', {})
    
    # Create systemPrompts array
    prompts_js = "// Global variable to store system prompts\n\t\t\tlet systemPrompts = [\n"
    
    for prompt_id, prompt_content in prompts_map.items():
        # Create a display name from the prompt ID
        display_name = prompt_id.replace('_', ' ').title()
        if prompt_id == 'firstPerson':
            display_name = 'First Person'
        elif prompt_id == 'thirdPerson':
            display_name = 'Third Person'
        elif prompt_id == 'minimal':
            display_name = 'Minimal'
        
        escaped_content = escape_js_string(prompt_content)
        prompts_js += f"""				{{
					name: '{display_name}',
					content: `{escaped_content}`
				}},
"""
    
    prompts_js += "\t\t\t];"
    
    return prompts_js

def build_index_html():
    """Build index.html from template and JSON files"""
    # Check if template exists
    if not os.path.exists(Template_path):
        print("Error: index.html.template not found")
        sys.exit(1)
    
    # Load template
    try: # Replace 'index.html.template' with Template_path
        with open(Template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
    except IOError as e:
        print(f"Error reading template: {e}")
        sys.exit(1)
    
    # Load JSON data
    providers_data = load_json_file('providers.json')
    system_prompts_data = load_json_file('systemprompts.json')
    
    # Generate JavaScript code
    providers_js = generate_providers_js(providers_data)
    system_prompts_js = generate_system_prompts_js(system_prompts_data)
    
    # Replace placeholders
    output_content = template_content.replace(
        '// {{PROVIDERS_PLACEHOLDER}}',
        providers_js
    ).replace(
        '// {{SYSTEM_PROMPTS_PLACEHOLDER}}',
        ''
    )
    
    # Add system prompts after the config module
    output_content = output_content.replace(
        '})();',
        '})();\n\n\t\t' + system_prompts_js,
        1  # Replace only the first occurrence
    )
    
    # Write output
    try:
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(output_content)
        print("Successfully built index.html")
    except IOError as e:
        print(f"Error writing output: {e}")
        sys.exit(1)

if __name__ == '__main__':
    build_index_html()
