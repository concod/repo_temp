import os
import fnmatch
import re

rootdir = os.getcwd() # replace with the directory you want to search
nonreplaceable = []
replaceable = []

for subdir, dirs, files in os.walk(rootdir):
    if os.path.basename(subdir) in ["functions","procedures"]:
        for file in files:
            if fnmatch.fnmatch(file, '*.sql'):
                replaceable.append(os.path.join(subdir, file))

for sqlfile in replaceable:
    # Open the file in read mode
    with open(sqlfile, "r") as file:
        # Read the contents of the file
        file_contents = file.read()

    # Define the regular expression pattern to match the text between "function"/"procedure" and ")"
    pattern = r"(?i)\b(function|procedure)\b\s+(.*?)\s*\)"

    # Find the first match
    match = re.search(pattern, file_contents)

    # Skip the file if the pattern does not match
    if match is None:
        continue

    # Extract the text between "function"/"procedure" and ")"
    extracted_text = match.group(2)

    # Get the "view" or "trigger" keyword from the match
    keyword = match.group(1)

    # Step 1: Extract text between first occurrence of "function" and first closing brace
    #match = re.search(r"(function|procedure)\s+.*?\)", file_contents, re.IGNORECASE)

    #if match:
        #extracted_text = match.group(1)
        #keyword = match.group(0)
    #else:
        #extracted_text = ""

    # Step 2: Prepend extracted text with "Drop "
    new_text = f"DROP {keyword.upper()} IF EXISTS {extracted_text});"

    # Step 3: Find "--rollback: SELECT 1" and add new line with new text after it
    new_line = "\n" + new_text
    file_contents = re.sub(r"--rollback: SELECT 1", r"--rollback: SELECT 1" + new_line, file_contents)

    # Open the file for writing and write the modified contents
    with open(sqlfile, "w") as f:
        f.write(file_contents)
