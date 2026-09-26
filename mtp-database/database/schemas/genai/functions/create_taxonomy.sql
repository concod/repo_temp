--liquibase formatted sql
--changeset abhishek.jha:create_taxonomy runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:MTP-65744
--comment: MTP-65744 creating table for data feeding process
--rollback: SELECT 1
DROP FUNCTION IF EXISTS genai.create_taxonomy();
CREATE OR REPLACE FUNCTION genai.create_taxonomy()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_attribute_name TEXT;
    v_attribute_value JSONB;
    v_query TEXT;
    v_column TEXT;
    column_names TEXT[];
	column_value TEXT;
    rec RECORD;
BEGIN
    -- Drop and recreate the output table
    DROP TABLE IF EXISTS genai.chatbot_taxonomy;
    CREATE TABLE genai.chatbot_taxonomy (
        attribute_name TEXT,
        attribute_value TEXT,
        attribute_type TEXT
    );

    -- Loop through each row of the materialized view
    FOR v_attribute_name, v_attribute_value IN
        SELECT attribute_name, attribute_value
        FROM genai.hierarchy_mapping
    LOOP
		raise notice 'v_attribute_name: %', v_attribute_name;
		raise notice 'v_attribute_value: %', v_attribute_value;

        -- Extract column names (keys) from the JSONB value
        SELECT ARRAY(SELECT jsonb_object_keys(v_attribute_value)) INTO column_names;
		raise notice 'column_names: %', column_names;

        -- For each column, fetch data from respective tables
        FOREACH v_column IN ARRAY column_names
        LOOP
            -- Handle location_mapping (saf)
			column_value = v_attribute_value->>v_column;
            IF v_attribute_name = 'location_mapping' THEN
                v_query := format(
                    'SELECT DISTINCT %L AS attribute_name, %I AS attribute_value, %L AS attribute_type 
                     FROM global.store_attributes_filter',
                     column_value, column_value, 'saf'
                );
            -- Handle product_mapping (paf)
            ELSIF v_attribute_name = 'product_mapping' THEN
                v_query := format(
                    'SELECT DISTINCT %L AS attribute_name, %I AS attribute_value, %L AS attribute_type 
                     FROM global.product_attributes_filter',
                     column_value, column_value, 'paf'
                );
            END IF;
			raise notice 'v_query: %', v_query;

            -- Execute dynamic query and insert results into the final table
            FOR rec IN EXECUTE v_query LOOP
                INSERT INTO genai.chatbot_taxonomy (attribute_name, attribute_value, attribute_type)
                VALUES (rec.attribute_name, rec.attribute_value, rec.attribute_type);
            END LOOP;
        END LOOP;
    END LOOP;

    RETURN 1; -- Indicate successful execution
END;
$function$
;
