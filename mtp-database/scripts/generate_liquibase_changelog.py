from path_modifier import pathModifier
from file_operations import fileOperations
from liquibase_operations import liquibaseOperations
from get_user_choice import getUserChoice
from sql_operatons import sqlOperations
import os
import sys

path = input("Enter the path: \n")

#Add non client folders here
non_client_folders = set(["__pycache__", "data", "global", "schemas", "utils"])

absolute_path = pathModifier.get_absolute_path(path_input= path)

if not os.path.exists(absolute_path):
    print(f"{absolute_path} is not a valid path")
    sys.exit()

file_operation = fileOperations()
csv_files: list[str] = file_operation.find_files(path = absolute_path, type = "csv")

if len(csv_files) == 0:
    print(f"there is no csv file in the given path {absolute_path}")
    sys.exit()

print(len(csv_files))

def create_table_if_not_exist(input_file: str, output_file: str):
    output_file_temporary = output_file[:-4] + "_temp" +".sql"
    file_operation.replace_phrase_in_file(input_file= input_file, 
                                           output_file= output_file_temporary, current_phrase= "CREATE TABLE", 
                                           target_phrase= "CREATE TABLE IF NOT EXISTS")
    
    file_operation.replace_phrase_in_file(input_file= output_file_temporary, 
                                           output_file= output_file, current_phrase= "CREATE TABLE IF NOT EXISTS IF NOT EXISTS", 
                                           target_phrase= "CREATE TABLE IF NOT EXISTS")
    
    file_operation.delete_file(output_file_temporary)


for file in csv_files:
    print(f"Enter the client name for {file}: \n")
    user_choice = getUserChoice()
    client_name = user_choice.get_client_from_user(non_client_folders= non_client_folders)
    if client_name == "skip":
        continue

    if client_name == "exit":
        sys.exit()

    schema = file.split('/')[-2]

    print(client_name)

    local_sql_path = client_name + "/schemas/" + schema + "/tables/" + file.split("/")[-1][:-4] + ".sql"
    global_sql_path = os.getcwd() + "/database/schemas/" + schema + "/tables/" + file.split("/")[-1][:-4] + ".sql"


    is_sql_def_local = False
    is_sql_def_global = False

    if file_operation.is_file(local_sql_path):
        is_sql_def_local = True
        sql_def_path = local_sql_path

    elif file_operation.is_file(global_sql_path):
        is_sql_def_global = True
        sql_def_path = global_sql_path

    else:
        print(f"SQL definition is not found in \n {local_sql_path} \n or \n {global_sql_path}")
        print("Skipping the file")
        continue

    print(f"sql definition file is {sql_def_path}")

    lb_sql_file = file[:-4] + "_lb" + ".sql"
    lb_sql_file_temp = file[:-4] + "_lb_temp_temp" + ".sql"
    schema_sql_file = file[:-4] + f"_{schema}" + ".sql"

    file_operation.replace_phrase_in_file(input_file= sql_def_path, 
                                          output_file= lb_sql_file_temp,
                                          current_phrase= "CREATE TABLE IF NOT EXISTS",
                                          target_phrase="CREATE TABLE"
                                          )

    file_operation.replace_phrase_in_file(input_file= lb_sql_file_temp, 
                                            output_file= lb_sql_file, current_phrase= schema, 
                                            target_phrase= "liquibase")
    file_operation.delete_file(lb_sql_file_temp)

    file_operation.insert_before_specific_line(file= lb_sql_file, line= f"DROP TABLE IF EXISTS liquibase.{file.split('/')[-1][:-4]};",
                                               target_line= "CREATE TABLE")

    create_table_if_not_exist(input_file= sql_def_path, output_file= schema_sql_file)

    print("Choose your liquibase properties file: \n")

    liquibase_file = user_choice.get_liquibase_properties_from_user()
    liquibase_operation = liquibaseOperations()

    database_connection_details = dict()

    if liquibase_file == "manually":
        database_connection_details = liquibase_operation.set_connection_details()

    else:
        database_connection_details = liquibase_operation.fetch_connection_details(path = liquibase_file)

    database_conn = liquibase_operation.make_connection_to_database(connection_details= database_connection_details)

    schema_names = ["liquibase", schema]
    sql_paths = [lb_sql_file, schema_sql_file]
    table_name = []

    sql_operation = sqlOperations()

    for ind in range(len(schema_names)):
        try:
            table_name.append(schema_names[ind] + "." + file.split('/')[-1].split('.')[0])
            sql_operation.execute_sql_file(connection= database_conn, path= sql_paths[ind])
            print(f"SQL file executed successfully to create table {table_name[-1]}!")

        except:
            print("Error executing SQL file.")

    if sql_operation.check_pk_uk(connection = database_conn, table_name = table_name[0]):
        print("Perfectly OK")
    else:
        print("PK/UK not defined on table")
        print("skipping the file")
        file_operation.delete_list_of_files([lb_sql_file, schema_sql_file])
        continue

    p_file_path = '/'.join(file.split('/')[file.split('/').index('database'):])
    p_changeset_author = input("Enter the changeset author name: \n")
    p_changeset_context = input("Enter the changeset context: \n")
    p_changeset_labels = input("Enter the changeset labels: \n")

    xml_files = []

    for ind in range(len(schema_names)):
        if schema_names[ind] == "liquibase":
            xml_files.append(("/".join(file.split("/")[:-1]) +"/" + 
                                    file.split("/")[-1])[:-4]+f"_{schema_names[ind]}"+".xml")
            
        else:
            xml_files.append(("/".join(file.split("/")[:-1]) +"/" + 
                                    file.split("/")[-1])[:-4]+".xml")
        
        liquibase_operation.generate_liquibase_changeset(p_schema_name= schema_names[ind],
                                                         p_changeset_author= p_changeset_author,
                                                         p_changeset_context= p_changeset_context,
                                                         p_changeset_labels= p_changeset_labels,
                                                         p_file_path= p_file_path,
                                                         p_table_name= table_name[ind].split('.')[1],
                                                         output_file_path= xml_files[-1],
                                                         connection= database_conn)
        
    if liquibase_operation.validate_xml_file(xml_path= xml_files[0], connection_details= database_connection_details):
        print("liquibase changeset validation successfull")

    else:
        print("liquibase changeset validation failed deleting the .xml files")
        file_operation.delete_list_of_files([lb_sql_file, schema_sql_file])
        file_operation.delete_list_of_files(xml_files)
        continue

    changelog_file_path = f"{os.getcwd()}/csv_changelog_temp.xml"
    liquibase_operation.create_changelog_xml_file(change_set_file = xml_files[0], output_file_path= changelog_file_path)

    if liquibase_operation.update_changelog_file(xml_path= changelog_file_path, connection_details= database_connection_details):
        file_operation.delete_file(changelog_file_path)
        file_operation.delete_file(xml_files[0])

        print("Liquibase command testing is successful")

    else:
        print("Liquibase command testing failed!")
        print("Deleting the .xml files")

        file_operation.delete_list_of_files(file_list= xml_files)
        file_operation.delete_file(changelog_file_path)

    file_operation.delete_list_of_files([lb_sql_file, schema_sql_file])
    database_conn.close()