import os
import fnmatch
import re

rootdir = os.getcwd() # replace with the directory you want to search
nonreplaceable = []
replaceable = []


for subdir, dirs, files in os.walk(rootdir):
    if os.path.basename(subdir) in ["views"]:
        for file in files:
            if fnmatch.fnmatch(file, '*.sql'):
                replaceable.append(os.path.join(subdir, file))

for sqlfile in replaceable:
    # Open the file in read mode
    with open(sqlfile, "r") as file:
       # Read the contents of the file
       file_contents = file.read()

 
    # Define the regular expression pattern to match the text between "view"/"trigger" and "as"
    pattern = r"(?i)\b(view)\b\s+(.*?)\s+\bAS\b"

    # Find the first match
    match = re.search(pattern, file_contents)

    # Extract the text between "view"/"trigger" and "as"
    extracted_text = match.group(2)

    # Get the "view" or "trigger" keyword from the match
    keyword = match.group(1)

    # Prepend the extracted text with "Drop <view/trigger> "
    dropped_text = f"DROP VIEW IF EXISTS " + extracted_text + ";"

    # Find the line "--rollback: SELECT 1" and insert the dropped text after it
    rollback_pattern = r"--rollback:\s+SELECT\s+1"
    file_contents = re.sub(rollback_pattern, r"\g<0>\n" + dropped_text, file_contents)

    # Write the modified contents back to the file
    with open(sqlfile, "w") as f:
       f.write(file_contents)