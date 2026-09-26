--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:placeholder_cadence_generation runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:placeholder_cadence_generation_v2
--comment: placeholder_cadence_generation_v2
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.placeholder_cadence_generation(text, _text);

CREATE OR REPLACE FUNCTION item_smart.placeholder_cadence_generation(p_product_code text, p_channels text[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_insert_count INT := 0;
    v_total_insert_count INT := 0;
    i INT;

    filters JSONB;
    filter JSONB;
    attribute_name TEXT;
    values TEXT;
    operator TEXT;
    mapped_product_code_var TEXT;
    mapped_hierarchy_code_var INT;
    hierarchy_code_var INT;
    dept_var TEXT;
    mapped_l2_name_var TEXT;
    where_clause TEXT := '';
    entry_date_var DATE;
    exit_date_var DATE;
    
    original_channels TEXT[] := p_channels; 

    start_week_id_var INT;
    end_week_id_var_wp INT;
    end_week_id_var_iaf INT;
    original_start_week_id INT;
    start_week_id_var_frm_fm INT;
    start_week_id_var_frm_wp INT;
    end_week_id_var_frm_wp INT;
    end_week_id_var_frm_iaf INT;
    end_week_without_26_wks INT;
    end_week_with_26_wks INT;
    before_ew INT;
    
    wp_table_name TEXT;
    iaf_table_name TEXT;
    insert_iaf_query TEXT;
    insert_wp_query TEXT;
    insert_wp_warehouse_query TEXT;
    update_wp_warehouse_query TEXT;
    insert_wp_channels_query TEXT;

    w2d_query_text TEXT;
    channel TEXT;
    rows_updated_for_w2d INT := 0;
    is_special_order_condition TEXT := '';
    planing_level TEXT := 'sku';
    eop_bop_query_text TEXT;
    rows_updated_for_eop_bop_sync INT := 0;
    fwos_query_text TEXT;
    rows_updated_for_fwos INT := 0;

    markdown_edit_text TEXT;
    rows_updated_for_markdown_edit INT := 0;
    reco_receipt_edit_text TEXT;
    rows_updated_for_reco_reciept_edit INT := 0;

    insert_ph_to_itemfact_sku_query TEXT;
    insert_ph_to_itemfact_sku_week_query TEXT;
    itemfact_sku_table_name TEXT;
    itemfact_sku_week_table_name TEXT;

    mapped_fwos_target_var INT4;
    mapped_lead_time_var INT;
    mapped_presentation_min_var INT4;
    mapped_baseline_discount_var FLOAT8;
    mapped_moq INT4;
    mapped_auc FLOAT4;
    mapped_aoh_flag BOOL;
    mapped_markdown_date DATE;

    hierarchy_code_list INT[];

    iaf_table_source_name TEXT;
    iaf_table_dest_name TEXT;
    wp_table_source_name TEXT;
    wp_table_dest_name TEXT;

BEGIN
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
       
        -- Check if attribute_name is 'l3_name' and if any values have 'REGULAR_' or 'SPO_' prefixes
        IF planing_level = 'spo' AND attribute_name = 'l3_name' THEN
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
    
    RAISE NOTICE 'v_sql : %', where_clause;

    -- Perform operations with the generated WHERE clause
    -- For example, you can use it in a dynamic query
    EXECUTE format('SELECT hierarchy_code, mapped_product_code, l2_name, entry_date, exit_date FROM item_smart.placeholders_info WHERE %s LIMIT 1', where_clause)
    INTO hierarchy_code_var, mapped_product_code_var, dept_var, entry_date_var, exit_date_var;

    EXECUTE format('SELECT hierarchy_code, l2_name FROM item_smart.mv_product_hierarchies_filter WHERE product_code = %L LIMIT 1', mapped_product_code_var)
    INTO mapped_hierarchy_code_var, mapped_l2_name_var;
    
    hierarchy_code_list := ARRAY[hierarchy_code_var];

    --replacing spaces
    dept_var := REPLACE(dept_var, ' ', '');
    mapped_l2_name_var := REPLACE(mapped_l2_name_var, ' ', '');

    iaf_table_source_name := 'item_smart.iaf_master_' || lower(mapped_l2_name_var);
    wp_table_source_name := 'item_smart.wp_master_' || lower(mapped_l2_name_var);
    iaf_table_dest_name := 'item_smart.iaf_master_' || lower(dept_var);
    wp_table_dest_name := 'item_smart.wp_master_' || lower(dept_var);
    wp_table_name := wp_table_dest_name;
    iaf_table_name := iaf_table_dest_name;

    itemfact_sku_table_name := 'item_smart.itemfact_sku';
    itemfact_sku_week_table_name := 'item_smart.itemfact_sku_week';

    RAISE NOTICE 'IAF TABLE SOURCE: %', iaf_table_source_name;
    RAISE NOTICE 'WP TABLE SOURCE: %', wp_table_source_name;
    RAISE NOTICE 'IAF TABLE DEST: %', iaf_table_dest_name;
    RAISE NOTICE 'WP TABLE DEST: %', wp_table_dest_name;

    -- Calculate start week from fm and wp
    original_start_week_id := item_smart.get_lag_week(0, entry_date_var);
    start_week_id_var_frm_fm := item_smart.get_lag_days(56, entry_date_var);

    --calculate end_weeks from iaf and wp
    EXECUTE format('SELECT MAX(current_week) FROM %s WHERE hierarchy_code = %L LIMIT 1', 
            wp_table_source_name, 
            mapped_hierarchy_code_var
            ) INTO end_week_id_var_frm_wp;

    EXECUTE format('SELECT MAX(current_week) FROM %s WHERE hierarchy_code = %L LIMIT 1', 
            iaf_table_source_name, 
            mapped_hierarchy_code_var
        ) INTO end_week_id_var_frm_iaf;

    -- Calculate end_week_id based on exit_date 
    IF exit_date_var IS NOT NULL THEN
        --if user given exit-date
        SELECT item_smart.get_lead_week(26, exit_date_var) INTO end_week_with_26_wks;
        SELECT item_smart.get_lead_week(0, exit_date_var) INTO end_week_without_26_wks;
            
        SELECT LEAST(end_week_without_26_wks, end_week_id_var_frm_wp) INTO end_week_id_var_wp;
        SELECT LEAST(end_week_with_26_wks, end_week_id_var_frm_iaf) INTO end_week_id_var_iaf;
    ELSE
        -- If no exit_date is provided, use the maximum week available from source tables
        end_week_id_var_wp := end_week_id_var_frm_wp;
        end_week_id_var_iaf := end_week_id_var_frm_iaf;
    END IF;

    RAISE NOTICE '% END_WEEK_FROM_IAF', end_week_id_var_iaf;
    RAISE NOTICE '% END_WEEK_FROM_WP', end_week_id_var_wp;

    --get min,max week from wp
    EXECUTE format('SELECT MIN(current_week) FROM %s WHERE hierarchy_code = %L LIMIT 1', 
        wp_table_source_name, 
        mapped_hierarchy_code_var
    ) INTO start_week_id_var_frm_wp;

    SELECT GREATEST(start_week_id_var_frm_fm, start_week_id_var_frm_wp) INTO start_week_id_var;

    -- Debugging: Display the results
    RAISE NOTICE 'Hierarchy code: %', hierarchy_code_var;
    RAISE NOTICE 'Mapped Hierarchy code: %', mapped_hierarchy_code_var;
    RAISE NOTICE 'Mapped product code: %', mapped_product_code_var;
    RAISE NOTICE 'Dept: %', dept_var;
    RAISE NOTICE 'Launch: %', entry_date_var;
    RAISE NOTICE 'Exit: %', exit_date_var;
    RAISE NOTICE 'launch week_id %', start_week_id_var;


    -- delete existing data from wp,iaf,itemfact_sku_week before copying from iaf to wp
    EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %s', wp_table_name, hierarchy_code_var);
    EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %s', iaf_table_name, hierarchy_code_var); 
    EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %s', itemfact_sku_week_table_name, hierarchy_code_var); 
    EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %s', itemfact_sku_table_name, hierarchy_code_var); 
     
    -- Construct the INSERT query dynamically
    insert_iaf_query := format('
        INSERT INTO %s (
            dept, channel, current_week, hierarchy_code, product_type, created_by, created_at, updated_by,
            updated_at, written_sales_dollars, written_sales_units, written_sales_cost, written_air, written_aur,
            written_auc, written_gm_perc, written_gm_dollar, written_dr_perc, scenario, actualised, revenue, discount
        )
        SELECT 
            %L as dept, channel, current_week, %s, product_type, created_by, 
            NOW() AS created_at, updated_by, updated_at, written_sales_dollars, written_sales_units, written_sales_cost, written_air, written_aur,
            written_auc, written_gm_perc, written_gm_dollar, written_dr_perc, scenario, actualised, revenue, discount
        FROM %s
        WHERE 
            hierarchy_code = %s AND 
            current_week between %s and %s AND
            channel = ANY(%L);
    ',
        iaf_table_dest_name,
        dept_var,
        hierarchy_code_var,
        iaf_table_source_name,
        mapped_hierarchy_code_var,
        original_start_week_id, -- Start week
        end_week_id_var_iaf,  -- End week
        p_channels
    );

    RAISE NOTICE 'Insert IAF Query: %', insert_iaf_query;
    EXECUTE insert_iaf_query;
    GET DIAGNOSTICS v_insert_count = ROW_COUNT;

    -- WP seeding
    insert_wp_query := format('
        INSERT INTO %s (
            dept, channel, current_week, hierarchy_code, product_type, created_by, created_at, updated_by,
            updated_at, written_sales_dollars, written_sales_units, written_sales_cost, written_air, written_aur,
            written_auc, written_gm_perc, written_gm_dollar, written_dr_perc, scenario, actualised, revenue, discount
        )
        SELECT 
            dept, channel, current_week, hierarchy_code, product_type, created_by, 
            NOW() AS created_at, updated_by, updated_at, written_sales_dollars, written_sales_units, written_sales_cost, written_air, written_aur,
            written_auc, written_gm_perc, written_gm_dollar, written_dr_perc, scenario, actualised, revenue, discount
        FROM %s
        WHERE 
            hierarchy_code = %s AND 
            current_week between %s and %s AND
            channel = ANY(%L);
    ',
        wp_table_dest_name,
        iaf_table_dest_name,
        hierarchy_code_var,
        start_week_id_var, -- Start week
        end_week_id_var_wp,  -- End week
        p_channels
    );

    RAISE NOTICE 'Insert WP Query: %', insert_wp_query;
    EXECUTE insert_wp_query;

    -- Set channels to Warehouse for warehouse-specific operations
    p_channels := ARRAY['Warehouse']; 

    insert_wp_warehouse_query := format('
        INSERT INTO %s (
            dept, channel, current_week, hierarchy_code, product_type, created_by, created_at, updated_by
        )
        SELECT 
            %L as dept, channel, current_week, %s, product_type, created_by, 
            NOW() AS created_at, updated_by
        FROM %s
        WHERE 
            hierarchy_code = %s AND 
            current_week between %s and %s AND
            channel = ANY(%L);
    ',
        wp_table_name,
        dept_var,
        hierarchy_code_var,
        wp_table_source_name,
        mapped_hierarchy_code_var,
        start_week_id_var, -- Start week
        end_week_id_var_wp,  -- End week
        p_channels
    );

    RAISE NOTICE 'Insert WP Query Warehouse: %', insert_wp_warehouse_query;
    EXECUTE insert_wp_warehouse_query;

    --update bop_units as 0 
    update_wp_warehouse_query := format('
        UPDATE %s
        SET 
            bop_units = 0,
            aoh_units = 0,
            updated_at = NOW()
        WHERE 
            hierarchy_code = %s AND 
            current_week = %s AND
            channel = ANY(%L);
    ',
        wp_table_name,
        hierarchy_code_var,
        start_week_id_var,       -- Start week
        p_channels
    );

    RAISE NOTICE 'Update WP Query Warehouse: %', update_wp_warehouse_query;
    EXECUTE update_wp_warehouse_query;

    p_channels := original_channels;

    RAISE NOTICE 'CHANNEL BEFORE W2D %', p_channels;
    
    --insert channels data from launch-8 to launch
    before_ew := item_smart.get_lag_week(1, entry_date_var);
    insert_wp_channels_query := format('
        INSERT INTO %s (
            dept, channel, current_week, hierarchy_code, product_type, created_by, created_at, updated_by
        )
        SELECT 
            dept, channel, current_week, %s, product_type, created_by, 
            NOW() AS created_at, updated_by
        FROM %s
        WHERE 
            hierarchy_code = %s AND 
            current_week between %s and %s AND
            channel = ANY(%L);
    ',
        wp_table_name,
        hierarchy_code_var,
        wp_table_source_name,
        mapped_hierarchy_code_var,
        start_week_id_var, -- Start week   
        before_ew,  -- End week
        p_channels
    );

    RAISE NOTICE 'Insert WP Query Channels: %', insert_wp_channels_query;
    EXECUTE insert_wp_channels_query;

    -- Iterate over the channels and call w2d_edit for each channel
    FOREACH channel IN ARRAY p_channels LOOP
        w2d_query_text := format('SELECT item_smart.w2d_edit(%L, %L, %L, %L, %L, %L, %L)', 
            entry_date_var, exit_date_var, filters, dept_var, channel, 'written_sales_units', planing_level);
        RAISE NOTICE 'Called w2d_edit for channel: %', channel;
        EXECUTE w2d_query_text INTO rows_updated_for_w2d;
    END LOOP;
    
    p_channels := ARRAY['Warehouse']; 
    
    eop_bop_query_text := format('SELECT item_smart.sync_eop_bop_v3(%L, %L, %L, %L, %L)', 
        entry_date_var, filters, dept_var, planing_level, hierarchy_code_list);
    RAISE NOTICE 'Called eop bop sync';
    EXECUTE eop_bop_query_text INTO rows_updated_for_eop_bop_sync;
    
    --Restore the original channels if needed
    p_channels := original_channels;
      
    fwos_query_text := format('SELECT item_smart.sync_fwos_v3(%L, %L, %L, %L, %L, %L)', 
        entry_date_var, exit_date_var, filters, dept_var, planing_level, hierarchy_code_list);
    RAISE NOTICE 'Called sync fwos';
    EXECUTE fwos_query_text INTO rows_updated_for_fwos;

    markdown_edit_text := format(
        'SELECT item_smart.markdown_conversion_edit_v3(%L, %L, %L, %L, %L, %L, %L)',
        entry_date_var,
        exit_date_var,  -- sdate
        filters,               -- filters jsonb
        dept_var,                  -- dept
        'written_sales_units', -- editable_kpi
        planing_level,       -- planing_level
        hierarchy_code_list
    );
    RAISE NOTICE 'Called markdown edit';
    EXECUTE markdown_edit_text INTO rows_updated_for_markdown_edit;

    --itemfact sku details into variables
    EXECUTE format('SELECT fwos_target, lead_time, presentation_min, baseline_discount, moq, auc, aoh_flag, markdown_date FROM %s WHERE hierarchy_code = %L LIMIT 1',
        itemfact_sku_table_name, mapped_hierarchy_code_var)
    INTO mapped_fwos_target_var, mapped_lead_time_var, mapped_presentation_min_var, mapped_baseline_discount_var, mapped_moq, mapped_auc, mapped_aoh_flag, mapped_markdown_date;

    RAISE NOTICE 'Mapped FWOS: %', mapped_fwos_target_var;
    RAISE NOTICE 'Mapped Lead Time: %', mapped_lead_time_var;
    RAISE NOTICE 'Mapped Presentation Min: %', mapped_presentation_min_var;
    RAISE NOTICE 'Mapped Baseline Discount: %', mapped_baseline_discount_var;

    insert_ph_to_itemfact_sku_query := format('
        INSERT INTO %s (
            dept, hierarchy_code, launch_date, exit_date, fwos_target, lead_time, 
            presentation_min, baseline_discount, moq, auc, aoh_flag, markdown_date,
            aoh_flag_is_source_feed, auc_is_source_feed, baseline_discount_is_source_feed, exit_date_is_source_feed,
            fwos_target_is_source_feed, launch_date_is_source_feed, lead_time_is_source_feed,
            markdown_date_is_source_feed, moq_is_source_feed, no_of_reg_weeks_is_source_feed,
            presentation_min_is_source_feed, vendor_name_is_source_feed
        )
        SELECT 
            l2_name, hierarchy_code, entry_date, exit_date, 
            %L, %L, %L, %L, %L, %L, %L, %L,
            FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE
        FROM item_smart.placeholders_info
        WHERE hierarchy_code = %s
    ',
        itemfact_sku_table_name,
        mapped_fwos_target_var, mapped_lead_time_var, mapped_presentation_min_var, 
        mapped_baseline_discount_var, mapped_moq, mapped_auc, mapped_aoh_flag, 
        mapped_markdown_date, hierarchy_code_var
    );

    RAISE NOTICE 'Insert PH Query: %', insert_ph_to_itemfact_sku_query;
    EXECUTE insert_ph_to_itemfact_sku_query;

    insert_ph_to_itemfact_sku_week_query := format('
        INSERT INTO %s (
            dept, hierarchy_code, current_week, air, tier_store_count
        )
        SELECT 
            %L AS dept, %s, current_week, air, tier_store_count
        FROM %s
        WHERE 
            hierarchy_code = %s AND
            current_week between %s and %s;
    ',
        itemfact_sku_week_table_name,
        dept_var,
        hierarchy_code_var,
        itemfact_sku_week_table_name,
        mapped_hierarchy_code_var,
        start_week_id_var,
        end_week_id_var_wp
    );

    RAISE NOTICE 'Insert PH Week Query: %', insert_ph_to_itemfact_sku_week_query;
    EXECUTE insert_ph_to_itemfact_sku_week_query;

    reco_receipt_edit_text := format(
        'SELECT item_smart.reco_receipt_edit_itemfacts(%L, %L, %L, %L)',
        filters,               -- filters jsonb
        dept_var,                  -- dept
        planing_level,        -- planing_level
        hierarchy_code_list
    );
    RAISE NOTICE 'Called reco receipt edit';
    EXECUTE reco_receipt_edit_text INTO rows_updated_for_reco_reciept_edit;

    RETURN v_total_insert_count + rows_updated_for_w2d + rows_updated_for_eop_bop_sync + rows_updated_for_fwos;
END;
$function$;