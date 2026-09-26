import os
import json
import glob
from copy import deepcopy
from csv import reader
import pandas as pd
from utils import dependency_graph, constants
import utils.constants as db_constants
import utils.db_utils as db_utils
import traceback
import subprocess
import logging
from typing import List, Dict
from collections import defaultdict
import copy
import shutil



def credentials_exist(*args):
    for arg in args:
        if arg is None:
            return False
    return True


def get_duplicate_rows(file_path, pk_list):
    data = pd.read_csv(file_path)
    # Group the data by primary key list
    duplicates = data[data.duplicated(pk_list)]
    # Filter the DataFrame to include only the primary key columns
    duplicates_pk = duplicates[pk_list]
    duplicates_str = duplicates_pk.to_string(index=False)
    return duplicates_str


def scan_dir(dir, ext, allowed_dirs):  # dir: str, ext: list
    subfolders, files = [], []

    for f in os.scandir(dir):
        # exclude traversing inside directories ending with "schemas"
        if f.is_dir() and f.path.split("/")[-1:][0] in allowed_dirs:
            subfolders.append(f.path)
        if f.is_file():
            if os.path.splitext(f.name)[1].lower() in ext:
                files.append(f.path)

    for dir in list(subfolders):
        sf, f = scan_dir(dir, ext, allowed_dirs)
        subfolders.extend(sf)
        files.extend(f)
    return subfolders, files


def get_columns(path):
    with open(path, "r") as read_obj:
        # pass the file object to reader() to get the reader object
        csv_reader = reader(read_obj)
        # Iterate only over first row in the csv using reader object and return the column names
        for row in csv_reader:
            filtered_columns = [column for column in row if len(column) > 0]
            return filtered_columns


def get_segregated_tables_int_columns(pg_sync_target) -> dict:
    """
    Retrieves the segregation tables dictionary where the columns with integer as datatype are present
    """
    segregation_tables_list = db_constants.SEGREGATED_TABLES_CONFIG
    segregation_tables = {}
    result = {}
    conditional_list = []
    SELECT_TABLE_DATA_INFOSCHEMA = db_constants.SELECT_TABLE_DATA_INFOSCHEMA
    data_type = "integer"
    for table in segregation_tables_list:
        table_schema = table.get("table_name").split(".")[0]
        table_name = table.get("table_name").split(".")[1]
        conditional = f"((table_schema = '{table_schema}' AND table_name = '{table_name}') AND data_type='{data_type}')"
        conditional_list.append(conditional)
    conditionals = " OR ".join(conditional_list)
    query = f"""
        {SELECT_TABLE_DATA_INFOSCHEMA}
        WHERE ({conditionals})
        """
    segregation_tables = db_utils.execute_query(
        pg_sync_target, query, return_type="dict"
    )
    # Create the resultant segregation table dictionary from the result of the SQL query
    for table in segregation_tables:
        table_name_res = table["table_schema"] + "." + table["table_name"]
        if table_name_res not in result:
            result[table_name_res] = {"int_columns": []}
        result[table_name_res]["int_columns"].append(table["column_name"])
    return result

def get_client_data_path(global_table_path):
    return "/".join(global_table_path.split("/")[:-2])

def get_product_file_paths(global_table_path, global_table_name):
    client_data_path = get_client_data_path(global_table_path= global_table_path)
    product_file_paths = []

    for folder in os.listdir(client_data_path):
        product_file_path = (
            client_data_path
            + "/"
            + folder
            + "/"
            + global_table_name.replace("global.", "", 1)
            + ".csv"
        )
        if (folder != "global") and (os.path.exists(product_file_path)):
            product_file_paths.append(product_file_path)

    return product_file_paths


def merge_strategies(
    client: str,
    global_table_path: str,
    global_table_name: str,
    segregated_table_config: dict,
    segregated_table_int_columns: dict,
):
    combined_product_file_paths = []
    client_data_path = get_client_data_path(global_table_path= global_table_path)

    product_files_map = {}
    
    product_file_paths = get_product_file_paths(global_table_path= global_table_path ,global_table_name= global_table_name)
    if ('/'+client+'/') not in global_table_path:
        table_path = global_table_path.replace('/database/', f'/database/{client}/', 1)
        client_segregated_file_paths = get_product_file_paths(global_table_path=table_path ,global_table_name= global_table_name)

        visited_paths = set()
        for path in client_segregated_file_paths:
            s_path = path.split('/')
            visited_paths.add((s_path[-2], s_path[-1]))
            combined_product_file_paths.append(path)
        
        for path in product_file_paths:
            s_path = path.split('/')
            if (s_path[-2], s_path[-1]) not in visited_paths:
                combined_product_file_paths.append(path)
    else:
        combined_product_file_paths = product_file_paths

    # creating temporary table to contain the data of global csv
    temp_global_file_path = (
        client_data_path
        + "/global/"
        + global_table_name.replace("global.", "", 1)
        + "_temporary.csv"
    )

    data_source_ranges = []

    with open(global_table_path, "r") as source_file, open(
        temp_global_file_path, "w"
    ) as destination_file:
        file_content = source_file.read()
        destination_file.write(file_content)

    try:
        # Merging based on the strategy
        if combined_product_file_paths:
            merge_strategy = segregated_table_config["merge_strategy"]
            if merge_strategy == "primary_key_merge":
                merged_data, data_source_ranges = primary_key_merge(
                    global_table_path, combined_product_file_paths, segregated_table_config
                )
            elif merge_strategy == "csv_merge":
                merged_data, data_source_ranges = csv_merge(
                    global_table_path, combined_product_file_paths, segregated_table_config
                )

            # Handling integer columns: This part applies to both strategies
            for column in segregated_table_int_columns.get("int_columns", []):
                # If column doesn't exist, add it with null values
                if column not in merged_data.columns:
                    merged_data[column] = pd.NA
                merged_data[column] = merged_data[column].fillna(-1)
                # merged_data[column] = merged_data[column].astype(float)
                merged_data[column] = merged_data[column].astype(int)
                merged_data[column].replace(-1, pd.NA, inplace=True)

            # Final deduplication before writing the result
            merged_data = merged_data.drop_duplicates(ignore_index=False)
            merged_data.to_csv(global_table_path, index=False)

            # Rename product files to avoid sync errors
            for path in combined_product_file_paths:
                directory, old_filename = os.path.split(path)
                new_path = os.path.join(
                    directory, old_filename[:-4] + "_temporary" + ".csv"
                )
                product_files_map[new_path] = path
                os.rename(path, new_path)

        return {
            "global_temporary_file": temp_global_file_path,
            "renamed_product_files": product_files_map,
            "data_source_ranges": data_source_ranges,
        }

    except Exception:
        logging.error(
            f"primary_key_merge: csv merged failed due to exception: {traceback.print_exc()}"
        )
        table_map = {}
        table_map[global_table_path] = {
            "global_temporary_file": temp_global_file_path,
            "renamed_product_files": product_files_map,
            "data_source_ranges": data_source_ranges,
        }
        post_sync_file_process(tables_map=table_map)


