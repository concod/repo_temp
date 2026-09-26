--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:itemfact_edit_placeholder_auc runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:itemfact_edit_placeholder_auc
--comment: initial changeset for itemfact_edit_placeholder_auc
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.itemfact_edit_placeholder_auc(date, date, jsonb, float8, text);

CREATE OR REPLACE FUNCTION item_smart.itemfact_edit_placeholder_auc(
    sdate date, 
    edate date, 
    filters jsonb, 
    updated_auc double precision, 
    dept text
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    -- Core variables
    hierarchy_code_var INTEGER;
    updated_row_count INTEGER := 0;
    hierarchy_code_list INT[];
    
    -- Filter building variables
    where_clause TEXT := '';
    filter JSONB;
    attribute_name TEXT;
    values TEXT;
    operator TEXT;
    
    -- Table name variables
    itemfact_sku_table_name text;
    itemfact_sku_week_table_name text;
    wp_master_table_name text;
    iaf_master_table_name text;
    
    -- Query variables
    update_query_wp text;
    update_query_iaf text;
    w2d_query_text text;
    eop_bop_query_text text;
    fwos_query_text text;
    markdown_edit_text text;
    reco_receipt_edit_text text;
    
    -- Channel variables
    channel_array text[];
    original_channels text[];
    channel text;
    
    -- Date variables
    entry_date_var date;
    exit_date_var date;
    
    -- Row count variables
    rows_updated_for_w2d int := 0;
    rows_updated_for_eop_bop_sync int := 0;
    rows_updated_for_fwos int := 0;
    rows_updated_for_markdown_edit INT := 0;
    rows_updated_for_reco_reciept_edit INT := 0;
    
    -- Other variables
    planing_level text := 'sku';

BEGIN
    -- Initialize table names
    itemfact_sku_table_name := 'item_smart.itemfact_sku_' || dept;
    itemfact_sku_week_table_name := 'item_smart.itemfact_sku_week_' || dept;
    wp_master_table_name := 'item_smart.wp_master_' || dept;
    iaf_master_table_name := 'item_smart.iaf_master_' || dept;
    
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

    -- Retrieve the hierarchy code based on the dynamic WHERE clause for placeholder
    EXECUTE format(
        'SELECT hierarchy_code, entry_date, exit_date FROM item_smart.placeholders_info WHERE %s LIMIT 1', 
        where_clause
    ) INTO hierarchy_code_var, entry_date_var, exit_date_var;

    -- If exit_date_var is null, then set it to edate
    IF exit_date_var IS NULL THEN
        exit_date_var := edate;
    END IF;

    -- Check if the hierarchy code was found
    IF hierarchy_code_var IS NOT NULL THEN
        -- Update the AUC in the sku table for the matching hierarchy_code
        EXECUTE format(
            'UPDATE %s SET auc = %L WHERE hierarchy_code = %L',
            itemfact_sku_table_name, 
            updated_auc, 
            hierarchy_code_var
        );
        GET DIAGNOSTICS updated_row_count = ROW_COUNT;

        RAISE NOTICE 'Updated % rows with new AUC.', updated_row_count;

        hierarchy_code_list := ARRAY[hierarchy_code_var];

        -- Get channels from iaf
        EXECUTE format(
            'SELECT ARRAY(
                SELECT DISTINCT channel 
                FROM %s
                WHERE hierarchy_code = %L
            )',
            iaf_master_table_name,
            hierarchy_code_var
        ) INTO channel_array;

        RAISE NOTICE 'Channels: %', channel_array;

        original_channels := channel_array; 

        -- Editable flow for AUC
        -- Update AUC in iaf and wp tables
        EXECUTE format(
            'UPDATE %s SET written_auc = %L WHERE hierarchy_code = %L',
            iaf_master_table_name, 
            updated_auc, 
            hierarchy_code_var
        );
        
        EXECUTE format(
            'UPDATE %s SET written_auc = %L WHERE hierarchy_code = %L',
            wp_master_table_name, 
            updated_auc, 
            hierarchy_code_var
        );

        -- Update related fields in iaf_master table
        update_query_iaf := format('
            UPDATE %s 
            SET 
                written_sales_cost = written_sales_units * written_auc,
                written_gm_dollar = (written_sales_units * written_aur) - (written_sales_units * written_auc),
                written_gm_perc = ((written_sales_units * written_aur) - (written_sales_units * written_auc)) / NULLIF((written_sales_units * written_aur), 0),
                written_imu = (1 - (written_auc / NULLIF(written_air, 0)))
            WHERE hierarchy_code = %L',
            iaf_master_table_name,
            hierarchy_code_var
        );
        EXECUTE update_query_iaf;

        -- Update related fields in wp_master table
        update_query_wp := format('
            UPDATE %s 
            SET 
                written_sales_cost = written_sales_units * written_auc,
                written_gm_dollar = (written_sales_units * written_aur) - (written_sales_units * written_auc),
                written_gm_perc = ((written_sales_units * written_aur) - (written_sales_units * written_auc)) / NULLIF((written_sales_units * written_aur), 0),
                written_imu = (1 - (written_auc / NULLIF(written_air, 0)))
            WHERE hierarchy_code = %L',
            wp_master_table_name,
            hierarchy_code_var
        );
        EXECUTE update_query_wp;

        -- Process w2d, eop, fwos, reco_receipts
        
        -- Iterate over the channels and call w2d_edit for each channel
        FOREACH channel IN ARRAY channel_array LOOP
            w2d_query_text := format(
                'SELECT item_smart.w2d_edit(%L, %L, %L, %L, %L, %L, %L)', 
                entry_date_var, 
                exit_date_var, 
                filters, 
                dept, 
                channel,
                'written_sales_units',
                'sku'
            );
            RAISE NOTICE 'Called w2d_edit for channel: %', channel;
            EXECUTE w2d_query_text INTO rows_updated_for_w2d;
        END LOOP;
        
        -- Set channel array for warehouse operations
        channel_array := ARRAY['Warehouse']; 
        
        -- Execute EOP/BOP sync
        eop_bop_query_text := format(
            'SELECT item_smart.sync_eop_bop_v3(%L, %L, %L, %L, %L)', 
            entry_date_var, 
            filters, 
            dept,
            'sku', 
            hierarchy_code_list
        );
        RAISE NOTICE 'Called EOP BOP sync';
        EXECUTE eop_bop_query_text INTO rows_updated_for_eop_bop_sync;
        
        -- Restore the original channels
        channel_array := original_channels;
        
        -- Execute FWOS sync
        fwos_query_text := format(
            'SELECT item_smart.sync_fwos_v3(%L, %L, %L, %L, %L, %L)', 
            entry_date_var, 
            exit_date_var, 
            filters, 
            dept,
            'sku',
            hierarchy_code_list
        );
        RAISE NOTICE 'Called sync FWOS';
        EXECUTE fwos_query_text INTO rows_updated_for_fwos;

        -- Execute markdown conversion edit
        markdown_edit_text := format(
            'SELECT item_smart.markdown_conversion_edit_v3(%L, %L, %L, %L, %L, %L, %L)',
            entry_date_var,
            exit_date_var,
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

    -- Return the number of rows updated in itemfact_sku table
    RETURN updated_row_count;
END;
$function$;