--liquibase formatted sql
--changeset dodda.gowtham@impactanalytics.co:placeholder_cadence_generation stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for placeholder cadence generation
--rollback: SELECT 1


DROP FUNCTION IF EXISTS item_smart.placeholder_cadence_generation(p_product_code text, p_channels text[]);
CREATE OR REPLACE FUNCTION item_smart.placeholder_cadence_generation(p_product_code text, p_channels text[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_insert_count INT := 0;
    today_week_id_var INT;
    start_week_item_fact INT;
    end_week_item_fact INT;
    original_start_week_id_var INT;
    rows_updated_for_sync_return_inv INT := 0;
    dept_var TEXT;
    hierarchy_code_list INT[];
    wp_table_name TEXT;
    mapped_baseline_discount NUMERIC;
    mapped_clearance_date DATE;
    mapped_lead_time_var NUMERIC;
    planing_level TEXT;
    v_sql TEXT;
    mapped_moq_var NUMERIC;
    insert_new_sku_to_itemfact_sku_query TEXT;
    insert_new_sku_to_itemfact_sku_week_query TEXT;
    sync_return_inv_query TEXT;
    update_rcpts_to_zero_query TEXT;
    update_rcpt_auc_with_written_auc_query TEXT;
    update_net_sales_query TEXT;

    filters JSONB;
    filter JSONB;
    attribute_name TEXT;
    values TEXT;
    operator TEXT;
    mapped_product_code_var TEXT;
	mapped_hierarchy_code_var int;
    hierarchy_code_var INT;
	category_var text;
    mapped_l1_name_var text;
    where_clause TEXT := '';
	entry_date_var date;
	exit_date_var date;
	
	start_week_id_var INT;
   	end_week_id_var INT;

	start_week_id_var_frm_fm INT;
	start_week_id_var_frm_wp INT;
	
	iaf_table_source_name TEXT;
    iaf_table_dest_name TEXT;
    wp_table_source_name TEXT;
    wp_table_dest_name TEXT;

	insert_iaf_query text;
	insert_wp_query text;
	insert_wp_warehouse_query text;
	update_wp_warehouse_query text;
	w2d_query_text text;
	channel text;
	rows_updated_for_w2d int := 0;
	eop_bop_query_text text;
	rows_updated_for_eop_bop_sync int := 0;
	fwos_query_text text;
	rows_updated_for_fwos int := 0;

	markdown_edit_text text;
	rows_updated_for_markdown_edit INT := 0;
	reco_receipt_edit_text text;
	rows_updated_for_reco_reciept_edit INT := 0;

	insert_ph_to_itemfact_sku_query text;
	insert_ph_to_itemfact_sku_week_query text;
	itemfact_sku_table_name TEXT;
	itemfact_sku_week_table_name TEXT;

    category_var_new_sku TEXT;
	p_sub_channels text[];
	p_sub_channels_all text[];
	p_sub_channels_warehouse text[];
	p_sub_channels_rest text[];

	target_st_query_text text;

    mapped_sellable_qty int;

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
       
       -- Append the where_clause
       IF where_clause = '' THEN
           where_clause := attribute_name || ' ' || operator || ' (' || values || ')';
       ELSE
           where_clause := where_clause || ' AND ' || attribute_name || ' ' || operator || ' (' || values || ')';
       END IF;
   END LOOP;
   
   RAISE NOTICE 'where_clause : %', where_clause;

    -- Perform operations with the generated WHERE clause
    -- For example, you can use it in a dynamic query
	EXECUTE format('SELECT hierarchy_code, mapped_product_code, l1_name, entry_date, exit_date FROM item_smart.placeholders_info WHERE %s LIMIT 1', where_clause)
    INTO hierarchy_code_var, mapped_product_code_var, category_var, entry_date_var, exit_date_var;

	EXECUTE format('SELECT hierarchy_code FROM item_smart.mv_product_hierarchies_filter WHERE product_code = %L LIMIT 1', mapped_product_code_var)
    INTO mapped_hierarchy_code_var;

    EXECUTE format('SELECT l1_name FROM item_smart.mv_product_hierarchies_filter WHERE product_code = %L LIMIT 1', mapped_product_code_var)
    INTO mapped_l1_name_var;

    --replacing spaces
    category_var_new_sku := category_var;
	category_var := REPLACE(category_var, ' ', '');

    mapped_l1_name_var := REPLACE(mapped_l1_name_var, ' ', '');

	iaf_table_source_name := 'item_smart.iaf_master_' || lower(mapped_l1_name_var);
	wp_table_source_name := 'item_smart.wp_master_' || lower(mapped_l1_name_var);
	iaf_table_dest_name := 'item_smart.iaf_master_' || lower(category_var);
	wp_table_dest_name := 'item_smart.wp_master_' || lower(category_var);
    wp_table_name := wp_table_dest_name;

	RAISE NOTICE 'IAF TABLE SOURCE: %', iaf_table_source_name;
	RAISE NOTICE 'WP TABLE SOURCE: %', wp_table_source_name;
	RAISE NOTICE 'IAF TABLE DEST: %', iaf_table_dest_name;
	RAISE NOTICE 'WP TABLE DEST: %', wp_table_dest_name;
	
	start_week_id_var_frm_fm = item_smart.get_lag_week(0, entry_date_var);

    --get min week from wp
	EXECUTE format('SELECT MIN(current_week) FROM %s WHERE hierarchy_code = %L LIMIT 1', 
    wp_table_source_name, 
    mapped_hierarchy_code_var
	) INTO start_week_id_var_frm_wp;

	RAISE NOTICE 'FROM WP %', start_week_id_var_frm_wp;
	RAISE NOTICE 'FROM FM %', start_week_id_var_frm_fm;

	-- get max of two values
	SELECT GREATEST(start_week_id_var_frm_fm, start_week_id_var_frm_wp) INTO start_week_id_var;
    original_start_week_id_var := start_week_id_var;

	RAISE NOTICE 'launch week_id %', start_week_id_var;
	
	-- Calculate end_week_id based on exit_date
    IF exit_date_var IS NOT NULL THEN
        -- Calculate end_week_id + 26 weeks if exit_date is provided
        --    SELECT item_smart.get_lead_week(26, exit_date_var) INTO end_week_id_var;
        SELECT MAX(fiscal_year_week) INTO end_week_id_var
        FROM global.fiscal_date_mapping;

        IF end_week_id_var IS NULL THEN
            RAISE EXCEPTION 'No week ID found for exit_date: %', exit_date_var;
        END IF;
    ELSE
        -- If no exit_date is provided, set end_week_id to the maximum week available
        SELECT MAX(fiscal_year_week) INTO end_week_id_var
        FROM global.fiscal_date_mapping;

        IF end_week_id_var IS NULL THEN
            RAISE EXCEPTION 'No maximum week ID available in fiscal mapping table.';
        END IF;
    END IF;

    -- Debugging: Display the results
    RAISE NOTICE 'Hierarchy code: %', hierarchy_code_var;
	RAISE NOTICE 'Mapped Hierarchy code: %', mapped_hierarchy_code_var;
    RAISE NOTICE 'Mapped product code: %', mapped_product_code_var;
	RAISE NOTICE 'Category: %', category_var;
	RAISE NOTICE 'Category Mapped: %', mapped_l1_name_var;
	RAISE NOTICE 'Launch: %', entry_date_var;
    RAISE NOTICE 'Exit: %', exit_date_var;
	RAISE NOTICE 'launch week_id %', start_week_id_var;
	RAISE NOTICE 'end week_id %', end_week_id_var;

    --select distinct sub_channel from iaf_master
    EXECUTE format('SELECT ARRAY(SELECT DISTINCT sub_channel FROM %s)', iaf_table_dest_name)
    INTO p_sub_channels_all;

    RAISE NOTICE 'p_sub_channels_all: %', p_sub_channels_all;

    --now make two separate arrays from p_sub_channels_all the 'EComm_warehouse','Indirect_warehouse','Store_warehouse' and the rest
    p_sub_channels_warehouse := ARRAY['Ecom_warehouse','Indirect_warehouse','Store_warehouse']; 
    p_sub_channels_rest := ARRAY(
        SELECT unnest FROM unnest(p_sub_channels_all) 
        WHERE unnest NOT IN ('Ecom_warehouse', 'Indirect_warehouse','Store_warehouse')
    );

    RAISE NOTICE 'p_sub_channels_warehouse: %', p_sub_channels_warehouse;
    RAISE NOTICE 'p_sub_channels_rest: %', p_sub_channels_rest;

	SELECT fiscal_year_week INTO today_week_id_var FROM global.fiscal_date_mapping where calendar_date = now()::date;

	itemfact_sku_table_name := 'item_smart.itemfact_sku_' || category_var;
	itemfact_sku_week_table_name := 'item_smart.itemfact_sku_week_' || category_var;

	SELECT GREATEST(start_week_id_var_frm_fm, today_week_id_var) INTO start_week_item_fact;
	
	SELECT LEAST(end_week_id_var, today_week_id_var) INTO end_week_item_fact;

	BEGIN
        EXECUTE format('SELECT sellable_qty FROM %s WHERE hierarchy_code = %L LIMIT 1', 
            itemfact_sku_table_name, mapped_hierarchy_code_var)
        INTO  mapped_sellable_qty;
        
        -- Log values but continue even if not found
        IF mapped_lead_time_var IS NULL OR mapped_baseline_discount IS NULL OR mapped_clearance_date IS NULL THEN
            RAISE WARNING 'mapped_lead_time_var, mapped_baseline_discount, mapped_clearance_date not found for mapped hierarchy: %', mapped_hierarchy_code_var;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error retrieving lead time, baseline discount, and clearance date: %', SQLERRM;
    END;



    
    -- Insert data into itemfact_sku table
    insert_new_sku_to_itemfact_sku_query := format('
        INSERT INTO %s (
            dept, hierarchy_code, launch_date, exit_date,  sellable_qty
        )
        SELECT 
            l1_name, hierarchy_code, entry_date, exit_date, %L
        FROM item_smart.placeholders_info
        WHERE 
            hierarchy_code = %s;
    ',
        itemfact_sku_table_name,
         mapped_sellable_qty,
        hierarchy_code_var
    );

    RAISE NOTICE 'insert_new_sku_to_itemfact_sku_query: %', insert_new_sku_to_itemfact_sku_query;
    
    BEGIN
        EXECUTE insert_new_sku_to_itemfact_sku_query;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error inserting data into itemfact_sku table: %', SQLERRM;
        -- Continue processing despite error
    END;

    -- Insert data into itemfact_sku_week table
    insert_new_sku_to_itemfact_sku_week_query := format('
        INSERT INTO %s (
            dept, hierarchy_code, current_week, receipt_split
        )
        SELECT 
            dept, %s, current_week, receipt_split
        FROM %s
        WHERE 
            hierarchy_code = %s AND
            current_week BETWEEN %s AND %s;
    ',
        itemfact_sku_week_table_name,
        hierarchy_code_var,
        itemfact_sku_week_table_name,
        mapped_hierarchy_code_var,
        start_week_item_fact,
        end_week_item_fact
    );

    RAISE NOTICE 'insert_new_sku_to_itemfact_sku_week_query: %', insert_new_sku_to_itemfact_sku_week_query;
    
    BEGIN
        EXECUTE insert_new_sku_to_itemfact_sku_week_query;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error inserting data into itemfact_sku_week table: %', SQLERRM;
        -- Continue processing despite error
    END;

    -- Construct the INSERT query dynamically for IAF table (BAL columns)
 	insert_iaf_query := format('
	 INSERT INTO %s (
            hierarchy_code, compared_week, current_week, channel, sub_channel, dept, 
            written_sales_dollars, written_auc, auc_first, auc_landed,
            fwos, discount_perc, is_active, written_sales_units, written_air, written_dr_perc,
            written_imu, written_sales_cost, written_gm_perc, written_gm_dollar, written_aur,
            discount, scenario, actualised, created_at, updated_at, created_by, updated_by,
            revenue, fully_loaded_cost
        )
        SELECT 
            %s, compared_week, current_week, channel, sub_channel, %L as dept,
            written_sales_dollars, written_auc, auc_first, auc_landed,
            fwos, discount_perc, is_active, written_sales_units, written_air, written_dr_perc,
            written_imu, written_sales_cost, written_gm_perc, written_gm_dollar, written_aur,
            discount, scenario, actualised, NOW() AS created_at, NOW() AS updated_at, created_by, updated_by,
            revenue, fully_loaded_cost
        FROM %s
        WHERE 
            hierarchy_code = %s AND 
            current_week between %s and %s AND
            channel = ANY(%L) and sub_channel = ANY(%L);
	',
		iaf_table_dest_name,
		hierarchy_code_var,
        category_var_new_sku,
		iaf_table_source_name,
		mapped_hierarchy_code_var,
		start_week_id_var, -- Start week
        end_week_id_var,   -- End week
		p_channels,
		p_sub_channels_rest
		);
	
	RAISE NOTICE 'Insert IAF Query: %', insert_iaf_query;

	EXECUTE insert_iaf_query;
    GET DIAGNOSTICS v_insert_count = ROW_COUNT;

    -- delete existing data from wp before copying from iaf to wp
	EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %s', wp_table_dest_name, hierarchy_code_var);

	-- WP seeding (BAL columns)
	insert_wp_query := format('
	 INSERT INTO %s (
            hierarchy_code, compared_week, current_week, channel, sub_channel, dept, 
            written_sales_dollars, written_auc, auc_first, auc_landed,
            fwos, discount_perc, is_active, written_sales_units, written_air, written_dr_perc,
            written_imu, written_sales_cost, written_gm_perc, written_gm_dollar, written_aur,
            discount, scenario, actualised, created_at, updated_at, created_by, updated_by,
            revenue, fully_loaded_cost
        )
        SELECT 
            hierarchy_code, compared_week, current_week, channel, sub_channel, dept,
            written_sales_dollars, written_auc, auc_first, auc_landed,
            fwos, discount_perc, is_active, written_sales_units, written_air, written_dr_perc,
            written_imu, written_sales_cost, written_gm_perc, written_gm_dollar, written_aur,
            discount, scenario, actualised, NOW() AS created_at, NOW() AS updated_at, created_by, updated_by,
            revenue, fully_loaded_cost
        FROM %s
        WHERE 
            hierarchy_code = %s AND 
            current_week between %s and %s AND
            channel = ANY(%L) and sub_channel = ANY(%L);
	',
		wp_table_dest_name,
		iaf_table_dest_name,
		hierarchy_code_var,
		start_week_id_var, -- Start week
        end_week_id_var,   -- End week
		p_channels,
		p_sub_channels_rest
		);

	RAISE NOTICE 'Insert WP Query: %', insert_wp_query;

	EXECUTE insert_wp_query;

    insert_wp_warehouse_query := format('
        INSERT INTO %s (
                dept, channel, current_week, hierarchy_code, created_by, 
                created_at, updated_by, sub_channel 
            )
            SELECT 
                dept, channel, current_week, %s, created_by, 
                NOW() AS created_at, updated_by, sub_channel
            FROM %s
            WHERE 
                hierarchy_code = %s AND 
                current_week between %s and %s AND
                channel = ANY(%L) and sub_channel = ANY(%L);
        ',
            wp_table_name,
            hierarchy_code_var,
            wp_table_name,
            mapped_hierarchy_code_var,
            start_week_id_var, -- Start week
            end_week_id_var ,  -- End week
            p_channels,
            p_sub_channels_warehouse
            );
--
	RAISE NOTICE 'Insert WP Query Warehouse: %',  insert_wp_warehouse_query;

	EXECUTE insert_wp_warehouse_query;

    --update bop_units as 0 
	update_wp_warehouse_query := format('
        UPDATE %s
        SET 
            bop_units = 0,

            updated_at = NOW()
        WHERE 
            hierarchy_code = %s AND 
            current_week = %s AND
            channel = ANY(%L) and sub_channel = ANY(%L);
        ',
        wp_table_name,
        hierarchy_code_var,
        start_week_id_var,       -- Start week
        p_channels,
        p_sub_channels_warehouse
        );
--
	RAISE NOTICE 'Update WP Query Warehouse: %',  update_wp_warehouse_query;

	EXECUTE update_wp_warehouse_query;

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
            updated_at = NOW()
        WHERE 
            hierarchy_code = %s AND 
            current_week BETWEEN %s AND %s AND
            channel = ANY(%L) and sub_channel = ANY(%L);
    ',
        wp_table_name,
        hierarchy_code_var,
        original_start_week_id_var,
        end_week_id_var,
        p_channels,
		p_sub_channels_warehouse
    );

	RAISE NOTICE 'Update WP Query Warehouse: %',  update_rcpts_to_zero_query;

	EXECUTE update_rcpts_to_zero_query;

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
            total_receipt_auc = source_data.written_auc,
            updated_at = NOW()
        FROM source_data
        WHERE 
            target.hierarchy_code = %s AND
            target.current_week = source_data.current_week AND
            target.channel = ANY(%L) AND target.sub_channel = ANY(%L);
    ',
        wp_table_name,
        mapped_hierarchy_code_var,
        original_start_week_id_var,
        end_week_id_var,
        wp_table_name,
        hierarchy_code_var,
        p_channels,
		p_sub_channels_warehouse
    );

    RAISE NOTICE 'Update AUC Query: %', update_rcpt_auc_with_written_auc_query;
	EXECUTE update_rcpt_auc_with_written_auc_query;

    -- balsam doesnt have net sales units, net sales dollars TBD so we can skip net sales update

    -- Insert into sku_st_info table for the hierarchy_code and fiscal years
target_st_query_text := format('
    WITH week_range AS (
        SELECT 
            MIN(current_week) as min_week,
            MAX(current_week) as max_week
        FROM %s 
        WHERE hierarchy_code = %L
    ),
    fiscal_years AS (
        SELECT DISTINCT fdm.fiscal_year
        FROM global.fiscal_date_mapping fdm
        CROSS JOIN week_range wr
        WHERE fdm.fiscal_year_week BETWEEN wr.min_week AND wr.max_week
    )
    INSERT INTO item_smart.sku_st_info (hierarchy_code, dept, "year", st_perc)
    SELECT 
        %L as hierarchy_code,
        %L as dept,
        fy.fiscal_year as "year",
        0 as st_perc
    FROM fiscal_years fy
', 
    wp_table_name,
    hierarchy_code_var,
    hierarchy_code_var,
    category_var_new_sku
);

EXECUTE target_st_query_text;

RAISE NOTICE 'Inserted sku_st_info records for hierarchy_code: % and fiscal years', hierarchy_code_var;
    
    

    RAISE NOTICE 'Function completed successfully. Records inserted: %', v_insert_count;
    
    RETURN v_insert_count;

END;
$function$;