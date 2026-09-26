--liquibase formatted sql
--changeset liquibase:update_hierarchy_keys runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_hierarchy_keys
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_hierarchy_keys(table_name text, column_name text, hierarchy_mapping jsonb, primary_key_column text);
CREATE OR REPLACE FUNCTION global.update_hierarchy_keys(table_name text, column_name text, hierarchy_mapping jsonb, primary_key_column text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    row RECORD;
    updated_data JSONB;
    key TEXT;
    fields TEXT[];
BEGIN
    -- Iterate through each row in the specified table
    FOR row IN EXECUTE format('SELECT %I, %I FROM global.user_access_hierarchy_mapping', primary_key_column, column_name, table_name) LOOP
        -- Initialize updated_data as the current value of the column
        updated_data := row.access_hierarchy;

        -- Iterate through the hierarchy_mapping keys
        FOR key IN SELECT * FROM jsonb_object_keys(hierarchy_mapping) LOOP
            -- Get the fields to be concatenated for the current key
            fields := ARRAY(SELECT jsonb_array_elements_text(hierarchy_mapping -> key));


			if updated_data = '[]' then

			exit;

			end if;

            -- Update the JSON array
            updated_data := (
                SELECT jsonb_agg(
                    jsonb_set(
                        json_object,
                        ARRAY[key],
                        to_jsonb(
                            array_to_string(ARRAY(
                                SELECT json_object ->> f
                                FROM unnest(fields) AS f
                            ), '')
                        )
                    )
                )
                FROM jsonb_array_elements(updated_data) AS json_object
            );
        END LOOP;


        -- Update the row with the modified JSON
        EXECUTE format('UPDATE global.user_access_hierarchy_mapping SET access_hierarchy = $1 WHERE hierarchy_id = $2')
        USING updated_data, row.hierarchy_id;
    END LOOP;
END;
$function$
;