# Primary Key Merge Function
def primary_key_merge(global_table_path, product_file_paths, segregated_table_config):
    """Merge based on the primary key, updating existing rows and adding new rows."""
    # Read the global table (primary file)
    global_table_data = pd.read_csv(global_table_path)
    merged_data = global_table_data
    
    # Initialize line tracking
    data_source_ranges = []
    current_line = 1
    
    # Track global table range
    schema = global_table_path.split('/')[-2]  # Get schema from path
    table_name = global_table_path.split('/')[-1].replace('.csv', '')  # Get table name without extension
    global_end_line = len(global_table_data)
    
    data_source_ranges.append({
        'table_name': f"{schema}.{table_name}",
        'startLine': current_line,
        'endLine': global_end_line
    })
    
    current_line = global_end_line + 1

    # Merge product files into the global table based on the primary key
    for path in product_file_paths:
        product_table_data = pd.read_csv(path)
        schema = path.split('/')[-2]  # Get schema from path
        table_name = path.split('/')[-1].replace('.csv', '')  # Get table name without extension

        # Merge the data: only update rows that have the same primary key
        merge_key = segregated_table_config["merge_key"]

        # Set indices based on the merge key
        merged_data = merged_data.set_index(merge_key)
        product_table_data = product_table_data.set_index(merge_key)

        # Update existing rows
        merged_data.update(product_table_data)

        # Add new rows that aren't in the merged data yet
        new_rows = product_table_data.reset_index()[
            ~product_table_data.index.isin(merged_data.index)
        ]
        
        if not new_rows.empty:
            # Track line range for this product table's new data
            start_line = current_line
            end_line = current_line + len(new_rows) - 1
            
            data_source_ranges.append({
                'table_name': f"{schema}.{table_name}",
                'startLine': start_line,
                'endLine': end_line
            })
            
            current_line = end_line + 1

        # Reset index and append the new rows
        merged_data = merged_data.reset_index()
        merged_data = pd.concat([merged_data, new_rows], ignore_index=True)

    # Write the merged data back to the global table (primary file)
    merged_data.to_csv(global_table_path, index=False)
    
    return merged_data, data_source_ranges


# CSV Merge Function (allows duplicates)
def csv_merge(global_table_path, product_file_paths, segregated_table_config):
    """Merges application-specific CSV data into global CSV while preserving non-overridden global data."""
    
    # Load global CSV file
    global_data = pd.read_csv(global_table_path)

    for col in global_data.columns:
        try:
            # Skip columns with non-numeric types (e.g., objects that aren't numbers)
            if pd.api.types.is_numeric_dtype(global_data[col]):
                # Only convert if all non-NaN values are integers
                if (global_data[col].dropna() % 1 == 0).all():
                    global_data[col] = global_data[col].astype('Int64')
        except Exception:
            pass  # Skip columns that cannot be safely converted

    # Use the merge key from the config (e.g., 'fc_code', 'tc_code')
    merge_key = segregated_table_config["merge_key"]

    # Initialize merged_data with global_data, ensuring no index is set initially
    merged_data = deepcopy(global_data)

    # Store the keys from global data to keep track of what's overridden
    global_keys = set(global_data[merge_key])
    
    # Initialize tracking for data sources
    data_source_ranges = []
    
    # Track source table information
    source_tables = []
    schema = global_table_path.split('/')[-2]
    table_name = global_table_path.split('/')[-1].replace('.csv', '')

    source_tables = [{'table_name': f"{schema}.{table_name}"}]
    
    # Initialize an empty DataFrame to store results from product files
    app_specific_data = pd.DataFrame()

    # Iterate over product file paths (application-specific CSV files)
    for product_file_path in product_file_paths:
        product_data = pd.read_csv(product_file_path)
        product_schema = product_file_path.split('/')[-2]
        product_table_name = product_file_path.split('/')[-1].replace('.csv', '')
        
        # Record source information with row count
        source_tables.append({
            'table_name': f"{product_schema}.{product_table_name}",
            'row_count': len(product_data)
        })

        product_data = product_data.convert_dtypes()
        # Append product-specific data (duplicates included) to app_specific_data
        app_specific_data = pd.concat([app_specific_data, product_data], ignore_index=True)

    # Override global data with product data for matching keys
    for key in global_keys:
        # If the key exists in the app-specific data, filter it from global
        if key in app_specific_data[merge_key].values:
            # Remove the global rows with this key
            merged_data = merged_data[merged_data[merge_key] != key]
    
    # Track how many rows remain in global data after filtering
    source_tables[0]['row_count'] = len(merged_data)
    
    # Merge the filtered global data with product data
    merged_data = concat_preserving_types(merged_data, app_specific_data)
    
    # Now calculate line ranges in the correct order (global first, then products)
    current_line = 1
    
    # Create data_source_ranges based on source_tables list (which maintains order)
    for source in source_tables:
        if source['row_count'] > 0:
            data_source_ranges.append({
                'table_name': source['table_name'],
                'startLine': current_line,
                'endLine': current_line + source['row_count'] - 1
            })
            current_line += source['row_count']

    # Write the merged data back to the global file
    merged_data.to_csv(global_table_path, index=False)
    return merged_data, data_source_ranges


