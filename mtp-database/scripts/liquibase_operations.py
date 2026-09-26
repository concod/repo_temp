import subprocess
import psycopg2
from templates import templates


class liquibaseOperations:

    def fetch_connection_details(self, path: str) -> None:
        input_file = open(path, "rt")
        connection_details = dict()
        for line in input_file:
            if "liquibase.command.url" in line:
                host, port = line.split("/")[2].split(":")
                connection_details["host"] = host.strip()
                connection_details["port"] = port.strip()
                connection_details["database"] = line.split("/")[-1].strip()
                connection_details["liquibase_command_url"] = line.split("=")[-1].strip()

            if "liquibase.command.username" in line:
                connection_details["user"] = line.split(":")[1].strip()

            if "liquibase.command.password" in line:
                connection_details["password"] = line.split(":")[1].strip()

        return connection_details
    
    def set_connection_details(self):
        params = ["liquibase_command_url", "user", "password"]
        connection_details = dict()

        for param in params:
            user_input = input(f"Enter the value for {param}:\n").strip()
            connection_details[param] = user_input

        connection_details["host"],connection_details["port"]  = connection_details["liquibase_command_url"].split("/")[2].split(":")
        connection_details["database"] = connection_details["liquibase_command_url"].split("/")[-1].strip()

        return connection_details
    
    def make_connection_to_database(self, connection_details):
        try:
            conn = psycopg2.connect(
                    host=connection_details["host"],
                    port=connection_details["port"],
                    user=connection_details["user"],
                    password=connection_details["password"],
                    database=connection_details["database"]
                )
            print("Connected to database!")

            return conn

        except Exception as e:
            print(f"Unable to connect to database with exception {e}")

    def generate_liquibase_changeset(self, p_schema_name: str, p_table_name: str, 
                                     p_changeset_author: str, p_changeset_context: str, 
                                     p_changeset_labels: str, p_file_path: str, output_file_path: str,
                                     connection):
        
        liquibase_changeset_details = [p_schema_name, p_table_name, p_changeset_author, p_changeset_context, p_changeset_labels, p_file_path]

        cursor = connection.cursor()
        sql = f'{p_schema_name}.create_csv_changeset_from_sql_table'
        cursor.callproc(sql, liquibase_changeset_details)
        result = cursor.fetchall()
        output_file = open(output_file_path, "wt")

        for line in result:
            s = ''
            for segments in line:
                s += segments
            output_file.write(s)

        output_file.close()
        cursor.execute("COMMIT")
        cursor.execute("END")

    def validate_xml_file(self, xml_path: str, connection_details: dict[str : str]) -> bool:
        absolute_xml_path = '/'.join(xml_path.split('/')[xml_path.split('/').index('database'):])
        
        liquibase_command = f"liquibase --changeLogFile={absolute_xml_path} \
          --url={connection_details['liquibase_command_url']} \
          --username={connection_details['user']} \
          '--password={connection_details['password']}' \
          validate"
        
        validation_output = (subprocess.getoutput(liquibase_command))
        print(validation_output)
        
        if "Liquibase command 'validate' was executed successfully." in validation_output:
            return True
        
        return False
    
    def update_changelog_file(self, xml_path: str, connection_details: dict[str : str]):
        absolute_xml_path = xml_path.split('/')[-1]

        print(f"absolute_xml_path is {absolute_xml_path}")

        liquibase_command = f"liquibase --changeLogFile={absolute_xml_path} \
          --url={connection_details['liquibase_command_url']} \
          --username={connection_details['user']} \
          '--password={connection_details['password']}' \
          update"
        
        update_output = (subprocess.getoutput(liquibase_command))
        print(update_output)

        if "Liquibase command 'update' was executed successfully." in update_output:
            return True
        
        return False
    
    def create_changelog_xml_file(self, change_set_file: str, output_file_path: str) -> None:
        change_set_file ='/'.join(change_set_file.split("/")[change_set_file.split("/").index("database"):])
        template = templates()
        change_log_template = template.changelog_file_template(xml_file_path= change_set_file)

        file = open(output_file_path, "wt")
        file.write(change_log_template)
        file.close()
