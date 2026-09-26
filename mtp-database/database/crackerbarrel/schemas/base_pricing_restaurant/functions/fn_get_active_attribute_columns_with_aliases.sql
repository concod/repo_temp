--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_get_active_attribute_columns_with_aliases stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_get_active_attribute_columns_with_aliases

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_get_active_attribute_columns_with_aliases;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_get_active_attribute_columns_with_aliases(p_schema text, p_metadata_table_name text, p_alias text)
 RETURNS TABLE(select_clause text, group_by_clause text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    attr RECORD;
    select_clause TEXT := '';
    group_by_clause TEXT := format('%I.attributes', p_alias);  -- Initialize group_by_clause with the alias
BEGIN
    -- Validate parameters
    IF p_schema IS NULL OR p_metadata_table_name IS NULL THEN
        RAISE EXCEPTION 'Schema or table name cannot be null';
    END IF;

    -- Step 1: Fetch active attributes from the specified metadata table
    FOR attr IN
        EXECUTE format('SELECT attribute_name
                        FROM %I.%I
                        WHERE is_active = TRUE',
                        p_schema,
                        p_metadata_table_name)
    LOOP
        -- Append formatted attributes to the select_clause string with the alias
        select_clause := select_clause || format('%I.attributes ->> %L AS %I, ', p_alias, attr.attribute_name, attr.attribute_name);
    END LOOP;

    -- Remove the trailing comma and space from the select_clause string
    IF length(select_clause) > 0 THEN
        select_clause := left(select_clause, length(select_clause) - 2);  -- Remove last comma and space
    END IF;

    -- Debugging output to check the final results
    RAISE NOTICE 'Final SELECT clause: %', select_clause;
    RAISE NOTICE 'Final GROUP BY clause: %', group_by_clause;

    -- Step 2: Return the concatenated strings of attribute definitions
    RETURN QUERY SELECT select_clause, group_by_clause;

EXCEPTION
    WHEN others THEN
        RAISE EXCEPTION 'An error occurred while fetching attributes: %', SQLERRM;
END;
$function$
;