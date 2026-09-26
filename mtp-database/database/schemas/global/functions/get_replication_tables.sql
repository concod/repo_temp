--liquibase formatted sql
--changeset shaik.azmathulla:get_replication_tables runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:LR
--comment: initial changeset for get_replication_tables
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_replication_tables();
DROP FUNCTION IF EXISTS global.get_replication_tables(in _name text);
CREATE OR REPLACE FUNCTION global.get_replication_tables(in _name text)
 RETURNS TABLE(pub_name text, tbl_names text[])
 LANGUAGE plpgsql
AS $function$
DECLARE 
    _pub text := _name || '_pub';
    _tbl_name text[];
BEGIN
    -- Get replication tables with dependency order
    SELECT array_agg(tablename ORDER BY dep_order ASC NULLS LAST)
    INTO _tbl_name
    FROM (
        SELECT DISTINCT pbt.tablename, dep_order
        FROM pg_publication_tables pbt
        LEFT JOIN (
            SELECT
                nsp_parent.nspname AS parent_schema,
                parent.relname AS parent_table,
                nsp_child.nspname AS schemaname,
                child.relname AS tablename
            FROM pg_inherits
            JOIN pg_class child ON pg_inherits.inhrelid = child.oid
            JOIN pg_namespace nsp_child ON child.relnamespace = nsp_child.oid
            JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
            JOIN pg_namespace nsp_parent ON parent.relnamespace = nsp_parent.oid
            WHERE nsp_parent.nspname = 'global'
        ) pcm USING (schemaname, tablename)
        LEFT JOIN (
            WITH numbered_files AS (
                SELECT
                    replace(split_part(filename, '/', -1), '.sql', '') AS file_name,
                    MIN(dateexecuted) AS first_executed
                FROM liquibase.databasechangelog
                WHERE filename ILIKE '%global/tables%'
                GROUP BY 1
            )
            SELECT
                ROW_NUMBER() OVER (ORDER BY first_executed ASC) AS dep_order,
                file_name AS tablename
            FROM numbered_files
        ) lqb ON pcm.parent_table IS NULL AND pbt.tablename = lqb.tablename
            OR pcm.parent_table = lqb.tablename
        WHERE pbt.pubname = _pub
    ) a;

    RAISE NOTICE '_tbl_name: %', _tbl_name;
	
    -- Return both pub name and table names
    RETURN QUERY SELECT 'product_pub', _tbl_name;
END;
$function$
;
