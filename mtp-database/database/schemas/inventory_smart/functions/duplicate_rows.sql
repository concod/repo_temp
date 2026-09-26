--liquibase formatted sql
--changeset liquibase:duplicate_rows runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for duplicate_rows
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.duplicate_rows(character varying, character varying, jsonb, character varying, text[]);
DROP FUNCTION IF EXISTS inventory_smart.duplicate_rows(character varying, character varying, jsonb, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.duplicate_rows(character varying, character varying, jsonb, character varying)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*
 * $1 = table name
 * $2 = where condition to be applied on the table $1
 * $3 = json of new column values that has to be replaced during the duplication
 * $4 = schema
 */
DECLARE
   	columns text[];
    column_value text;
    query text;
    select_statement text;
    insert_columns text;
    to_duplicate_columns text[];
    replace_column text;
   	replace_value text;
BEGIN 
	columns = inventory_smart.get_columns($1, $4);
	FOREACH column_value IN ARRAY columns LOOP
		IF $3::jsonb->>column_value is null
		THEN
			to_duplicate_columns = ARRAY_APPEND(to_duplicate_columns, '"' || column_value || '"');
		END IF;
	END LOOP;
	select_statement := ARRAY_TO_STRING(to_duplicate_columns, ',');
	FOR replace_column, replace_value IN SELECT * FROM JSONB_EACH_TEXT($3) LOOP
		select_statement := format($$%s, '%s' as %s$$, select_statement, replace_value, replace_column);
		to_duplicate_columns = ARRAY_APPEND(to_duplicate_columns, replace_column);
	END LOOP;
	insert_columns := ARRAY_TO_STRING(to_duplicate_columns, ',');
	
	query = format($$
	    WITH insert_data AS (
	    	SELECT %1$s
	    	FROM %5$s.%2$s
	    	WHERE %3$s
	    )
	    INSERT INTO %5$s.%2$s (%4$s)
	    SELECT * FROM insert_data
	$$, select_statement, $1, $2, insert_columns, $4);
	raise notice '%s', query;
	EXECUTE query;
END
$function$
;
