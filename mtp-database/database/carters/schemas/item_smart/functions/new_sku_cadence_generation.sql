--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:new-sku runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:new_sku_cadence_generation_v5-fix
--comment: initial changeset for new_sku_cadence_generation_v5-fix
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.new_sku_cadence_generation(text, _text);

CREATE OR REPLACE FUNCTION item_smart.new_sku_cadence_generation(p_product_code text, p_channels text[])
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
    mapped_l0_name_var TEXT;
    where_clause TEXT := '';
    entry_date_var DATE;
    exit_date_var DATE;
    
    original_channels TEXT[] := p_channels; 

    start_week_id_var INT;
    end_week_id_var INT;

    start_week_id_var_frm_fm INT;
    start_week_id_var_frm_wp INT;
    
    wp_table_name TEXT;
    iaf_table_name TEXT;
    insert_iaf_query TEXT;
    insert_wp_query TEXT;
    insert_wp_warehouse_query TEXT;
    update_wp_warehouse_query TEXT;
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

    mapped_fwos_target_var TEXT;
    mapped_lead_time_var TEXT;
    mapped_presentation_min_var TEXT;
    mapped_baseline_discount_var TEXT;
    mapped_moq_var TEXT;
    hierarchy_code_list INTEGER[];

    iaf_table_source_name TEXT;
    iaf_table_dest_name TEXT;
    wp_table_source_name TEXT;
    wp_table_dest_name TEXT;
    dept_var_uncleaned TEXT;

    update_new_skus_query TEXT;
    min_fdm_calendar_date DATE;
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

    EXECUTE format('select min(calendar_date) from global.fiscal_date_mapping')
    INTO min_fdm_calendar_date;

    -- Perform operations with the generated WHERE clause
    EXECUTE format('SELECT hierarchy_code, mapped_product_code,l0_name,launch_date,exit_date FROM item_smart.new_skus WHERE %s and l0_name = ''USA'' and l1_name = ANY(%L) LIMIT 1', where_clause, p_channels)
    INTO hierarchy_code_var, mapped_product_code_var,dept_var,entry_date_var,exit_date_var;

    EXECUTE format('SELECT hierarchy_code, l0_name FROM item_smart.mv_product_hierarchies_filter WHERE style = %L AND country = ''USA'' and l1_name = ANY(%L) LIMIT 1', 
    mapped_product_code_var, p_channels)
    INTO mapped_hierarchy_code_var, mapped_l0_name_var;

    if entry_date_var < min_fdm_calendar_date then
        entry_date_var := min_fdm_calendar_date;
    end if;

    -- Replacing spaces
    dept_var_uncleaned := dept_var;
    dept_var := REPLACE(dept_var, ' ', '');
    mapped_l0_name_var := REPLACE(mapped_l0_name_var, ' ', '');

    iaf_table_source_name := 'item_smart.iaf_master_' || lower(mapped_l0_name_var);
    wp_table_source_name := 'item_smart.wp_master_' || lower(mapped_l0_name_var);
    iaf_table_dest_name := 'item_smart.iaf_master_' || lower(dept_var);
    wp_table_dest_name := 'item_smart.wp_master_' || lower(dept_var);
    wp_table_name := wp_table_dest_name;
    iaf_table_name := iaf_table_dest_name;

    -- Set hierarchy_code_list for function calls
    hierarchy_code_list := ARRAY[hierarchy_code_var];

    RAISE NOTICE 'Hierarchy code: %', hierarchy_code_var;
    RAISE NOTICE 'Mapped Hierarchy code: %', mapped_hierarchy_code_var;
    RAISE NOTICE 'Mapped product code: %', mapped_product_code_var;
    
    start_week_id_var := item_smart.get_lag_week(0, entry_date_var);
    
    -- Calculate end_week_id based on exit_date
    IF exit_date_var IS NOT NULL THEN
        -- Calculate end_week_id + 26 weeks if exit_date is provided
        SELECT item_smart.get_lead_week(26, exit_date_var) INTO end_week_id_var;

        IF end_week_id_var IS NULL THEN
            RAISE EXCEPTION 'No week ID found for exit_date: %', exit_date_var;
        END IF;
    ELSE
        -- If no exit_date is provided, set end_week_id to the maximum week available
        EXECUTE format('SELECT MAX(current_week) FROM %s WHERE hierarchy_code = %L LIMIT 1', 
                       wp_table_source_name, mapped_hierarchy_code_var)
        INTO end_week_id_var;

        IF end_week_id_var IS NULL THEN
            RAISE EXCEPTION 'No maximum week ID available in fiscal mapping table.';
        END IF;
    END IF;

    -- Debugging: Display the results
    RAISE NOTICE 'Dept: %', dept_var;
    RAISE NOTICE 'Launch: %', entry_date_var;
    RAISE NOTICE 'Exit: %', exit_date_var;
    RAISE NOTICE 'launch week_id %', start_week_id_var;
    RAISE NOTICE 'end week_id %', end_week_id_var;

    RAISE NOTICE 'IAF TABLE: %', iaf_table_name;
    RAISE NOTICE 'WP TABLE: %', wp_table_name;


    -- Delete existing data from wp,iaf before copying from iaf to wp
    EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %s', wp_table_dest_name, hierarchy_code_var);
    EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %s', iaf_table_dest_name, hierarchy_code_var); 

    -- Construct the INSERT query dynamically for IAF
    insert_iaf_query := format('
        INSERT INTO %s (
            dept, channel, current_week, hierarchy_code, product_type, created_by, created_at, updated_by,
            updated_at, written_sales_dollars, written_sales_units, written_sales_cost, written_air, written_aur,
            written_auc, written_gm_perc, written_gm_dollar, written_dr_perc, scenario, actualised, revenue, discount, is_active
        )
        SELECT 
            %L as dept, channel, current_week, %s, product_type, created_by, 
            NOW() AS created_at, updated_by, updated_at, written_sales_dollars, written_sales_units, written_sales_cost, written_air, written_aur,
            written_auc, written_gm_perc, written_gm_dollar, written_dr_perc, scenario, actualised, revenue, discount, true as is_active
        FROM %s
        WHERE 
            hierarchy_code = %s AND 
            current_week BETWEEN %s AND %s AND
            channel = ANY(%L);
    ',
        iaf_table_dest_name,
        dept_var_uncleaned,
        hierarchy_code_var,
        iaf_table_source_name,
        mapped_hierarchy_code_var,
        start_week_id_var, -- Start week
        end_week_id_var,   -- End week
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
            written_auc, written_gm_perc, written_gm_dollar, written_dr_perc, scenario, actualised, revenue, discount, is_active
        )
        SELECT 
            dept, channel, current_week, hierarchy_code, product_type, created_by, 
            NOW() AS created_at, updated_by, updated_at, written_sales_dollars, written_sales_units, written_sales_cost, written_air, written_aur,
            written_auc, written_gm_perc, written_gm_dollar, written_dr_perc, scenario, actualised, revenue, discount, is_active
        FROM %s
        WHERE 
            hierarchy_code = %s AND 
            current_week BETWEEN %s AND %s AND
            channel = ANY(%L);
    ',
        wp_table_dest_name,
        iaf_table_dest_name,
        hierarchy_code_var,
        start_week_id_var, -- Start week
        end_week_id_var,   -- End week
        p_channels
    );

    RAISE NOTICE 'Insert WP Query: %', insert_wp_query;
    EXECUTE insert_wp_query;

    -- Update bop_units as 0 
    update_wp_warehouse_query := format('
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
        start_week_id_var, -- Start week
        p_channels
    );

    RAISE NOTICE 'Update WP Query for Inventory Vals %', update_wp_warehouse_query;
    EXECUTE update_wp_warehouse_query;

    -- Call EOP/BOP sync
    eop_bop_query_text := format('SELECT item_smart.sync_eop_bop_v3(%L, %L, %L, %L, %L)', 
                                 entry_date_var, filters, dept_var, planing_level, hierarchy_code_list);
    RAISE NOTICE 'Called eop bop sync';
    EXECUTE eop_bop_query_text INTO rows_updated_for_eop_bop_sync;
      
    -- Call FWOS sync
    fwos_query_text := format('SELECT item_smart.sync_fwos_v3(%L, %L, %L, %L, %L, %L)', 
                              entry_date_var, exit_date_var, filters, dept_var, planing_level, hierarchy_code_list);
    RAISE NOTICE 'Called sync fwos';
    EXECUTE fwos_query_text INTO rows_updated_for_fwos;

    -- Call reco receipt edit
    reco_receipt_edit_text := format(
        'SELECT item_smart.reco_receipt_edit_v3(%L, %L, %L, %L)',
        filters,               -- filters jsonb
        dept_var,              -- dept
        planing_level,         -- planing_level
        hierarchy_code_list
    );
    RAISE NOTICE 'Called reco receipt edit';
    EXECUTE reco_receipt_edit_text INTO rows_updated_for_reco_reciept_edit;

    -- update the new_skus table with the updated_at
    update_new_skus_query := format('
        UPDATE item_smart.new_skus
        SET updated_at = NOW()
        WHERE hierarchy_code = %s
    ', hierarchy_code_var);
    RAISE NOTICE 'Called update new skus';
    EXECUTE update_new_skus_query;

    RETURN v_total_insert_count +  rows_updated_for_eop_bop_sync + rows_updated_for_fwos;
END;
$function$;