def concat_preserving_types(df1, df2):
    for col in df2.columns:
        if col in df1.columns:
            df1[col] = df1[col].astype(df2[col].dtype, errors='ignore')
        else:
            df1[col] = pd.Series(dtype=df2[col].dtype)
    return pd.concat([df1, df2], ignore_index=True)


def fetch_all_tables(folders, client, env=''):
    # folder names to include further into traversing
    allowed_dirs = folders + constants.ALLOWED_SCHEMA_DIRS
    subfolders, files = [], []
    prefix = os.getcwd()
    for key in folders:
        folder = f"{prefix}/{key}"
        sf, f = scan_dir(folder, [".csv"], allowed_dirs)
        subfolders.extend(sf)
        files.extend(f)

    csv_tables = []
    f = open("./utils/primary_key_mapping.json")
    pk_client_map = json.load(f)
    # Add all the common table key mapping
    pk_map = pk_client_map["common"]
    # Add the client specific table key mapping
    pk_map.update(pk_client_map.get(f"{client}", {}))
    for file_path in files:
        prefix, table = file_path.split("/")[-2:]
        table = table.split(".")[0]
        pk = pk_map.get(table)
        if pk == None:
            continue
        table_name = f"{prefix}.{table}"
        columns = get_columns(file_path)
        # print(f"pk - {pk} table - {table_name} , columns = {columns}\n")
        obj = {
            "pk": pk,
            "table_name": table_name,
            "file_path": file_path,
            "columns": columns,
        }
        csv_tables.append(obj)
    return csv_tables


def update_row_for_any_schema(target_file_path, env_df, target_df, pk_list, current_schema):
    """
    For each row in envrionment specific csv,
    (i) checking if it is present in any of the schema(global, inventory_smart etc.) tables, and updating that if found.
    (ii) if not found in any schema, appending it in the global (or schema specified in env_specific_schema_mapping.json) schema table.
    """
    allowed_schema_dirs = constants.ALLOWED_SCHEMA_DIRS
    base_parts = target_file_path.split(f"/{current_schema}/")
    if len(base_parts) == 2:
        base_path, rest_path = base_parts
        not_found_rows = []
        for idx, env_row in env_df.iterrows():
            try:
                row_tuple = tuple(env_row[pk_list])
                found = False
                for schema in allowed_schema_dirs:
                    candidate_path = f"{base_path}/{schema}/{rest_path}"
                    if os.path.exists(candidate_path):
                        candidate_df = pd.read_csv(candidate_path)
                        candidate_tuples = set(candidate_df[pk_list].apply(tuple, axis=1))
                        if row_tuple in candidate_tuples:
                            candidate_df = candidate_df[~(candidate_df[pk_list].apply(tuple, axis=1) == row_tuple)]
                            candidate_df = pd.concat([candidate_df, pd.DataFrame([env_row])], ignore_index=True)
                            candidate_df.to_csv(candidate_path, index=False)
                            found = True
                            break
                if not found:
                    not_found_rows.append(env_row)
            except Exception as e:
                logging.error(f"Error processing env_row at index {idx}: {e}")
                continue
        if not_found_rows:
            try:
                target_df = pd.read_csv(target_file_path)
                target_df = pd.concat([target_df, pd.DataFrame(not_found_rows)], ignore_index=True)
                target_df.to_csv(target_file_path, index=False)
            except Exception as e:
                logging.error(f"Error processing {target_file_path} for not found rows: {e}")


def copy_env_specific_tables(table_objects_list, client, enviroment):
    """
    Fully copying the env specific csv to the target schema.
    """
    # specify in env_specific_schema_mapping.json for other schemas as shown below
    # by default it will take the global schema
    # {
    # "carters":{
    #            "mail_notification_mapping": "assort_smart"
    #       }
    # }
    # Load schema mapping
    client_table_schema_dict = load_json_file('./utils/env_specific_schema_mapping.json')
    client_metadata_dict = client_table_schema_dict.get(client, {})

    updated_tables_objects = []
    env_folder = f'{enviroment}_specific'

    for table_obj in table_objects_list:
        table_obj_copy = copy.deepcopy(table_obj)  # Copy to avoid modifying original dict
        env_file_path = table_obj['file_path']

        if env_folder in env_file_path:

            table_name = table_obj['table_name'].split('.')[1]  # Extract table name without schema
            schema = client_metadata_dict.get(table_name, 'global')

            target_file_path = env_file_path.replace(env_folder, schema)
            if not os.path.exists(target_file_path): # if file exists, append or override rows
                # if file does not exist, add csv directly
                env_df = pd.read_csv(env_file_path)
                env_df.to_csv(target_file_path, index=False)
                print(f"Fully copied {env_folder} {table_obj['table_name']} to {target_file_path}")
            
        else:  # ignoring env specific tables
            updated_tables_objects.append(table_obj_copy)

    return updated_tables_objects


