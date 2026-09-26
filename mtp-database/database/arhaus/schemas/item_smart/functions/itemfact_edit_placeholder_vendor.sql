--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:itemfacts_vendor_edit runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:itemfacts_vendor_edit
--comment: initial changeset for itemfacts_vendor
--rollback: SELECT 1
DROP FUNCTION IF EXISTS item_smart.itemfact_edit_placeholder_vendor(date, date, jsonb, text, text);

CREATE OR REPLACE FUNCTION item_smart.itemfact_edit_placeholder_vendor(sdate date, edate date, filters jsonb, updated_vendor text, dept text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    hierarchy_code_var INTEGER;
    updated_row_count INTEGER := 0;
    
    where_clause TEXT := '';
    filter JSONB;
    attribute_name TEXT;
    values TEXT;
    operator TEXT;
    
	itemfact_sku_table_name text;
 	itemfact_sku_week_table_name text;
BEGIN

	itemfact_sku_table_name := 'item_smart.itemfact_sku_' || dept;
 	itemfact_sku_week_table_name := 'item_smart.itemfact_sku_week_' || dept;
	
    -- Build the WHERE clause dynamically from the filters
    FOR filter IN
        SELECT * FROM jsonb_array_elements(filters)
    LOOP
        attribute_name := filter->>'attribute_name';
        values := (SELECT string_agg(quote_literal(value), ', ')
                   FROM jsonb_array_elements_text(filter->'value') value);
        operator := filter->>'operator';

        -- Append to the where_clause
        IF where_clause = '' THEN
            where_clause := attribute_name || ' ' || operator || ' (' || values || ')';
        ELSE
            where_clause := where_clause || ' AND ' || attribute_name || ' ' || operator || ' (' || values || ')';
        END IF;
    END LOOP;

    RAISE NOTICE 'Generated WHERE clause: %', where_clause;

    -- Retrieve the hierarchy code based on the dynamic WHERE clause for placeholder
    EXECUTE format('SELECT hierarchy_code FROM item_smart.placeholders_info WHERE %s LIMIT 1', where_clause)
    INTO hierarchy_code_var;

    -- Check if the hierarchy code was found
    IF hierarchy_code_var IS NOT NULL THEN
        -- Update the exit_date in the sku table for the matching hierarchy_code
        EXECUTE format('UPDATE %s SET vendor_name = %L WHERE hierarchy_code = %L',itemfact_sku_table_name, updated_vendor, hierarchy_code_var);
        GET DIAGNOSTICS updated_row_count = ROW_COUNT;

        RAISE NOTICE 'Updated % rows with new vendor.', updated_row_count;


    ELSE
        RAISE NOTICE 'No hierarchy_code found for given filters.';
    END IF;

    -- Return the number of rows updated in itemfact_sku table
    RETURN updated_row_count;
END;
$function$
;
