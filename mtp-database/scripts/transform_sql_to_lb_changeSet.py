import os
import fnmatch

rootdir = os.getcwd() # replace with the directory you want to search
nonreplaceable = []
replaceable = []


for subdir, dirs, files in os.walk(rootdir):
    if os.path.basename(subdir) in ["functions","procedures","views","triggers"]:
        for file in files:
            if fnmatch.fnmatch(file, '*.sql'):
                replaceable.append(os.path.join(subdir, file))

#print(replaceable)

# Create changesets for replaceable objects
for sqlfile in replaceable:
    # Get original file content - raw is important to not lose your file formatting e.g. spaces and new lines
    with open(sqlfile, "r") as f:
        original_content = f.read()
    # Take only filename without extension / we will use it as changeset ID
    filename = os.path.splitext(os.path.basename(sqlfile))[0]

    if "--liquibase formatted sql" in original_content:
        print(f"File {filename} already has changeset - nothing to add!")
        # open the file in read mode
        #with open(sqlfile, 'r') as file:
            # read all lines into a list
            #lines = file.readlines()
            # modify the second line
            #lines[1] = lines[1].replace('runOnChange:true', 'runOnChange:true stripComments:false splitStatements:false')
             #open the file in write mode and write the modified lines back to the file
        #with open(sqlfile, 'w') as file:
            #file.writelines(lines)
    else:
        # `n means - add enter
        space = ' '
        new_line = "\n"
        # Create Liquibase changeset parameters
        liquibase = "--liquibase formatted sql" + new_line
        changeset = "--changeset" + space
        username = "liquibase"
        changeset_id = ":" + filename + space
        run_on_change = "runOnChange:true" + space
        strip_comments = "stripComments:false" + space
        split_statements = "splitStatements:false" + space
        rollback = "--rollback: SELECT 1" + "\n"
        context = "context:Release_1_0" + space
        labels = "labels:liquibase_project_start" + new_line
        comment = f"--comment: initial changeset for {filename}" + "\n"
        # Add Liquibase's changeset parameters on top of modified file
        content_modified = liquibase + changeset + username + changeset_id + run_on_change + strip_comments + split_statements + context + labels + comment + rollback + original_content
        # set new content of modified file
        with open(sqlfile, 'w') as file:
            file.write(content_modified)



for subdir, dirs, files in os.walk(rootdir):
    if os.path.basename(subdir) in ["tables","types","materialized_views"]:
        for file in files:
            if fnmatch.fnmatch(file, '*.sql'):
                nonreplaceable.append(os.path.join(subdir, file))

#print(nonreplaceable)

# Create changesets for non-replaceable objects
for sqlfile in nonreplaceable:
    # Get original file content - raw is important to not lose your file formatting e.g. spaces and new lines
    with open(sqlfile, "r") as f:
        original_content = f.read()
    # Take only filename without extension / we will use it as changeset ID
    filename = os.path.splitext(os.path.basename(sqlfile))[0]
    if "--liquibase formatted sql" in original_content:
        print(f"File {filename} already has changeset - nothing to add!")
    else:
        # `n means - add enter
        space = ' '
        new_line = "\n"
        # Create Liquibase changeset parameters
        liquibase = "--liquibase formatted sql" + new_line
        changeset = "--changeset" + space
        username = "liquibase"
        changeset_id = ":" + filename + space
        strip_comments = "stripComments:false" + space
        split_statements = "splitStatements:false" + space        
        context = "context:Release_1_0" + space
        labels = "labels:liquibase_project_start" + new_line
        comment = f"--comment: initial changeset for {filename}" + "\n"
        # Optional fake rollback. When running "liquibase rollback" command it will not touch your DB objects, but only remove rows from DATABASECHANGELOG tracking table.
        # When creating new changesets always add working rollback to your change and test it with "liquibase updateTestingRollback" command
        rollback = "--rollback: SELECT 1" + "\n"
        # Add Liquibase's changeset parameters on top of modified file
        content_modified = liquibase + changeset + username + changeset_id + strip_comments + split_statements + context + labels + comment + original_content
        # set new content of modified file
        with open(sqlfile, 'w') as file:
            file.write(content_modified)