def add_env_specific_tables(table_objects_list, entry_dir, enviroment):
    prefix = os.getcwd()
    if entry_dir == "data":
        env_spe_folder_path = prefix+"/data/"+enviroment+"_specific"
    else:
        env_spe_folder_path = prefix+"/"+entry_dir+"/data/"+enviroment+"_specific"
    
    # Check if the environment-specific folder exists
    if not os.path.exists(env_spe_folder_path):
        return table_objects_list
    
    # Iterate over all CSV files in the environment-specific folder
    for root, dirs, files in os.walk(env_spe_folder_path):
        for file in files:
            if file.endswith('.csv'):
                file_path = os.path.join(root, file)
                
                # Extract table name from file name (without .csv extension)
                table_name_base = os.path.splitext(file)[0]
                table_name = f"{enviroment}_specific.{table_name_base}"
                
                # Read CSV to get columns and row count
                try:
                    df = pd.read_csv(file_path)
                    columns = list(df.columns)
                    row_count = len(df)
                    
                    # Create table object dictionary
                    table_obj = {
                        'pk': [],  # Empty pk as specified
                        'table_name': table_name,
                        'file_path': file_path,
                        'columns': columns,
                        'len()': row_count
                    }
                    
                    # Add to table_objects_list
                    table_objects_list.append(table_obj)
                    print(f"Added env-specific table: {table_name} with {row_count} rows")
                    
                except Exception as e:
                    logging.error(f"Error processing {file_path}: {e}")
                    continue
    
    return table_objects_list

def get_env_specific_tables(client, env):
    client_table_schema_dict = load_json_file('./utils/env_specific_schema_mapping.json')
    client_metadata_dict = client_table_schema_dict.get(client, {})

    tables_df_dict = {}

    # if test_specific or uat_specific is present in the data folder
    generic_env_specific_folder_path = f"{os.getcwd()}/data/{env}_specific"
    if os.path.exists(generic_env_specific_folder_path):
        for root, dirs, files in os.walk(generic_env_specific_folder_path):
            for file in files:
                if file.endswith('.csv'):
                    table_name = file.replace('.csv', '')
                    schema = client_metadata_dict.get(table_name, 'global')
                    table_name = f"{schema}.{table_name}"
                    table_path = generic_env_specific_folder_path + "/" + file
                    tables_df_dict[table_name] = pd.read_csv(table_path)

    env_specific_folder_path = f"{os.getcwd()}/{client}/data/{env}_specific"
    for root, dirs, files in os.walk(env_specific_folder_path):
        for file in files:
            if file.endswith('.csv'):
                table_name = file.replace('.csv', '')
                schema = client_metadata_dict.get(table_name, 'global')
                table_name = f"{schema}.{table_name}"
                table_path = env_specific_folder_path + "/" + file
                tables_df_dict[table_name] = pd.read_csv(table_path)

    return tables_df_dict

def upsert_env_specific_table(obj, client, env, env_specific_tables_df_dict):
    try:
        env_specific_table_name = obj['table_name'].split('.')[1]
        env_specific_df = env_specific_tables_df_dict.get(obj['table_name'], pd.DataFrame())
        target_table_path = obj['file_path']

        if not os.path.exists(target_table_path) or env_specific_df.empty:
            return

        client_table_schema_dict = load_json_file('./utils/env_specific_schema_mapping.json')
        client_metadata_dict = client_table_schema_dict.get(client, {})
        schema = client_metadata_dict.get(env_specific_table_name, 'global')
        
        target_df = pd.read_csv(obj['file_path'])

        # Apply datatype conversion logic (same as csv_merge function)
        for col in target_df.columns:
            try:
                # Skip columns with non-numeric types (e.g., objects that aren't numbers)
                if pd.api.types.is_numeric_dtype(target_df[col]):
                    # Only convert if all non-NaN values are integers
                    if (target_df[col].dropna() % 1 == 0).all():
                        target_df[col] = target_df[col].astype('Int64')
            except Exception:
                pass  # Skip columns that cannot be safely converted

        # Apply same datatype conversion to env_specific_df
        for col in env_specific_df.columns:
            try:
                # Skip columns with non-numeric types (e.g., objects that aren't numbers)
                if pd.api.types.is_numeric_dtype(env_specific_df[col]):
                    # Only convert if all non-NaN values are integers
                    if (env_specific_df[col].dropna() % 1 == 0).all():
                        env_specific_df[col] = env_specific_df[col].astype('Int64')
            except Exception:
                pass  # Skip columns that cannot be safely converted

        lookup_columns = client_metadata_dict.get("lookup_columns", {}).get(env_specific_table_name, [])
        if lookup_columns:
            pk_list = lookup_columns
        else:
            pk_list = obj['pk']
            pk_list = pk_list.strip() if type(pk_list) == str else pk_list
        if not pk_list:
            if len(target_df.columns) >= 3:
                pk_list = [target_df.columns[0], target_df.columns[1], target_df.columns[2]]
            else:
                pk_list = list(target_df.columns)
        pk_list = pk_list if type(pk_list) == list else [pk_list]

        if not pk_list:
            raise ValueError("pk_list cannot be empty")

        # Ensure PKs exist
        for pk in pk_list:
            if pk not in env_specific_df.columns or pk not in target_df.columns:
                raise KeyError(f"Primary key '{pk}' missing in one of the DataFrames")

        # Drop duplicates in env_specific_df
        env_specific_df = env_specific_df.drop_duplicates(subset=pk_list, keep="last")

        # Remove matching rows from target_df
        mask = target_df.set_index(pk_list).index.isin(env_specific_df.set_index(pk_list).index)
        target_df = target_df[~mask].copy()

        # Append new data using concat_preserving_types for consistent datatype handling
        result_df = concat_preserving_types(target_df, env_specific_df)

        result_df.to_csv(target_table_path, index=False)

    except Exception as e:
        print(f"Upsert failed, skipping env specific upsert: {e}")
        return


