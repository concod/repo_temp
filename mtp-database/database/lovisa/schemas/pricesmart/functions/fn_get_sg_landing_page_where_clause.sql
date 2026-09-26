--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:pricesmart.fn_get_sg_landing_page_where_clause_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pricesmart.fn_get_sg_landing_page_where_clause_1

DROP FUNCTION if exists pricesmart.fn_get_sg_landing_page_where_clause;

CREATE OR REPLACE FUNCTION pricesmart.fn_get_sg_landing_page_where_clause(_filters jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    key text;
    arr text;
    conditions text := '';
BEGIN
    -- Loop over each key in the JSONB
    FOR key IN
        SELECT jsonb_object_keys(_filters)
    LOOP
        -- Check if the key exists in pricesmart_hierarchy_mapping
        IF EXISTS (
            SELECT 1
            FROM pricesmart.pricesmart_hierarchy_mapping phm
            WHERE phm.request_key = key
        ) THEN
            -- Convert the JSON array to SQL array literal
            SELECT string_agg(elem, ', ')
            INTO arr
            FROM (
                SELECT jsonb_array_elements_text(_filters->key) AS elem
            ) sub;

            -- Only add condition if array is not empty
            IF arr IS NOT NULL AND arr <> '' THEN
                IF conditions <> '' THEN
                    conditions := conditions || ' and ';
                END IF;

                conditions := conditions ||
                    format('(%I is null or array[%s]::int[] && %I)', key, arr, key);
            END IF;
        END IF;
    END LOOP;

    RETURN conditions;
END;
$function$
;
