--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pricesmart.fn_build_hierarchy_where_cluse_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pricesmart.fn_build_hierarchy_where_cluse_2

DROP FUNCTION if exists pricesmart.fn_build_hierarchy_where_cluse;


CREATE OR REPLACE FUNCTION pricesmart.fn_build_hierarchy_where_cluse(input_json jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    key text;
    id_col text;
    values text;
    clause_parts text[] := '{}';
BEGIN
    -- Iterate over each key in the JSONB input
    FOR key IN SELECT jsonb_object_keys(input_json)
    LOOP
        -- Get the corresponding id_column from the mapping table
        SELECT id_column
        INTO id_col
        FROM pricesmart.pricesmart_hierarchy_mapping
        WHERE request_key = key
        LIMIT 1;

        IF id_col IS NOT NULL THEN
            -- Build a string of comma-separated values from the JSON array
            SELECT string_agg(value::text, ',')
            INTO values
            FROM jsonb_array_elements_text(input_json -> key);

            -- Only add condition if values is not null or empty
            IF values IS NOT NULL AND values <> '' THEN
                clause_parts := array_append(clause_parts, format('%I in (%s)', id_col, values));
            END IF;
        END IF;
    END LOOP;

    -- Combine all conditions with 'AND'
    RETURN array_to_string(clause_parts, ' and ');
END;
$function$
;