def remove_env_specific_folders(folders):
    prefix = os.getcwd()
    for folder in folders:
        full_path = os.path.join(prefix, folder)
        if not os.path.isdir(full_path):
            continue

        for item in os.listdir(full_path):
            item_path = os.path.join(full_path, item)
            if os.path.isdir(item_path) and "specific" in item:
                try:
                    shutil.rmtree(item_path)
                    print(f"Deleted: {item_path}")
                except Exception as e:
                    logging.error(f"Error deleting env_specific folder: {e}")


def check_sql_file(path):
    if path.endswith(".sql"):
        return True
    return False


def get_last_n_path_components(file_path, n):
    # Split the path using the directory separator '/'
    path_components = file_path.split("/")
    # Get the last n elements of the path using slicing
    last_n_components = path_components[-n:]
    # Join the last n components back into a string using the directory separator '/'
    last_n_path = "/".join(last_n_components)
    return last_n_path


#def append_sp_paths(sp_file_paths, path_pattern, excluded_sp_paths):
#    # Get the file paths of the matching functions/procedures
#    for filename in glob.iglob(path_pattern, recursive=True):
#        # Check whether the last 3 components of the file path are in the excluded_sp_paths set or not
#        if get_last_n_path_components(filename, 3) not in excluded_sp_paths:
#            sp_file_paths.append(filename)


#def fetch_required_sps(prefix, optional_paths, client, excluded_sp_paths):
#    sp_file_paths = []
#    sql_file = check_sql_file(optional_paths)
#    sync_file_paths = optional_paths.split(",")
#    if not sql_file:
#        # Add the file paths of the required schemas Eg - global,assort
#        for schema in sync_file_paths:
#            append_sp_paths(
#                sp_file_paths,
#                f"{prefix}/schemas/{schema}/functions/*.sql",
#                excluded_sp_paths,
#            )
#            append_sp_paths(
#                sp_file_paths,
#                f"{prefix}/schemas/{schema}/procedures/*.sql",
#                excluded_sp_paths,
#            )
#            # Add the client specific functions of the specific schema
#            append_sp_paths(
#                sp_file_paths,
#                f"{prefix}/{client}/schemas/{schema}/functions/*.sql",
#                excluded_sp_paths,
#            )
#            append_sp_paths(
#                sp_file_paths,
#                f"{prefix}/{client}/schemas/{schema}/procedures/*.sql",
#                excluded_sp_paths,
#            )
#
#        return sp_file_paths
#
#    # path element will be of the form "assort/functions/add_ecom_details.sql"
#    for path in sync_file_paths:
#        # Add the client folder path alongwith global schemas path
#        complete_paths = [
#            f"{prefix}/schemas/{path}",
#            f"{prefix}/{client}/schemas/{path}",
#        ]
#        sp_file_paths.extend(complete_paths)
#    return sp_file_paths


def load_json_file(path):
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


#def fetch_all_sps(sync_file_paths, client, env):
#    prefix = os.getcwd()
#    sp_file_paths = []
#    excluded_sp_paths_map = load_json_file("./utils/excluded_sp_paths.json")
#    # Get the set of excluded SP paths for the current client and environment
#    excluded_sp_paths = set(excluded_sp_paths_map.get(f"{client}_{env}", []))
#    # If we get the sp file paths as arguments only fetch those sp content
#    if sync_file_paths:
#        sp_file_paths = fetch_required_sps(
#            prefix, sync_file_paths, client, excluded_sp_paths
#        )
#    else:
#        mapping_json = load_json_file("./utils/client_sp_schema_mapping.json")
#        schemas = mapping_json.get(client)
#        if schemas:
#            # Add sp's of only client specific schemas
#            for schema in schemas:
#                sp_pattern = f"{prefix}/schemas/{schema}/functions/*.sql"
#                procedures_pattern = f"{prefix}/schemas/{schema}/procedures/*.sql"
#                append_sp_paths(sp_file_paths, sp_pattern, excluded_sp_paths)
#                append_sp_paths(sp_file_paths, procedures_pattern, excluded_sp_paths)
#        else:
#            # Add the file paths of all the functions
#            append_sp_paths(
#                sp_file_paths, f"{prefix}/schemas/**/functions/*.sql", excluded_sp_paths
#            )
#            # Add the file paths of all the procedures
#            append_sp_paths(
#                sp_file_paths,
#                f"{prefix}/schemas/**/procedures/*.sql",
#                excluded_sp_paths,
#            )
#        # Add the client specific functions
#        append_sp_paths(
#            sp_file_paths,
#            f"{prefix}/{client}/schemas/**/functions/*.sql",
#            excluded_sp_paths,
#        )
#        # Add the client specific procedures
#        append_sp_paths(
#            sp_file_paths,
#            f"{prefix}/{client}/schemas/**/procedures/*.sql",
#            excluded_sp_paths,
#        )
#    return sp_file_paths


def merge_tables(common_global_tables, client_global_tables):
    visited_client_tables = {}
    merged_tables = []
    global_synced = set()
    # Mark all client table names as visited / true
    for obj in client_global_tables:
        table = obj["table_name"].split('.')
        schema = table[0]
        table_name = table[-1]
        if schema == "global":
            global_synced.add(table_name)
        visited_client_tables[obj["table_name"]] = True
    for obj in common_global_tables:
        # Add to final merged_tables list if table from common data folder is not present in client folder
        table = obj["table_name"].split('.')
        schema = table[0]
        table_name = table[-1]
        if not visited_client_tables.get(obj["table_name"]) and table_name not in global_synced:
            merged_tables.append(obj)
    # Add all the client global folder tables
    merged_tables.extend(client_global_tables)
    # sort the tables order so that the config mapping tables are created after config tables
    ordered_merged_tables = dependency_graph.sort_files(merged_tables)
    return ordered_merged_tables


