--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:placeholder_cadence_generation runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:placeholder_cadence_generation_v3-fix
--comment: initial changeset for placeholder_cadence_generation_v3-fix-1
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.placeholder_cadence_generation(text, text[]);

CREATE OR REPLACE FUNCTION item_smart.placeholder_cadence_generation(p_product_code text, p_channels text[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_total_insert_count INT := 0;
    
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
    
    start_week_id_var INT;
    end_week_id_var INT;
    
    wp_table_name TEXT;
    iaf_table_name TEXT;
    insert_iaf_query TEXT;
    insert_wp_query TEXT;
    update_wp_warehouse_query TEXT;
    
    is_special_order_condition TEXT := '';
    planing_level TEXT := 'sku';
    eop_bop_query_text TEXT;
    rows_updated_for_eop_bop_sync INT := 0;
    fwos_query_text TEXT;
    rows_updated_for_fwos INT := 0;
    reco_receipt_edit_text TEXT;
    rows_updated_for_reco_reciept_edit INT := 0;

    insert_ph_to_itemfact_sku_query TEXT;
    insert_ph_to_itemfact_sku_week_query TEXT;
    itemfact_sku_table_name TEXT;
    itemfact_sku_week_table_name TEXT;

    mapped_lead_time_var TEXT;
    mapped_moq_var TEXT;
    hierarchy_code_list INTEGER[];

    iaf_table_source_name TEXT;
    iaf_table_dest_name TEXT;
    wp_table_source_name TEXT;
    wp_table_dest_name TEXT;
    dept_var_uncleaned TEXT;

    update_ph_info_query TEXT;
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
    EXECUTE format('SELECT hierarchy_code, mapped_product_code, l0_name, entry_date, 
	exit_date FROM item_smart.placeholders_info WHERE %s and l0_name = ''USA'' and l1_name = ANY(%L) LIMIT 1', where_clause, p_channels)
    INTO hierarchy_code_var, mapped_product_code_var, dept_var, entry_date_var, exit_date_var;

    EXECUTE format('SELECT hierarchy_code, l0_name FROM item_smart.mv_product_hierarchies_filter 
	WHERE style = %L AND country = ''USA'' and l1_name = ANY(%L) LIMIT 1', mapped_product_code_var, p_channels)
    INTO mapped_hierarchy_code_var, mapped_l0_name_var;

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
    itemfact_sku_table_name := 'item_smart.itemfact_sku';
    itemfact_sku_week_table_name := 'item_smart.itemfact_sku_week';

    -- Delete existing data from wp,iaf,itemfact_sku_week before copying from iaf to wp
    EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %s', wp_table_dest_name, hierarchy_code_var);
    EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %s', iaf_table_dest_name, hierarchy_code_var); 
    EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %s', itemfact_sku_week_table_name, hierarchy_code_var); 
    EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %s', itemfact_sku_table_name, hierarchy_code_var); 

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
        EXECUTE format('SELECT MAX(current_week) FROM %s WHERE hierarchy_code = %L LIMIT 1', wp_table_source_name, mapped_hierarchy_code_var)
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
            written_auc, written_gm_perc, written_gm_dollar, written_dr_perc, scenario, actualised, revenue, discount, true AS is_active
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
        start_week_id_var,       -- Start week
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

    -- Get itemfact sku details into variables
    EXECUTE format('SELECT vendor_dc_lead_time, moq FROM %s WHERE hierarchy_code = %L LIMIT 1', itemfact_sku_table_name, mapped_hierarchy_code_var)
    INTO mapped_lead_time_var, mapped_moq_var;

    RAISE NOTICE 'Mapped Lead Time: %', mapped_lead_time_var;
    RAISE NOTICE 'Mapped MOQ: %', mapped_moq_var;

    -- Insert placeholder to itemfact_sku 
    insert_ph_to_itemfact_sku_query := format('
        INSERT INTO %s (
            dept, hierarchy_code, launch_date, exit_date, vendor_dc_lead_time, moq
        )
        SELECT 
            l0_name, hierarchy_code, entry_date, exit_date, %L, %L
        FROM item_smart.placeholders_info
        WHERE 
            hierarchy_code = %s;
    ',
        itemfact_sku_table_name,
        mapped_lead_time_var, mapped_moq_var,
        hierarchy_code_var
    );

    RAISE NOTICE 'Insert PH Query: %', insert_ph_to_itemfact_sku_query;
    EXECUTE insert_ph_to_itemfact_sku_query;

    -- Insert placeholder to itemfact_sku_week
    insert_ph_to_itemfact_sku_week_query := format('
        INSERT INTO %s (
            dept, hierarchy_code, current_week, target_fwos,reco_rcpt_week_flag
        )
        SELECT 
            %L as dept, %s as hierarchy_code, current_week, target_fwos, reco_rcpt_week_flag
        FROM %s
        WHERE 
            hierarchy_code = %s AND
            current_week BETWEEN %s AND %s;
    ',
        itemfact_sku_week_table_name,
        dept_var_uncleaned,
        hierarchy_code_var,
        itemfact_sku_week_table_name,
        mapped_hierarchy_code_var,
        start_week_id_var,
        end_week_id_var
    );

    RAISE NOTICE 'Insert PH Query: %', insert_ph_to_itemfact_sku_week_query;
    EXECUTE insert_ph_to_itemfact_sku_week_query;


    update_ph_info_query := format('
        UPDATE item_smart.placeholders_info
        SET updated_at = NOW()
        WHERE hierarchy_code = %s
    ', hierarchy_code_var);
    RAISE NOTICE 'Called update ph info';
    EXECUTE update_ph_info_query;

    RETURN v_total_insert_count + rows_updated_for_eop_bop_sync + rows_updated_for_fwos;
END;
$function$;