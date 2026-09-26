--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:itemfact_edit_regular_markdown_date runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:itemfacts-edits-markdown-date_v3
--comment: initial changeset for itemfact_edit_regular_markdown_date_v3
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.itemfact_edit_regular_markdown_date(date, date, jsonb, date, text);

CREATE OR REPLACE FUNCTION item_smart.itemfact_edit_regular_markdown_date(
    sdate date, 
    edate date, 
    filters jsonb, 
    updated_markdown_date date, 
    dept text
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    -- Core variables
    hierarchy_code_var INTEGER;
    updated_row_count INTEGER := 0;
    sku_week_updated_count INTEGER := 0;
    hierarchy_code_list TEXT[];
    
    -- Filter building variables
    where_clause TEXT := '';
    filter JSONB;
    attribute_name TEXT;
    values TEXT;
    operator TEXT;
    
    -- Week ID variables
    exit_week_id INTEGER;
    launch_week_id INTEGER;
    markdown_week_id INTEGER;
    active_weeks_var INTEGER;
    
    -- Table name variables
    itemfact_sku_table_name text;
    itemfact_sku_week_table_name text;
    
    -- Date variables
    launch_date_var date;
    exit_date_var date;
    entry_date_var date;
    future_date_var date;
    markdown_date_var date;
    exit_date_var_reg_weeks date;
    
    -- Query variables
    markdown_edit_text text;
    reco_receipt_edit_text text;
    
    -- Row count variables
    rows_updated_for_markdown_edit INT := 0;
    rows_updated_for_reco_reciept_edit INT := 0;

BEGIN
    -- Initialize constants and table names
    future_date_var := current_date + INTERVAL '30 months';
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
        
        -- Update the markdown_date in the sku table for the matching hierarchy_code
        EXECUTE format(
            'UPDATE %s SET markdown_date = %L WHERE hierarchy_code = %L',
            itemfact_sku_table_name, 
            updated_markdown_date, 
            hierarchy_code_var
        );
        GET DIAGNOSTICS updated_row_count = ROW_COUNT;

        RAISE NOTICE 'Updated % rows with new markdown_date.', updated_row_count;

        -- Convert the exit_date, launch_date, and markdown_date to week_id using fiscal_date_mapping
        -- Convert exit_date to week_id
        EXECUTE format(
            'SELECT fdm.fiscal_year_week 
             FROM global.fiscal_date_mapping fdm 
             WHERE fdm.calendar_date = (
                 SELECT exit_date 
                 FROM %s 
                 WHERE hierarchy_code = %L 
                 LIMIT 1
             ) 
             LIMIT 1',
            itemfact_sku_table_name,
            hierarchy_code_var
        ) INTO exit_week_id;

        -- Convert launch_date to week_id
        EXECUTE format(
            'SELECT fdm.fiscal_year_week 
             FROM global.fiscal_date_mapping fdm 
             WHERE fdm.calendar_date = (
                 SELECT launch_date 
                 FROM %s 
                 WHERE hierarchy_code = %L 
                 LIMIT 1
             ) 
             LIMIT 1',
            itemfact_sku_table_name,
            hierarchy_code_var
        ) INTO launch_week_id;

        -- Convert markdown_date to week_id
        EXECUTE format(
            'SELECT fdm.fiscal_year_week 
             FROM global.fiscal_date_mapping fdm 
             WHERE fdm.calendar_date = (
                 SELECT markdown_date 
                 FROM %s 
                 WHERE hierarchy_code = %L 
                 LIMIT 1
             ) 
             LIMIT 1',
            itemfact_sku_table_name,
            hierarchy_code_var
        ) INTO markdown_week_id;

        -- Update purchase_status in itemfact_sku_week based on week_id comparisons
        EXECUTE format('
            UPDATE %s AS sku_week
            SET purchase_status = CASE
                WHEN sku_week.current_week > COALESCE(%L, 999999) THEN ''Discontinued''
                WHEN sku_week.current_week BETWEEN %L AND COALESCE(%L, 999999) THEN ''Markdown''
                WHEN sku_week.current_week BETWEEN %L AND COALESCE(%L, 999999) THEN ''Active''
                ELSE sku_week.purchase_status
            END
            FROM %s AS sku
            WHERE sku_week.hierarchy_code = sku.hierarchy_code
              AND sku.hierarchy_code = %L',
            itemfact_sku_week_table_name, 
            exit_week_id, 
            markdown_week_id, 
            exit_week_id, 
            launch_week_id, 
            markdown_week_id,
            itemfact_sku_table_name,  
            hierarchy_code_var
        );

        GET DIAGNOSTICS sku_week_updated_count = ROW_COUNT;

        RAISE NOTICE 'Updated % rows in itemfact_sku_week with new purchase_status.', sku_week_updated_count;

        -- Logic for regular weeks calculation
        EXECUTE format(
            'SELECT launch_date, markdown_date, exit_date 
             FROM %s 
             WHERE hierarchy_code = %L 
             LIMIT 1', 
            itemfact_sku_table_name,
            hierarchy_code_var
        ) INTO launch_date_var, markdown_date_var, exit_date_var;

        RAISE NOTICE 'VALUES launch % and % mark and exit %', launch_date_var, markdown_date_var, exit_date_var;

        -- Use COALESCE to assign the first non-NULL value
        exit_date_var_reg_weeks := COALESCE(markdown_date_var, exit_date_var, future_date_var);

        -- Calculate number of active weeks
        EXECUTE format(
            'SELECT count(distinct fiscal_year_week) 
             FROM global.fiscal_date_mapping fdm 
             WHERE fdm.calendar_date BETWEEN %L AND %L', 
            launch_date_var,
            exit_date_var_reg_weeks
        ) INTO active_weeks_var;

        -- Update number of regular weeks
        EXECUTE format(
            'UPDATE %s
             SET no_of_reg_weeks = %L
             WHERE hierarchy_code = %L',
            itemfact_sku_table_name,
            active_weeks_var,
            hierarchy_code_var
        );

        -- Set entry_date_var for markdown edit (assuming it should be launch_date_var)
        entry_date_var := launch_date_var;

        -- Execute markdown conversion edit
        markdown_edit_text := format(
            'SELECT item_smart.markdown_conversion_edit_v3(%L, %L, %L, %L, %L, %L, %L)',
            updated_markdown_date,
            edate,
            filters,
            dept,
            'written_sales_units',
            'sku',
            hierarchy_code_list
        );
        RAISE NOTICE 'Called markdown edit';
        EXECUTE markdown_edit_text INTO rows_updated_for_markdown_edit;

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

    -- Return the total number of rows updated
    RETURN sku_week_updated_count + rows_updated_for_markdown_edit + rows_updated_for_reco_reciept_edit;
END;
$function$;
