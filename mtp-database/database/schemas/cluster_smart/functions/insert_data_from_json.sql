--liquibase formatted sql
--changeset liquibase:insert_json_to_db  runOnChange:true stripComments:false splitStatements:false context:MTP-52669 labels:liquibase_project_start
--comment: Add SP to insert JSON string to database
--rollback: SELECT 1

DROP FUNCTION IF EXISTS cluster_smart.insert_data_from_json(text, text, text);

CREATE OR REPLACE FUNCTION cluster_smart.insert_data_from_json(json_data text, p_table_name text, p_schema_name text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
    /*
		Function/Procedure name: cluster_smart.insert_data_from_json
		Created by: Rishabh Kumar
		Created at: 27-Aug-2024
		No of input parameter: 3
		Parameter Description :
				$1 = list of json data 
				$2 = table name
				$3 = schema_name

		Purpose: This function been created to create records into the table, with given key,value pair in the json list.
        where key will be the column name and based on the value data type, generate the insert statement and insert the 
        data in bulk.
		Calling Statement:
		select * from cluster_smart.insert_data_from_json('[{"a":1,"b":"2"},{"a":3, "b":false}]', table, schema);
		*/
DECLARE
    rec JSONB;
    key_value RECORD;
    col_names TEXT[];
    col_values TEXT[];
    batch_size INT := 1000;
    insert_query TEXT;
    col_name TEXT;
    col_value TEXT;
    col_type TEXT;
    values_str TEXT := '';
    record_count INT := 0;
BEGIN
    -- Iterate over each record in the JSON data
    FOR rec IN SELECT * FROM jsonb_array_elements(json_data::jsonb)
    LOOP
        -- Reset column names and values for each record
        col_names := ARRAY[]::TEXT[];
        col_values := ARRAY[]::TEXT[];

        -- Iterate over each key-value pair in the JSON object
        FOR key_value IN SELECT * FROM jsonb_each(rec)
        LOOP
            col_name := key_value.key;
            col_value := key_value.value::TEXT;

            -- Get the column type from the information schema
            SELECT data_type INTO col_type
            FROM information_schema.columns
            WHERE table_schema = p_schema_name
            AND table_name = p_table_name
            AND column_name = col_name;

            -- Format the value based on the column type
            col_values := col_values || CASE
                WHEN col_value IS NULL THEN col_value::jsonb #>> '{}'
                WHEN col_type = 'integer' THEN col_value::jsonb #>> '{}'
                WHEN col_type = 'numeric' THEN col_value::jsonb #>> '{}'
                WHEN col_type = 'double precision' THEN col_value::jsonb #>> '{}'
                WHEN col_type = 'boolean' THEN col_value::jsonb #>> '{}'
                WHEN col_type = 'text' THEN quote_literal(col_value::jsonb #>> '{}')
                ELSE quote_literal(col_value::jsonb #>> '{}')
            END;

            -- Add the column name to the list
            col_names := col_names || col_name;
        END LOOP;

        -- Construct the values string for batch insert
        values_str := values_str || '(' || array_to_string(col_values, ', ') || '),';

        record_count := record_count + 1;

        -- Insert in batches
        IF record_count >= batch_size THEN
            values_str := rtrim(values_str, ',');
            insert_query := format(
                'INSERT INTO %I.%I (%s) VALUES %s',
                p_schema_name,
                p_table_name,
                array_to_string(col_names, ', '),
                values_str
            );

            EXECUTE insert_query;

            -- Reset values string and record count
            values_str := '';
            record_count := 0;
        END IF;
    END LOOP;

    -- Insert remaining records
    IF record_count > 0 THEN
        values_str := rtrim(values_str, ',');
        insert_query := format(
            'INSERT INTO %I.%I (%s) VALUES %s',
            p_schema_name,
            p_table_name,
            array_to_string(col_names, ', '),
            values_str
        );

        EXECUTE insert_query;
    END IF;
END
$function$
;