def merge_segregated_table_data(
    client, table, segregated_tables_int_columns, segregated_tables_config_dict
):

    table_name = table["table_name"]
    if table_name in segregated_tables_config_dict:
        segregated_table_config = segregated_tables_config_dict[table_name]
        segregated_table_int_columns = segregated_tables_int_columns[table_name]
        data = merge_strategies(
            client=client,
            global_table_path=table.get("file_path"),
            global_table_name=table.get("table_name"),
            segregated_table_config=segregated_table_config,
            segregated_table_int_columns=segregated_table_int_columns,
        )
        if data:
            table['merged_csv_details'] = data['data_source_ranges']
        # Update columns for table object after merge
        merged_df = pd.read_csv(table.get("file_path"), nrows=0)
        table['columns'] = merged_df.columns.tolist()
        return data
    return {}

def is_exception_table(table_name):
    pk_map = load_json_file('./utils/primary_key_mapping.json')
    exception_tables = pk_map.get("exception_tables" , None)
    if table_name in exception_tables:
        return True
    return False

def is_upsert_table(table_name):
    pk_map = load_json_file('./utils/primary_key_mapping.json')
    upsert_tables = pk_map.get("upsert_tables" , None)
    if table_name in upsert_tables:
        return True
    return False

def get_segregated_tables_config_dict():
    segregated_tables_config = deepcopy(db_constants.SEGREGATED_TABLES_CONFIG)  # Create a deep copy to modify

    segregated_tables_config_dict = {
        item["table_name"]: item for item in segregated_tables_config
    }

    return segregated_tables_config_dict    

def get_primary_and_unique_keys(tables, pg_sync_target):
    where_clause_list = []

    for table in tables:
        schema, table_name = table.split('.')
        where_clause_list.append(f"(kcu.table_schema = '{schema}' and kcu.table_name = '{table_name}')")

    where_clause = f"({' or '.join(where_clause_list)}) and pc.contype in ('p', 'u')"

    query = f"""
            SELECT
                kcu.constraint_name as constraint_name,
                CASE pc.contype
                    WHEN 'p' THEN 'Primary Key'
                    WHEN 'u' THEN 'Unique Key'
                END AS constraint_type,
                concat(kcu.table_schema, '.', kcu.table_name) as table_name, kcu.column_name as column_name
            FROM
                information_schema.key_column_usage kcu
                join pg_constraint pc
                on kcu.constraint_name = pc.conname
            Where
                {where_clause}
    """

    configs = db_utils.execute_query(
        pg_sync_target, query, return_type="dict"
    )

    def generate_key_config_map(configs: List):
        key_config_map = {}
        for config in configs:
            if config["table_name"] not in key_config_map:
                key_config_map[config["table_name"]] = {}

            if config['constraint_type'] not in key_config_map[config["table_name"]]:
                key_config_map[config["table_name"]][config['constraint_type']] = {}

            if config['constraint_name'] not in key_config_map[config["table_name"]][config['constraint_type']]:
                key_config_map[config["table_name"]][config['constraint_type']][config['constraint_name']] = []

            key_config_map[config["table_name"]][config['constraint_type']][config['constraint_name']].append(config['column_name'])

        return key_config_map
    
    return generate_key_config_map(configs)

def get_list_of_unique_keys(primary_unique_keys):
    table_unique_columns_map = defaultdict(list)

    for table in primary_unique_keys:
        for constraint_type in primary_unique_keys[table]:
            for constraint_name in primary_unique_keys[table][constraint_type]:
                if constraint_type in ['Unique Key', 'Primary Key']:
                    table_unique_columns_map[table].append(primary_unique_keys[table][constraint_type][constraint_name])

    return table_unique_columns_map

def get_duplicate_data(df, column_list):
    return df[df.duplicated(subset=column_list, keep=False)]

def get_duplicate_rows_id(duplicate_rows, column_list):
    duplicate_data = set(duplicate_rows[column_list].itertuples(index=False, name=None))
    return list(duplicate_data)

def validate_csv_util(primary_unique_keys: Dict, table_path_map: Dict):
    invalid_files = set()
    table_unique_columns_map = get_list_of_unique_keys(primary_unique_keys= primary_unique_keys)

    def add_all_invalid_file_paths(file_paths):
        for file_path in file_paths:
            invalid_files.add(file_path)

    for table in primary_unique_keys:
        file_paths = get_product_file_paths(global_table_path= table_path_map[table], global_table_name = table)
        file_paths.append(table_path_map[table])
        child_table = primary_unique_keys[table].get('child_table','')
        child_file_paths = []
        if child_table != '':
            child_file_paths = get_product_file_paths(global_table_path= table_path_map[child_table], global_table_name = child_table)
            child_file_paths.append(table_path_map[child_table])
        for file_path in file_paths:
            try:
                df = pd.read_csv(file_path)
                for column_list in table_unique_columns_map[table]:
                    duplicate_rows = get_duplicate_data(df, column_list)
                    if len(duplicate_rows) > 0:
                        logging.error(f"{file_path} contains duplicate rows for columns {tuple(column_list)} and data: {get_duplicate_rows_id(duplicate_rows, column_list)}")
                        add_all_invalid_file_paths(file_paths= file_paths)
                        continue
            except Exception as e:
                logging.error(f"csv read failed for the file {file_path} with exception {str(e)}")
                add_all_invalid_file_paths(file_paths= file_paths)
                if child_file_paths:
                    add_all_invalid_file_paths(file_paths = child_file_paths)
                continue

    return invalid_files

