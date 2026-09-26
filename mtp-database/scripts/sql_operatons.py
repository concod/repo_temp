class sqlOperations:

    def execute_sql_file(self, connection, path: str):
        cursor = connection.cursor()
        # Open and read SQL file
        print(path)
        with open(path, 'r') as file:
            sql = file.read()
        # Execute SQL commands
        try:
            cursor.execute(sql)
            connection.commit()
            cursor.close()
        
        except Exception as e:
            print("Unable to execute the SQL file")
            print(f"Exception occured while executing the sql file {path} with exception {e}, with {repr(e)}")

    def check_pk_uk(self, connection, table_name: str):
        cursor = connection.cursor()
        # Execute SQL command to check if primary key or unique key exists
        con_chk_sql = f"SELECT conname FROM pg_constraint WHERE conrelid = '{table_name}'::regclass AND (contype = 'p' OR contype = 'u')"
        print(con_chk_sql)
        cursor.execute(con_chk_sql)
        result = cursor.fetchone()
        cursor.close()
        # Return True if primary key or unique key exists, else False
        return result is not None