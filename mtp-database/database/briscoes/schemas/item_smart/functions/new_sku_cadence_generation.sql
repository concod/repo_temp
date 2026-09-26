--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:new_sku_cadence_generation stripComments:false runOnChange:true splitStatements:false context:new_sku_cadence_generation labels:new_sku_cadence_generation_v4
--comment: initial changeset for new_sku_cadence_generation_v4
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.new_sku_cadence_generation(text, text[]);

CREATE OR REPLACE FUNCTION item_smart.new_sku_cadence_generation(p_product_code text, p_channels text[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    -- Counter variables for tracking operations
    v_insert_count INT := 0;
    
    -- Filter variables
    filters JSONB;
    filter JSONB;
    attribute_name TEXT;
    values TEXT;
    operator TEXT;
    
    -- Product and hierarchy variables
    mapped_product_code_var TEXT;
    mapped_hierarchy_code_var INT;
    hierarchy_code_var INT;
    category_var TEXT;
    mapped_l1_name_var TEXT;
    where_clause TEXT := '';
    entry_date_var DATE;
    exit_date_var DATE;
    
    original_channels TEXT[] := p_channels; 

    -- Week ID variables
    start_week_id_var INT;
    end_week_id_var INT;
    start_week_id_var_frm_fm INT;
    start_week_id_var_frm_wp INT;
    original_start_week_id_var INT;
    
    -- Table name variables
    iaf_table_source_name TEXT;
    iaf_table_dest_name TEXT;
    wp_table_source_name TEXT;
    wp_table_dest_name TEXT;
    wp_table_name TEXT;

    -- SQL query variables
    insert_iaf_query TEXT;
    insert_wp_query TEXT;
    insert_wp_dc_query TEXT;
    update_wp_dc_query TEXT;
    update_rcpts_to_zero_query TEXT;
    update_rcpt_auc_with_written_auc_query TEXT;
    update_return_calcs_query TEXT;
    is_special_order_condition TEXT := '';
    planning_level TEXT := 'sku';
    eop_bop_query_text TEXT;
    rows_updated_for_eop_bop_sync INT := 0;
    fwos_query_text TEXT;
    rows_updated_for_fwos INT := 0;
    rows_updated_for_sync_return_inv INT := 0;
    sync_return_inv_query TEXT;
    reco_receipt_edit_text TEXT;
    rows_updated_for_reco_receipt_edit INT := 0;

    category_var_uncleaned TEXT;
    category_var_new_sku TEXT;
    dept_var TEXT;
    hierarchy_code_list INTEGER[];

BEGIN
    -- SECTION 1: Generate filters and build WHERE clause
    -- -----------------------------------------------------
    -- Generate filters using the generate_filter function
    filters := item_smart.generate_filter(p_product_code);

    -- Debugging: Display the generated filters
    RAISE NOTICE 'Filters: %', filters;

    -- Build the WHERE clause dynamically from the filters
    FOR filter IN
        SELECT * FROM jsonb_array_elements(filters)
    LOOP
        attribute_name := filter->>'attribute_name';
        values := (SELECT string_agg(quote_literal(value), ', ')
                   FROM jsonb_array_elements_text(filter->'value') value);
        operator := filter->>'operator';
      
        -- Handle special order condition for 'l3_name' attribute
        IF planning_level = 'spo' AND attribute_name = 'l3_name' THEN
            IF values LIKE '%REGULAR_%' THEN
                is_special_order_condition := 'is_special_order = false';
                values := (SELECT string_agg(quote_literal(regexp_replace(value, '^REGULAR_', '')), ', ')
                           FROM jsonb_array_elements_text(filter->'value') value);
            ELSIF values LIKE '%SPO_%' THEN
                is_special_order_condition := 'is_special_order = true';
                values := (SELECT string_agg(quote_literal(regexp_replace(value, '^SPO_', '')), ', ')
                           FROM jsonb_array_elements_text(filter->'value') value);
            END IF;
        END IF;
       
        -- Append the where_clause
        IF where_clause = '' THEN
            where_clause := attribute_name || ' ' || operator || ' (' || values || ')';
        ELSE
            where_clause := where_clause || ' AND ' || attribute_name || ' ' || operator || ' (' || values || ')';
        END IF;
    END LOOP;
  
    -- Append the is_special_order condition if applicable
    IF is_special_order_condition <> '' THEN
        where_clause := where_clause || ' AND ' || is_special_order_condition;
    END IF;
   
    RAISE NOTICE 'WHERE clause: %', where_clause;

    -- SECTION 2: Retrieve and validate base SKU information
    -- -----------------------------------------------------
    -- Retrieve basic information about the new SKU from placeholders table
    EXECUTE format('SELECT hierarchy_code, mapped_product_code, l1_name, launch_date, exit_date FROM item_smart.new_skus WHERE %s LIMIT 1', where_clause)
    INTO hierarchy_code_var, mapped_product_code_var, category_var, entry_date_var, exit_date_var;

    -- Get mapped hierarchy code from the product hierarchy
    EXECUTE format('SELECT hierarchy_code, l1_name FROM item_smart.mv_product_hierarchies_filter WHERE article = %L LIMIT 1', mapped_product_code_var)
    INTO mapped_hierarchy_code_var, mapped_l1_name_var;

    -- SECTION 3: Prepare table names and category variables
    -- -----------------------------------------------------
    -- Format category variables for table names
    category_var_uncleaned := category_var;
    category_var := REPLACE(category_var, ' ', '');
    category_var := REPLACE(category_var, '-', '');
    category_var_new_sku := category_var;

    mapped_l1_name_var := REPLACE(mapped_l1_name_var, ' ', '');
    mapped_l1_name_var := REPLACE(mapped_l1_name_var, '-', '');
    
    -- Set up table names for IAF and WP operations
    iaf_table_source_name := 'item_smart.iaf_master_' || lower(mapped_l1_name_var);
    wp_table_source_name := 'item_smart.wp_master_' || lower(mapped_l1_name_var);
    iaf_table_dest_name := 'item_smart.iaf_master_' || lower(category_var);
    wp_table_dest_name := 'item_smart.wp_master_' || lower(category_var);
    wp_table_name := wp_table_dest_name;

    RAISE NOTICE 'IAF TABLE SOURCE: %', iaf_table_source_name;
    RAISE NOTICE 'WP TABLE SOURCE: %', wp_table_source_name;
    RAISE NOTICE 'IAF TABLE DEST: %', iaf_table_dest_name;
    RAISE NOTICE 'WP TABLE DEST: %', wp_table_dest_name;
    
    -- SECTION 4: Calculate start and end weeks
    -- -----------------------------------------
    -- Calculate start week based on entry date
    start_week_id_var_frm_fm := item_smart.get_lag_week(0, entry_date_var);

    -- Get minimum week from WP table for the mapped hierarchy
    EXECUTE format('SELECT MIN(current_week) FROM %s WHERE hierarchy_code = %L LIMIT 1', 
        wp_table_source_name, 
        mapped_hierarchy_code_var
    ) INTO start_week_id_var_frm_wp;

    RAISE NOTICE 'FROM WP %', start_week_id_var_frm_wp;
    RAISE NOTICE 'FROM FM %', start_week_id_var_frm_fm;

    -- Get max of two values for the final start week
    SELECT GREATEST(COALESCE(start_week_id_var_frm_fm, 0), COALESCE(start_week_id_var_frm_wp, 0)) INTO start_week_id_var;
    
    original_start_week_id_var := start_week_id_var;
     
    RAISE NOTICE 'Launch week_id %', start_week_id_var;
    
    -- Calculate end_week_id based on exit_date
    IF exit_date_var IS NOT NULL THEN
        -- Calculate end_week_id when exit_date is provided
        SELECT MAX(fiscal_year_week) INTO end_week_id_var
        FROM global.fiscal_date_mapping;
    ELSE
        -- If no exit_date is provided, set end_week_id to the maximum week available
        SELECT MAX(fiscal_year_week) INTO end_week_id_var
        FROM global.fiscal_date_mapping;
    END IF;
    
    -- Log important variables for debugging
    RAISE NOTICE 'Hierarchy code: %', hierarchy_code_var;
    RAISE NOTICE 'Mapped Hierarchy code: %', mapped_hierarchy_code_var;
    RAISE NOTICE 'Mapped product code: %', mapped_product_code_var;
    RAISE NOTICE 'Category: %', category_var;
    RAISE NOTICE 'Category Mapped: %', mapped_l1_name_var;
    RAISE NOTICE 'Launch: %', entry_date_var;
    RAISE NOTICE 'Exit: %', exit_date_var;
    RAISE NOTICE 'Launch week_id %', start_week_id_var;
    RAISE NOTICE 'End week_id %', end_week_id_var;

    -- Delete existing data from wp,iaf before copying from iaf to wp
    EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %s', wp_table_dest_name, hierarchy_code_var);
    EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %s', iaf_table_dest_name, hierarchy_code_var); 

    
    -- SECTION 6: Copy data from mapped SKU to new SKU in IAF and WP tables
    -- --------------------------------------------------------------------
    -- Insert data from mapped IAF table to target IAF table for the new SKU
    insert_iaf_query := format('
        INSERT INTO %s (
            dept, channel, current_week, hierarchy_code, product_type, created_by, created_at, updated_by,
            updated_at, written_sales_dollars, written_sales_units, written_sales_cost, written_backorder_sales_units,
            written_backorder_sales, net_sales_dollars, net_sales_units, written_air, written_aur, written_dr_perc,
            written_auc, written_imu, written_gm_perc,
            written_gm_dollar, written_backorder_aur, written_aus, scenario, actualised, revenue, discount
        )
        SELECT 
            %L AS dept, channel, current_week, %s AS hierarchy_code, product_type, created_by, 
            NOW() AS created_at, updated_by, NOW() AS updated_at, written_sales_dollars, written_sales_units, written_sales_cost,
            written_backorder_sales_units, written_backorder_sales, net_sales_dollars, net_sales_units, written_air,
            written_aur, written_dr_perc, written_auc, written_imu,
            written_gm_perc, written_gm_dollar, written_backorder_aur, written_aus, scenario, actualised, revenue, discount
        FROM %s
        WHERE 
            hierarchy_code = %s AND 
            current_week BETWEEN %s AND %s AND
            channel = ANY(%L);
    ',
        iaf_table_dest_name,
        category_var_uncleaned,
        hierarchy_code_var,
        iaf_table_source_name,
        mapped_hierarchy_code_var,
        start_week_id_var,
        end_week_id_var,
        p_channels
    );

    RAISE NOTICE 'Insert IAF Query: %', insert_iaf_query;
    EXECUTE insert_iaf_query;
    GET DIAGNOSTICS v_insert_count = ROW_COUNT;
    RAISE NOTICE 'Rows inserted into IAF table: %', v_insert_count;
    
    -- Insert data from IAF to WP table for the new SKU
    insert_wp_query := format('
        INSERT INTO %s (
            dept, channel, current_week, hierarchy_code, product_type, created_by, created_at, updated_by,
            updated_at, written_sales_dollars, written_sales_units, written_sales_cost, written_backorder_sales_units,
            written_backorder_sales, net_sales_dollars, net_sales_units, written_air, written_aur, written_dr_perc,
            written_auc, written_imu, written_gm_perc,
            written_gm_dollar, written_backorder_aur, written_aus, scenario, actualised, revenue, discount
        )
        SELECT 
            dept, channel, current_week, hierarchy_code, product_type, created_by, 
            NOW() AS created_at, updated_by, NOW() AS updated_at, written_sales_dollars, written_sales_units, written_sales_cost,
            written_backorder_sales_units, written_backorder_sales, net_sales_dollars, net_sales_units, written_air,
            written_aur, written_dr_perc, written_auc, written_imu,
            written_gm_perc, written_gm_dollar, written_backorder_aur, written_aus, scenario, actualised, revenue, discount
        FROM %s
        WHERE 
            hierarchy_code = %s AND 
            current_week BETWEEN %s AND %s AND
            channel = ANY(%L);
    ',
        wp_table_dest_name,
        iaf_table_dest_name,
        hierarchy_code_var,
        start_week_id_var,
        end_week_id_var,
        p_channels
    );

    RAISE NOTICE 'Insert WP Query: %', insert_wp_query;
    EXECUTE insert_wp_query;
    GET DIAGNOSTICS v_insert_count = ROW_COUNT;
    RAISE NOTICE 'Rows inserted into WP table: %', v_insert_count;

    -- SECTION 7: Handle Distribution Center (DC) data
    -- -----------------------------------------------
    -- Create entry for DC/warehouse for PH item in wp
    p_channels := ARRAY['DC']; 

    insert_wp_dc_query := format('
        INSERT INTO %s (
            dept, channel, current_week, hierarchy_code, product_type, created_by, created_at, updated_by
        )
        SELECT 
            %L as dept, channel, current_week, %s as hierarchy_code, product_type, created_by, 
            NOW() AS created_at, updated_by
        FROM %s
        WHERE 
            hierarchy_code = %s AND 
            current_week BETWEEN %s AND %s AND
            channel = ANY(%L);
    ',
        wp_table_name,
        category_var_uncleaned,
        hierarchy_code_var,
        wp_table_name,
        mapped_hierarchy_code_var,
        original_start_week_id_var,
        end_week_id_var,
        p_channels
    );

    RAISE NOTICE 'Insert WP Query DC: %', insert_wp_dc_query;
    EXECUTE insert_wp_dc_query;
    GET DIAGNOSTICS v_insert_count = ROW_COUNT;
    RAISE NOTICE 'DC rows inserted into WP table: %', v_insert_count;

    -- SECTION 8: Update receipt and inventory data
    -- --------------------------------------------
    -- Insert 0 in total rcpts, unplaced rcpts, placed rcpts and set return percentage to 0
    update_rcpts_to_zero_query := format('
        UPDATE %s
        SET 
            total_receipt_cost = 0,
            total_receipt_units = 0,
            on_order_placed_total = 0,
            on_order_placed_total_unit = 0,
            on_order_unplaced_total = 0,
            on_order_unplaced_total_unit = 0,
            recomm_receipt_units = 0,
            recomm_receipt_cost = 0,
            return_perc = 0,
            updated_at = NOW()
        WHERE 
            hierarchy_code = %s AND 
            current_week BETWEEN %s AND %s AND
            channel = ANY(%L)
    ',
        wp_table_name,
        hierarchy_code_var,
        original_start_week_id_var,
        end_week_id_var,
        p_channels
    );

    RAISE NOTICE 'Update WP Query DC (zero receipts): %', update_rcpts_to_zero_query;
    EXECUTE update_rcpts_to_zero_query;
    GET DIAGNOSTICS v_insert_count = ROW_COUNT;
    RAISE NOTICE 'Rows updated for receipt zeroing: %', v_insert_count;

    -- Update receipt average unit cost (AUC) with written AUC of the mapped SKU
    update_rcpt_auc_with_written_auc_query := format('
        WITH source_data AS (
            SELECT 
                current_week, 
                channel, 
                written_auc
            FROM %s
            WHERE 
                hierarchy_code = %s AND 
                current_week BETWEEN %s AND %s
        )
        UPDATE %s AS target
        SET 
            total_receipts_auc = source_data.written_auc,
            on_order_placed_total_auc = source_data.written_auc, 
            on_order_unplaced_total_auc = source_data.written_auc, 
            recomm_receipt_auc = source_data.written_auc,
            updated_at = NOW()
        FROM source_data
        WHERE 
            target.hierarchy_code = %s AND
            target.current_week = source_data.current_week AND
            target.channel = ANY(%L)
    ',
        wp_table_name,
        mapped_hierarchy_code_var,
        original_start_week_id_var,
        end_week_id_var,
        wp_table_name,
        hierarchy_code_var,
        p_channels
    );

    RAISE NOTICE 'Update AUC Query: %', update_rcpt_auc_with_written_auc_query;
    EXECUTE update_rcpt_auc_with_written_auc_query;
    GET DIAGNOSTICS v_insert_count = ROW_COUNT;
    RAISE NOTICE 'Rows updated for AUC: %', v_insert_count;

    -- Update beginning of period (BOP) units as 0 for first week
    update_wp_dc_query := format('
        UPDATE %s
        SET 
            bop_units = 0,
            updated_at = NOW()
        WHERE 
            hierarchy_code = %s AND 
            current_week = %s AND
            channel = ANY(%L);
    ',
        wp_table_name,
        hierarchy_code_var,
        start_week_id_var,
        p_channels
    );

    RAISE NOTICE 'Update WP Query DC (BOP): %', update_wp_dc_query;
    EXECUTE update_wp_dc_query;
    GET DIAGNOSTICS v_insert_count = ROW_COUNT;
    RAISE NOTICE 'Rows updated for BOP zeroing: %', v_insert_count;

    -- Restore original channels for further processing
    p_channels := original_channels;

    -- SECTION 9: Update return calculations
    -- -------------------------------------
    -- Update return-related calculations
    update_return_calcs_query := format('
        UPDATE %s
        SET 
            return_units = (COALESCE(return_perc, 0) * COALESCE(written_sales_units, 0)),
            return_dollars = ((COALESCE(return_perc, 0) * COALESCE(written_sales_units, 0))) * ((COALESCE(written_aur / (1 + 0.15), 0))),
            net_sales_units = (COALESCE(written_sales_units, 0)) - ((COALESCE(return_perc, 0) * COALESCE(written_sales_units, 0))),
            net_sales_dollars = (COALESCE(written_sales_dollars, 0)) - (((COALESCE(return_perc, 0) * COALESCE(written_sales_units, 0))) * ((COALESCE(written_aur / (1 + 0.15), 0)))),
            updated_at = NOW()
        WHERE 
            hierarchy_code = %s AND 
            current_week BETWEEN %s AND %s AND
            channel = ANY(%L)
    ',
        wp_table_name,
        hierarchy_code_var,
        original_start_week_id_var,
        end_week_id_var,
        p_channels
    );

    RAISE NOTICE 'Update return calculations: %', update_return_calcs_query;
    EXECUTE update_return_calcs_query;
    GET DIAGNOSTICS v_insert_count = ROW_COUNT;
    RAISE NOTICE 'Rows updated for return calculations: %', v_insert_count;

    -- SECTION 10: Final synchronization operations
    -- -------------------------------------------
    dept_var := category_var;
    hierarchy_code_list := ARRAY[hierarchy_code_var];

    -- Set exit date if not provided
    IF exit_date_var IS NULL THEN
        SELECT MAX(calendar_date) INTO exit_date_var
        FROM global.fiscal_date_mapping;
    END IF;
		
    -- Sync return inventory
    sync_return_inv_query := format('SELECT item_smart.sync_return_inv_v3(%L, %L, %L, %L, %L, %L)', 
        entry_date_var, exit_date_var, filters, dept_var, planning_level, hierarchy_code_list);
    RAISE NOTICE 'Calling sync_return_inv_v3 with query: %', sync_return_inv_query;
    EXECUTE sync_return_inv_query INTO rows_updated_for_sync_return_inv;
    RAISE NOTICE 'Rows updated by sync_return_inv_v3: %', rows_updated_for_sync_return_inv;
      
    -- Sync EOP/BOP values
    eop_bop_query_text := format('SELECT item_smart.sync_eop_bop_v3(%L, %L, %L, %L, %L)', 
        entry_date_var, filters, dept_var, planning_level, hierarchy_code_list);
    RAISE NOTICE 'Calling sync_eop_bop_v3 with query: %', eop_bop_query_text;
    EXECUTE eop_bop_query_text INTO rows_updated_for_eop_bop_sync;
    RAISE NOTICE 'Rows updated by sync_eop_bop_v3: %', rows_updated_for_eop_bop_sync;
     
    -- Sync FWOS (Forward Weeks of Supply)
    fwos_query_text := format('SELECT item_smart.sync_fwos_v3(%L, %L, %L, %L, %L, %L)', 
        entry_date_var, exit_date_var, filters, dept_var, planning_level, hierarchy_code_list);
    RAISE NOTICE 'Calling sync_fwos_v3 with query: %', fwos_query_text;
    EXECUTE fwos_query_text INTO rows_updated_for_fwos;
    RAISE NOTICE 'Rows updated by sync_fwos_v3: %', rows_updated_for_fwos;

    -- Apply recommended receipt edits
    reco_receipt_edit_text := format('SELECT item_smart.reco_receipt_edit_v3(%L, %L, %L, %L)',
        filters, dept_var, planning_level, hierarchy_code_list);
    RAISE NOTICE 'Calling reco_receipt_edit_v3 with query: %', reco_receipt_edit_text;
    EXECUTE reco_receipt_edit_text INTO rows_updated_for_reco_receipt_edit;
    RAISE NOTICE 'Rows updated by reco_receipt_edit_v3: %', rows_updated_for_reco_receipt_edit;

    -- Return success
    RETURN 1;
END;
$function$
;