def validate_csv_data(tables, pg_sync_target):
    """
        This function checks the data in segregated csv files are proper or not
        If the data is not proper then it will log the error in the mail and remove the tables
        from the sync flow
    """
    segregated_tables_config_dict = get_segregated_tables_config_dict()

    segregated_tables_list = []
    visited_segregated_tables = set()
    table_path_map = dict()

    # Adding tables in the list in a proper order like 
    # parent table will come first and then the child tables

    for table in tables:
        if table["table_name"] in segregated_tables_config_dict:
            parent_table = segregated_tables_config_dict[table["table_name"]].get("parent_table", "")
            if parent_table != "" and (parent_table not in visited_segregated_tables):
                visited_segregated_tables.add(parent_table)
                segregated_tables_list.append(parent_table)

            segregated_tables_list.append(table["table_name"])
            visited_segregated_tables.add(table["table_name"])
            table_path_map[table["table_name"]] = table["file_path"]

    invalid_tables = []
    if segregated_tables_list == []:
        return invalid_tables

    primary_unique_keys = get_primary_and_unique_keys(tables = segregated_tables_list, pg_sync_target= pg_sync_target)

    for table in primary_unique_keys:
        parent_table = segregated_tables_config_dict[table].get("parent_table", "")
        if parent_table != "":
            primary_unique_keys[parent_table]["child_table"] = table

    invalid_files = validate_csv_util(primary_unique_keys= primary_unique_keys, table_path_map= table_path_map)

    for invalid_file in invalid_files:
        invalid_schema, invalid_table = invalid_file.split('/')[-2:]
        invalid_table = invalid_table[:-4]
        invalid_tables.append(invalid_schema + '.' + invalid_table)

    return invalid_tables

def validate_and_merge_segregated_table_data(client, tables, pg_sync_target):
    segregated_tables_int_columns = get_segregated_tables_int_columns(pg_sync_target)    
    segregated_tables_config_dict = get_segregated_tables_config_dict()

    invalid_tables = validate_csv_data(tables, pg_sync_target)
    # Create a temporary list to hold invalid tables
    temp_table_map = {}

    # Iterate over 'tables' to validate each one
    for table in tables:
        table_name = table["table_name"]
        
        if (table_name in segregated_tables_config_dict) and (table_name not in invalid_tables):
            segregated_table_config = segregated_tables_config_dict[table_name]
            global_table_path = table.get("file_path")  # Get the global table path
            
            # Perform validation
            if not validate_primary_keys(table_config=segregated_table_config, global_table_path=global_table_path):
                logging.error("Primary key validation failed for %s. Removing from config.", table_name)
                invalid_tables.append(table_name)  # Track invalid table names
                continue
            elif segregated_table_config.get("parent_table") and not validate_mapping_against_parent(
                config=segregated_table_config,
                global_path=global_table_path
                ):
                logging.error("Mapping validation against parent table failed for %s. Removing from config.", table_name)
                invalid_tables.append(table_name)
                continue

            temp_table_map[table.get("file_path")] = merge_segregated_table_data(
                    client=client,
                    table=table,
                    segregated_tables_int_columns=segregated_tables_int_columns,
                    segregated_tables_config_dict=segregated_tables_config_dict
                )
            
    return invalid_tables, temp_table_map


def validate_mapping_against_parent(config, global_path):
    table_name = config["table_name"]
    parent_name = config["parent_table"]
    merge_key = config["merge_key"]

    base_path = "/".join(global_path.split("/")[:-2])
    file_paths = [
        {
            "child": f"{base_path}/{folder}/{table_name.split('.')[1]}.csv",
            "parent": f"{base_path}/{folder}/{parent_name.split('.')[1]}_temporary.csv"
        }
        for folder in os.listdir(base_path)
        if folder != "global" and os.path.exists(f"{base_path}/{folder}/{table_name.split('.')[1]}.csv")
    ]

    for paths in file_paths:
        try:
            child_data = pd.read_csv(paths["child"])
            parent_data = pd.read_csv(paths["parent"])

            invalid_keys = set(child_data[merge_key].dropna()) - set(parent_data[merge_key].dropna())

            if invalid_keys:
                folder = paths["parent"].split('/')[-2]
                invalid_key_lines = {}
                for invalid_key in invalid_keys:
                    line_num = child_data[child_data[merge_key] == invalid_key].index[0] + 2
                    invalid_key_lines[invalid_key] = line_num
                print(f"Invalid keys {invalid_keys} found in {paths['child']}, missing in parent CSV. (invalid_key: line_number) mapping: {invalid_key_lines}, folder name: {folder}")
                logging.error(f"Invalid keys {invalid_keys} found in {paths['child']}, missing in parent CSV. (invalid_key: line_number) mapping: {invalid_key_lines}, folder name: {folder}")
                return False
        except Exception as e:
            print(e)
            logging.error("Error processing %s or %s: %s", paths["child"], paths["parent"], str(e))
            return False

    return True


def validate_primary_keys(table_config, global_table_path):
    """Validates primary keys for a given table's configuration based on validation_keys."""
    validation_keys = table_config["validation_keys"]
    table_name = table_config["table_name"]
    key_occurrences = {}  # Tracks folders where each key was first seen
    key_collisions = {}  # Tracks collision keys and their respective folders

    def validate_keys(dataframe, folder_name):
        """Validate keys within a DataFrame and log collisions."""
        for key in validation_keys:
            if key in dataframe.columns:
                unique_keys = dataframe[key].dropna().unique()
                for value in unique_keys:
                    if value in key_occurrences:
                        # If key collision occurs, store it with both folders
                        key_collisions.setdefault(value, {key_occurrences[value]}).add(folder_name)
                    else:
                        key_occurrences[value] = folder_name
        return True

    # Check keys across product tables
    client_data_dir = "/".join(global_table_path.split("/")[:-2])
    for folder in os.listdir(client_data_dir):
        if folder == "global":
            continue  # Skip global folder

        product_file_path = f"{client_data_dir}/{folder}/{table_name.split('.')[1]}.csv"
        if os.path.exists(product_file_path):
            product_data = pd.read_csv(product_file_path)
            validate_keys(product_data, folder)

    # Log all key collisions
    for key, folders in key_collisions.items():
        logging.error("Collision detected for key '%s' in folders: %s for table '%s'.", 
                      key, ', '.join(folders), table_name)

    return not key_collisions  # Return False if collisions were found

