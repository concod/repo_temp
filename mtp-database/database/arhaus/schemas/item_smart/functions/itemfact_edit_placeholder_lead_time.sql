--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:itemfact_edit_placeholder_lead_time runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:itemfact_edit_placeholder_lead_time
--comment: initial changeset for itemfact_edit_placeholder_lead_time
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.itemfact_edit_placeholder_lead_time(date, date, jsonb, int4, text);

CREATE OR REPLACE FUNCTION item_smart.itemfact_edit_placeholder_lead_time(
    sdate date, 
    edate date, 
    filters jsonb, 
    updated_lead_time integer, 
    dept text
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    -- Core variables
    hierarchy_code_var INTEGER;
    updated_row_count INTEGER := 0;
    hierarchy_code_list TEXT[];
    
    -- Filter building variables
    where_clause TEXT := '';
    filter JSONB;
    attribute_name TEXT;
    values TEXT;
    operator TEXT;
    
    -- Table name variables
    itemfact_sku_table_name text;
    itemfact_sku_week_table_name text;
    
    -- Query variables
    reco_receipt_edit_text text;
    
    -- Row count variables
    rows_updated_for_reco_reciept_edit INT := 0;

BEGIN
    -- Initialize table names
    itemfact_sku_table_name := 'item_smart.itemfact_sku_' || dept;
    itemfact_sku_week_table_name := 'item_smart.itemfact_sku_week_' || dept;
    
    -- Build the WHERE clause dynamically from the filters
    FOR filter IN
        SELECT * FROM jsonb_array_elements(filters)
    LOOP
        attribute_name := filter->>'attribute_name';
        values := (
            SELECT string_agg(quote_literal(value), ', ')
            FROM jsonb_array_elements_text(filter->'value') value
        );
        operator := filter->>'operator';

        -- Append to the where_clause
        IF where_clause = '' THEN
            where_clause := attribute_name || ' ' || operator || ' (' || values || ')';
        ELSE
            where_clause := where_clause || ' AND ' || attribute_name || ' ' || operator || ' (' || values || ')';
        END IF;
    END LOOP;

    RAISE NOTICE 'Generated WHERE clause: %', where_clause;

    -- Retrieve the hierarchy code based on the dynamic WHERE clause
    EXECUTE format(
        'SELECT hierarchy_code 
         FROM item_smart.mv_product_hierarchies_filter 
         WHERE %s 
         UNION ALL 
         SELECT hierarchy_code 
         FROM item_smart.placeholders_info 
         WHERE %s 
         LIMIT 1',
        where_clause, 
        where_clause
    ) INTO hierarchy_code_var;

    -- Check if the hierarchy code was found
    IF hierarchy_code_var IS NOT NULL THEN
        -- Initialize hierarchy_code_list after finding the hierarchy_code
        hierarchy_code_list := ARRAY[hierarchy_code_var::TEXT];
        
        -- Update the lead_time in the sku table for the matching hierarchy_code
        EXECUTE format(
            'UPDATE %s SET lead_time = %L WHERE hierarchy_code = %L',
            itemfact_sku_table_name, 
            updated_lead_time, 
            hierarchy_code_var
        );
        GET DIAGNOSTICS updated_row_count = ROW_COUNT;

        RAISE NOTICE 'Updated % rows with new lead_time.', updated_row_count;

        -- Execute reco receipt edit
        reco_receipt_edit_text := format(
            'SELECT item_smart.reco_receipt_edit_itemfacts(%L, %L, %L, %L)',
            filters,
            dept,
            'sku',
            hierarchy_code_list
        );
        RAISE NOTICE 'Called reco receipt edit';
        EXECUTE reco_receipt_edit_text INTO rows_updated_for_reco_reciept_edit;

    ELSE
        RAISE NOTICE 'No hierarchy_code found for given filters.';
    END IF;

    -- Return the number of rows updated in itemfact_sku table
    RETURN updated_row_count;
END;
$function$;
