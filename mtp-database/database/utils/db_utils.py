from typing import Any, List
from sqlalchemy.pool import NullPool
from sqlalchemy import create_engine

# db execution timeout,
# will abort the execution if query does not complete
CURSOR_TIMEOUT = 200

def result_as_dicts(cursor, result_tuple) -> List:
    """convert tuple result to dict with cursor"""
    col_names = [i[0] for i in cursor.description]
    res_dicts = [dict(zip(col_names, row)) for row in result_tuple]
    return res_dicts

def get_db_connection(db_uri: str):
    """
        Connects to the database using the db_uri
        returns the db connection
    """
    eng = create_engine(db_uri, poolclass=NullPool)
    conn = eng.raw_connection()
    return conn

def execute_query(pg_sync_target: Any, query: str, return_type = None) -> Any:
    """
       Executes query.
       This handles any format issue, SQL injection
       pg_sync_target: db_connection_target
       param: data dict with value to be replaced in query
    return_type -> response format type , "dict" for dict , "dataframe" for dataframe
                    default - tuple
    """
    response = []
    result = []
    conn = get_db_connection(pg_sync_target.sqlalchemy_database_uri)
    try:
        cur = conn.cursor()
        with cur:
            cur.execute(query)
            response = cur.fetchall()
            if return_type is not None:
                result = result_as_dicts(cur, response)
            else:
                result = response
    finally:
        conn.close()
    return result