def post_sync_file_process(tables_map):
    for table in tables_map:
        try:
            global_table = table
            temporary_table = tables_map[table]["global_temporary_file"]
            with open(temporary_table, "r") as source_file, open(
                global_table, "w"
            ) as destination_file:
                file_content = source_file.read()
                destination_file.write(file_content)
            os.remove(temporary_table)

            for new_product_file_path in tables_map[table]["renamed_product_files"]:
                os.rename(
                    new_product_file_path,
                    tables_map[table]["renamed_product_files"][new_product_file_path],
                )

        except Exception:
            continue


#def start_postgresql_server():
#    print("------- Starting Postgresql Server --------- ")
#    subprocess.run(["service", "postgresql", "start"])


#def alter_postgresql_password():
#    # Alter the password for the postgres user
#    print("------- Altering PostgreSQL Password --------- ")
#    new_password = "@#%&97"
#
#    command = [
#        "psql",
#        "-U",
#        "postgres",
#        "-c",
#        f"ALTER USER postgres PASSWORD '{new_password}';",
#    ]
#
#    subprocess.run(command)


#def set_postgresql_default_auth():
#    # Update pg_hba.conf to set default authentication to trust
#    print("------- Updating pg_hba.conf for default authentication --------- ")
#    command = ["find", "/etc", "-name", "pg_hba.conf"]
#    result = subprocess.run(command, capture_output=True, text=True)
#    pg_hba_path_temp = result.stdout.strip()
#    print("********** hba PATH *******", pg_hba_path_temp)
#    pg_hba_path = "/etc/postgresql/15/main/pg_hba.conf"
#    with open(pg_hba_path, "r") as file:
#        lines = file.readlines()
#    updated_lines = []
#    for line in lines:
#        if line.startswith("local") or line.startswith("host"):
#            updated_line = line.replace("peer", "trust")
#            updated_lines.append(updated_line)
#        else:
#            updated_lines.append(line)
#    with open(pg_hba_path, "w") as file:
#        file.writelines(updated_lines)


def git_diff_csv_files():
    bitbucket_pr_dest_branch = os.getenv("BITBUCKET_PR_DESTINATION_BRANCH")
    bitbucket_branch = os.getenv("BITBUCKET_BRANCH")
    # Run the Git command to fetch the modified files in the latest PR to the destination branch
    git_command = f"git diff --no-commit-id --name-only origin/{bitbucket_pr_dest_branch} {bitbucket_branch}"
    output = subprocess.check_output(git_command.split())
    modified_files = output.decode().splitlines()
    # Process the list of modified files (e.g., filter Python files)
    csv_files = [file for file in modified_files if file.endswith(".csv")]
    changed_file_paths = []
    # Get the full file paths of modified csv files
    for file in csv_files:
        full_file_path = (
            subprocess.check_output(["git", "rev-parse", "--show-toplevel"])
            .strip()
            .decode()
            + "/"
            + file
        )
        changed_file_paths.append(full_file_path)
    print("changed files - ", changed_file_paths)
    return changed_file_paths


def create_tables(sql_file_paths, connection):
    for path in sql_file_paths:
        sql_path = path.get("sql_file_path", "")
        schema = path.get("schema", "")
        with open(sql_path, "r") as source_file:
            cur = connection.cursor()
            lines = source_file.readlines()
            # Execute the SQL create table command
            sql_lines = []
            for line in lines:
                if (
                    all(
                        keyword.lower() not in line.lower()
                        for keyword in [
                            "USING gist",
                            "ALTER TABLE",
                            "ADD COLUMN",
                            "ADD CONSTRAINT",
                            "DROP CONSTRAINT",
                        ]
                    )
                ) or ("alter table" in line.lower() and "add column" in line.lower()):
                    if schema:
                        # Replace the schema in the CREATE TABLE statement
                        line = line.replace(
                            "CREATE TABLE global.", f"CREATE TABLE {schema}."
                        )
                    sql_lines.append(line)
            sql_statement = " ".join(sql_lines)
            try:
                cur.execute(sql_statement)
            except Exception as e:
                print(str(e))
            finally:
                cur.close()


def setup_schemas(allowed_schemas, connection):
    cur = connection.cursor()
    for schema in allowed_schemas:
        cur.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
    cur.close()


def insert_user_data(table, data, connection):
    cur = connection.cursor()
    try:
        for row in data:
            columns = ", ".join(f'"{col}"' for col in row.keys())
            values = ", ".join(
                [
                    f"'{value}'" if value is not None else "NULL"
                    for value in row.values()
                ]
            )
            query = f"INSERT INTO {table} ({columns}) VALUES ({values})"
            cur.execute(query)
        print(f"Data inserted into table '{table}' successfully.")
    except Exception as e:
        print(f"Error occurred while inserting data into table '{table}': {str(e)}")
    cur.close()


def setup_parent_schema_and_tables(parent_schemas, parent_tables, connection):
    setup_schemas(parent_schemas, connection)
    prefix_path = os.getcwd()
    parent_table_paths = []
    for schema in parent_schemas:
        for table in parent_tables:
            path = f"{prefix_path}/schemas/{schema}/tables/{table}.sql"
            parent_table_paths.append({"sql_file_path": path})
    create_tables(parent_table_paths, connection)
    insert_user_data(
        "global.user_master",
        [
            {
                "user_code": 3,
                "name": "Test",
                "email": "bnm@gmail.com",
                "user_name": "Test",
                "password": "",
                "salt": "",
                "status": True,
                "is_deleted": False,
                "created_at": "2021-09-07T05:14:07.531Z",
                "updated_at": "2022-11-02T18:19:41.041Z",
                "created_by": None,
                "updated_by": None,
            }
        ],
        connection,
    )