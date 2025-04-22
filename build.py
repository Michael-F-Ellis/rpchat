#!/usr/bin/env python3
import os
import re

# Module order is important for dependencies
JS_MODULES = [
    
    'js/globals.js',
    'components/chatmessage.js',
    'components/chatmanager.js',
    'js/config.js',
    'js/api.js',
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
            # Add a comment indicating the file wasn't found, but don't stop the build
            print(f"Warning: File not found: {file_path}")
            content += f"/* File not found: {file_path} */\n"

    # Wrap content in appropriate HTML tags
    if file_type.lower() == 'js':
        return f"<script>\n// Combined JavaScript modules\n{content}</script>"
    elif file_type.lower() == 'css':
        return f"<style>\n/* Combined CSS files */\n{content}</style>"
    else:
        return content  # Return raw content for other file types

def build_production():
    print("Starting build process...")

    # Combine JS
    print("Combining JavaScript modules...")
    js_content = combine_files(JS_MODULES, 'js')
    print(f"JavaScript modules combined. Total length: {len(js_content)}")

    # Combine CSS
    print("Combining CSS files...")
    css_content = combine_files(CSS_FILES, 'css')
    print(f"CSS files combined. Total length: {len(css_content)}")

    # Read HTML template
    print("Reading HTML template...")
    try:
        with open('template.html', 'r') as f:
            html = f.read()
        print("HTML template read successfully.")
    except FileNotFoundError:
        print("Error: template.html not found.")
        return

    # Replace placeholders with content
    print("Replacing placeholders...")
    html = html.replace('<!-- CSS_PLACEHOLDER -->', f'{css_content}')
    html = html.replace('<!-- JS_PLACEHOLDER -->', f'{js_content}')
    print("Placeholders replaced.")

    # Write production file
    print("Writing production file index.html...")
    try:
        with open('index.html', 'w') as f:
            f.write(html)
        print("Build successful! index.html created.")
    except IOError as e:
        print(f"Error writing index.html: {e}")


if __name__ == "__main__":
    build_production()