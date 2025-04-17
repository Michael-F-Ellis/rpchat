#!/usr/bin/env python3
import os
import re

# Module order is important for dependencies
JS_MODULES = [
    'js/config.js',
    'js/state.js',
    'js/api.js',
    'js/ui/elements.js',
    'js/ui/messages.js',
    'js/ui/controls.js',
    'js/ui/importExport.js',
    'js/app.js'
]

CSS_FILES = [
    'css/styles.css'
]

def combine_files(file_list, file_type='js'):
    """
    Combines files into a single string, wrapped in appropriate HTML tags.
    
    Args:
        file_list: List of file paths to combine
        file_type: Type of files ('js' or 'css')
    
    Returns:
        String with combined content wrapped in appropriate HTML tags
    """
    content = ""
    
    for file_path in file_list:
        try:
            with open(file_path, 'r') as f:
                content += f.read() + "\n"
        except FileNotFoundError:
            content += f"/* File not found: {file_path} */\n"
    
    # Wrap content in appropriate HTML tags
    if file_type.lower() == 'js':
        return f"<script>\n{content}</script>"
    elif file_type.lower() == 'css':
        return f"<style>\n{content}</style>"
    else:
        return content  # Return raw content for other file types

def build_production():
    # Combine JS
    js_content = combine_files(JS_MODULES, 'js')
    
    # Combine CSS
    css_content = combine_files(CSS_FILES, 'css')
    
    # Read HTML template
    with open('template.html', 'r') as f:
        html = f.read()
    
    # Replace placeholders with content
    html = html.replace('<!-- CSS_PLACEHOLDER -->', f'{css_content}')
    html = html.replace('<!-- JS_PLACEHOLDER -->', f'{js_content}')
    
    # Write production file
    with open('index.html', 'w') as f:
        f.write(html)

if __name__ == "__main__":
    build_production()
