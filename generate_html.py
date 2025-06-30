import json
import yaml
import os
import sys

def generate_html_from_yaml(template_path, yaml_data, output_path="output.html"):
    """
    Injects YAML data into an HTML template and generates an output HTML file.

    Args:
        template_path (str): Path to the HTML template file.
        yaml_data (dict): The parsed YAML data (as a Python dictionary).
        output_path (str): Path where the generated HTML file will be saved.
    """
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
    except FileNotFoundError:
        print(f"Error: Template file not found at {template_path}")
        return

    # Convert Python dict to JSON string for JavaScript
    # Use json.dumps to ensure proper escaping for JavaScript
    json_data_str = json.dumps(yaml_data, indent=2)

    # The JavaScript code to inject the data
    injection_script = f"""
            const injectedYamlData = {json_data_str};
            initializeData(injectedYamlData);
    """

    # Find the placeholder and replace it
    # Ensure the placeholder matches exactly what's in template.html
    placeholder = "/* INJECT_YAML_DATA_HERE */"
    if placeholder not in template_content:
        print(f"Error: Placeholder '{placeholder}' not found in {template_path}")
        print("Please ensure the placeholder exists in your template.html file.")
        return

    output_content = template_content.replace(placeholder, injection_script)

    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(output_content)
        print(f"Successfully generated {output_path}")
    except IOError as e:
        print(f"Error writing output file {output_path}: {e}")

if __name__ == "__main__":
    # Define paths
    template_file = sys.argv[1]
    output_file = "output.html"
    yaml_file = sys.argv[2] # You need to create this file with your YAML data
    
    # Load YAML data
    try:
        with open(yaml_file, 'r', encoding='utf-8') as f:
            yaml_data = yaml.safe_load(f)
    except FileNotFoundError:
        print(f"Error: YAML data file not found at {yaml_file}")
        exit()
    except yaml.YAMLError as e:
        print(f"Error parsing YAML file {yaml_file}: {e}")
        exit()

    # Generate the HTML file
    generate_html_from_yaml(template_file, yaml_data, output_file)

