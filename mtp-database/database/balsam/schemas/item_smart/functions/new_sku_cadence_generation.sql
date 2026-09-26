--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:new_sku_cadence_generation_v2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:new_sku_cadence_generation_v2
--comment: initial changeset for new_sku_cadence_generation_v2
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.new_sku_cadence_generation(p_product_code text, p_channels text[]);

CREATE OR REPLACE FUNCTION item_smart.new_sku_cadence_generation(p_product_code text, p_channels text[])
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
	recom_units_supply_query_text text;
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

	fiscal_years INTEGER[];

	v_min_week INTEGER;
    v_max_week INTEGER;

	v_sdate DATE;
    v_edate DATE;
	v_fiscal_year INT;
   

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

    -- Perform operations with the generated WHERE clause - NOTE: using new_skus table
	EXECUTE format('SELECT hierarchy_code, mapped_product_code, l1_name, launch_date, exit_date FROM item_smart.new_skus WHERE %s LIMIT 1', where_clause)
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

    --now make two separate arrays from p_sub_channels_all the 'EComm_warehouse','Wholesale_warehouse' and the rest
    p_sub_channels_warehouse := ARRAY['Ecom_warehouse','Indirect_warehouse', 'Store_warehouse']; 
    p_sub_channels_rest := ARRAY(
        SELECT unnest FROM unnest(p_sub_channels_all) 
        WHERE unnest NOT IN ('Ecom_warehouse','Indirect_warehouse', 'Store_warehouse')
    );

    RAISE NOTICE 'p_sub_channels_warehouse: %', p_sub_channels_warehouse;
    RAISE NOTICE 'p_sub_channels_rest: %', p_sub_channels_rest;

	SELECT fiscal_year_week INTO today_week_id_var FROM global.fiscal_date_mapping where calendar_date = now()::date;

	itemfact_sku_table_name := 'item_smart.itemfact_sku_' || category_var;
	itemfact_sku_week_table_name := 'item_smart.itemfact_sku_week_' || category_var;

	SELECT GREATEST(start_week_id_var_frm_fm, today_week_id_var) INTO start_week_item_fact;
	
	SELECT LEAST(end_week_id_var, today_week_id_var) INTO end_week_item_fact;

    -- Ensure valid week range for itemfact tables
    IF start_week_item_fact > end_week_item_fact THEN
        RAISE NOTICE 'Invalid week range for itemfact: start_week (%) > end_week (%). Skipping itemfact_sku_week insert.', start_week_item_fact, end_week_item_fact;
        start_week_item_fact := end_week_item_fact; -- Set them equal to avoid the range issue
    END IF;

    RAISE NOTICE 'ItemFact week range: % to %', start_week_item_fact, end_week_item_fact;

	BEGIN
        EXECUTE format('SELECT lead_time, baseline_discount, clearance_date FROM %s WHERE hierarchy_code = %L LIMIT 1', 
            itemfact_sku_table_name, mapped_hierarchy_code_var)
        INTO mapped_lead_time_var, mapped_baseline_discount, mapped_clearance_date;
        
        -- Log values but continue even if not found
        IF mapped_lead_time_var IS NULL OR mapped_baseline_discount IS NULL OR mapped_clearance_date IS NULL THEN
            RAISE WARNING 'mapped_lead_time_var, mapped_baseline_discount, mapped_clearance_date not found for mapped hierarchy: %', mapped_hierarchy_code_var;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error retrieving lead time, baseline discount, and clearance date: %', SQLERRM;
    END;

    -- Insert data into itemfact_sku table (with duplicate handling) - NOTE: using new_skus table
    insert_new_sku_to_itemfact_sku_query := format('
        INSERT INTO %s (
            dept, hierarchy_code, launch_date, exit_date, lead_time, baseline_discount, clearance_date
        )
        SELECT 
            l1_name, hierarchy_code, launch_date, exit_date, %L, %L, %L
        FROM item_smart.new_skus
        WHERE 
            hierarchy_code = %s
        ON CONFLICT (dept, hierarchy_code) DO UPDATE SET
            launch_date = EXCLUDED.launch_date,
            exit_date = EXCLUDED.exit_date,
            lead_time = EXCLUDED.lead_time,
            baseline_discount = EXCLUDED.baseline_discount,
            clearance_date = EXCLUDED.clearance_date;
    ',
        itemfact_sku_table_name,
        mapped_lead_time_var, mapped_baseline_discount, mapped_clearance_date,
        hierarchy_code_var
    );

    RAISE NOTICE 'insert_new_sku_to_itemfact_sku_query: %', insert_new_sku_to_itemfact_sku_query;
    
    BEGIN
        EXECUTE insert_new_sku_to_itemfact_sku_query;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error inserting data into itemfact_sku table: %', SQLERRM;
        -- Continue processing despite error
    END;

    -- Insert data into itemfact_sku_week table (only if valid week range)
    IF start_week_item_fact <= end_week_item_fact THEN
        insert_new_sku_to_itemfact_sku_week_query := format('
            INSERT INTO %s (
                dept, hierarchy_code, current_week, purchase_status, fwos, lead_time, damage_rate, moq
            )
            SELECT 
                dept, %s, current_week, purchase_status, fwos, lead_time, damage_rate, moq
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
    ELSE
        RAISE NOTICE 'Skipping itemfact_sku_week insert due to invalid week range';
    END IF;

        -- Construct the INSERT query dynamically for IAF table (BAL columns) with eligibility check
	insert_iaf_query := format('
	 WITH base_records AS (
            SELECT DISTINCT
                iaf.*
            FROM %s iaf
            WHERE 
                iaf.hierarchy_code = %s AND 
                iaf.current_week between %s and %s AND
                iaf.channel = ANY(%L) and iaf.sub_channel = ANY(%L)
        ),
        eligible_records AS (
            SELECT 
                br.*,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 
                        FROM item_smart.sku_subchannel_eligibility elig
                        INNER JOIN global.fiscal_date_mapping fdm 
                            ON fdm.fiscal_year_week = br.current_week
                        WHERE elig.sku = (SELECT item FROM item_smart.new_skus WHERE hierarchy_code = %s LIMIT 1)
                            AND elig.channel = br.channel 
                            AND elig.sub_channel = br.sub_channel
                            AND fdm.calendar_date >= elig.eligibility_start_date 
                            AND fdm.calendar_date <= COALESCE(elig.eligibility_end_date, ''9999-12-31''::date)
                    ) THEN TRUE 
                    ELSE FALSE 
                END AS is_eligible
            FROM base_records br
        )
        INSERT INTO %s (
            hierarchy_code, compared_week, current_week, channel, sub_channel, dept, 
            written_sales_dollars, written_auc, auc_first, auc_landed,
            fwos, discount_perc, is_active, written_sales_units, written_air, written_dr_perc,
            written_imu, written_sales_cost, written_gm_perc, written_gm_dollar, written_aur,
            discount, scenario, actualised, created_at, updated_at, created_by, updated_by,
            revenue, fully_loaded_cost
        )
        SELECT 
            %s, er.compared_week, er.current_week, er.channel, er.sub_channel, %L as dept,
            CASE WHEN er.is_eligible THEN er.written_sales_dollars ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_auc ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.auc_first ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.auc_landed ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.fwos ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.discount_perc ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.is_active ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_sales_units ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_air ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_dr_perc ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_imu ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_sales_cost ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_gm_perc ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_gm_dollar ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_aur ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.discount ELSE NULL END,
            er.scenario, er.actualised, NOW() AS created_at, NOW() AS updated_at, er.created_by, er.updated_by,
            CASE WHEN er.is_eligible THEN er.revenue ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.fully_loaded_cost ELSE NULL END
        FROM eligible_records er;
	',
		iaf_table_source_name,
		mapped_hierarchy_code_var,
		start_week_id_var, -- Start week
        end_week_id_var,   -- End week
		p_channels,
		p_sub_channels_rest,
		hierarchy_code_var,
		iaf_table_dest_name,
		hierarchy_code_var,
        category_var_new_sku
		);
	
	RAISE NOTICE 'Insert IAF Query: %', insert_iaf_query;

    -- Delete existing IAF records for the new SKU before insertion to prevent duplicates
    EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %s', iaf_table_dest_name, hierarchy_code_var);
    
	EXECUTE insert_iaf_query;
    GET DIAGNOSTICS v_insert_count = ROW_COUNT;

    -- delete existing data from wp before copying from iaf to wp
	EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %s', wp_table_dest_name, hierarchy_code_var);

	-- WP seeding (BAL columns) with eligibility check
	insert_wp_query := format('
	 WITH base_records AS (
            SELECT DISTINCT
                iaf.*
            FROM %s iaf
            WHERE 
                iaf.hierarchy_code = %s AND 
                iaf.current_week between %s and %s AND
                iaf.channel = ANY(%L) and iaf.sub_channel = ANY(%L)
        ),
        eligible_records AS (
            SELECT 
                br.*,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 
                        FROM item_smart.sku_subchannel_eligibility elig
                        INNER JOIN global.fiscal_date_mapping fdm 
                            ON fdm.fiscal_year_week = br.current_week
                        WHERE elig.sku = (SELECT item FROM item_smart.new_skus WHERE hierarchy_code = %s LIMIT 1)
                            AND elig.channel = br.channel 
                            AND elig.sub_channel = br.sub_channel
                            AND fdm.calendar_date >= elig.eligibility_start_date 
                            AND fdm.calendar_date <= COALESCE(elig.eligibility_end_date, ''9999-12-31''::date)
                    ) THEN TRUE 
                    ELSE FALSE 
                END AS is_eligible
            FROM base_records br
        )
        INSERT INTO %s (
            hierarchy_code, compared_week, current_week, channel, sub_channel, dept, 
            written_sales_dollars, written_auc, auc_first, auc_landed,
            fwos, discount_perc, is_active, written_sales_units, written_air, written_dr_perc,
            written_imu, written_sales_cost, written_gm_perc, written_gm_dollar, written_aur,
            discount, scenario, actualised, created_at, updated_at, created_by, updated_by,
            revenue, fully_loaded_cost
        )
        SELECT 
            er.hierarchy_code, er.compared_week, er.current_week, er.channel, er.sub_channel, er.dept,
            CASE WHEN er.is_eligible THEN er.written_sales_dollars ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_auc ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.auc_first ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.auc_landed ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.fwos ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.discount_perc ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.is_active ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_sales_units ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_air ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_dr_perc ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_imu ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_sales_cost ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_gm_perc ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_gm_dollar ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.written_aur ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.discount ELSE NULL END,
            er.scenario, er.actualised, NOW() AS created_at, NOW() AS updated_at, er.created_by, er.updated_by,
            CASE WHEN er.is_eligible THEN er.revenue ELSE NULL END,
            CASE WHEN er.is_eligible THEN er.fully_loaded_cost ELSE NULL END
        FROM eligible_records er;
	',
		iaf_table_dest_name,
		hierarchy_code_var,
		start_week_id_var, -- Start week
        end_week_id_var,   -- End week
		p_channels,
		p_sub_channels_rest,
		hierarchy_code_var,
		wp_table_dest_name
		);

	RAISE NOTICE 'Insert WP Query: %', insert_wp_query;

	EXECUTE insert_wp_query;

    -- Insert WP warehouse query with eligibility check
    insert_wp_warehouse_query := format('
        INSERT INTO %s (
                dept, channel, current_week, hierarchy_code, created_by, 
                created_at, updated_by, sub_channel , actualised
            )
            SELECT 
                wp.dept, wp.channel, wp.current_week, %s, wp.created_by, 
                NOW() AS created_at, wp.updated_by, wp.sub_channel, false AS actualised
            FROM %s wp
            LEFT JOIN item_smart.sku_subchannel_eligibility elig 
                ON elig.sku = (SELECT item FROM item_smart.new_skus WHERE hierarchy_code = %s LIMIT 1)
                AND elig.channel = wp.channel 
                AND elig.sub_channel = wp.sub_channel
            WHERE 
                wp.hierarchy_code = %s AND 
                wp.current_week between %s and %s AND
                wp.channel = ANY(%L) and wp.sub_channel = ANY(%L) AND
                (elig.sku IS NULL OR EXISTS (
                    SELECT 1 FROM global.fiscal_date_mapping fdm 
                    WHERE fdm.fiscal_year_week = wp.current_week 
                    AND fdm.calendar_date >= elig.eligibility_start_date 
                    AND fdm.calendar_date <= COALESCE(elig.eligibility_end_date, ''9999-12-31''::date)
                ));
        ',
            wp_table_name,
            hierarchy_code_var,
            wp_table_name,
            hierarchy_code_var,
            mapped_hierarchy_code_var,
            start_week_id_var, -- Start week
            end_week_id_var ,  -- End week
            p_channels,
            p_sub_channels_warehouse
            );

	RAISE NOTICE 'Insert WP Query Warehouse: %',  insert_wp_warehouse_query;

	EXECUTE insert_wp_warehouse_query;

    --update bop_units as 0 
	update_wp_warehouse_query := format('
        UPDATE %s AS wp
        SET 
            bop_units = 0,
            updated_at = NOW()
        WHERE 
            wp.hierarchy_code = %s AND 
            wp.current_week = %s AND
            wp.channel = ANY(%L) and wp.sub_channel = ANY(%L) AND
            EXISTS (
                SELECT 1 
                FROM item_smart.sku_subchannel_eligibility elig 
                WHERE 
                    elig.sku = (SELECT item FROM item_smart.new_skus WHERE hierarchy_code = %s LIMIT 1) AND
                    elig.channel = wp.channel AND 
                   
                    EXISTS (
                        SELECT 1 FROM global.fiscal_date_mapping fdm 
                        WHERE fdm.fiscal_year_week = wp.current_week 
                        AND fdm.calendar_date >= elig.eligibility_start_date 
                        AND fdm.calendar_date <= COALESCE(elig.eligibility_end_date, ''9999-12-31''::date)
                    )
            );
        ',
        wp_table_name,
        hierarchy_code_var,
        start_week_id_var,       -- Start week
        p_channels,
        p_sub_channels_warehouse,
        hierarchy_code_var
        );

	RAISE NOTICE 'Update WP Query Warehouse: %',  update_wp_warehouse_query;

	EXECUTE update_wp_warehouse_query;

    update_rcpts_to_zero_query := format('
        UPDATE %s AS wp
        SET 
            total_receipt_cost = 0,
            total_receipt_units = 0,
			total_receipt_auc = 0,
            on_order_placed_total = 0,
            on_order_placed_total_unit = 0,
            on_order_unplaced_total = 0,
            on_order_unplaced_total_unit = 0,
            on_order_unplaced_total_cost = 0,
            recomm_receipt_units = 0,
			warranty_units = 0,
			warranty_dollar = 0,
			zero_dollar_orders_units = 0,
			zero_dollar_orders_dollar = 0,
			container_count = 0,
			rtp_units = 0,
			rtp_dollar = 0,
			rtp_sales_units_perc = 0,
			warranty_sales_units_perc = 0,
			zero_dollar_orders_perc = 0,
			
            updated_at = NOW()
        WHERE 
            wp.hierarchy_code = %s AND 
            wp.current_week BETWEEN %s AND %s AND
            wp.channel = ANY(%L) and wp.sub_channel = ANY(%L) AND
            EXISTS (
                SELECT 1 
                FROM item_smart.sku_subchannel_eligibility elig 
                WHERE 
                    elig.sku = (SELECT item FROM item_smart.new_skus WHERE hierarchy_code = %s LIMIT 1) AND
                    elig.channel = wp.channel AND 
                   
                    EXISTS (
                        SELECT 1 FROM global.fiscal_date_mapping fdm 
                        WHERE fdm.fiscal_year_week = wp.current_week 
                        AND fdm.calendar_date >= elig.eligibility_start_date 
                        AND fdm.calendar_date <= COALESCE(elig.eligibility_end_date, ''9999-12-31''::date)
                    )
            );
    ',
        wp_table_name,
        hierarchy_code_var,
        original_start_week_id_var,
        end_week_id_var,
        p_channels,
        p_sub_channels_warehouse,
        hierarchy_code_var
    );

	RAISE NOTICE 'Update Receipts to Zero Query: %',  update_rcpts_to_zero_query;

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
            target.channel = ANY(%L) AND target.sub_channel = ANY(%L) AND
            EXISTS (
                SELECT 1 
                FROM item_smart.sku_subchannel_eligibility elig 
                WHERE 
                    elig.sku = (SELECT item FROM item_smart.new_skus WHERE hierarchy_code = %s LIMIT 1) AND
                    elig.channel = target.channel AND 
                    elig.sub_channel = target.sub_channel AND
                    EXISTS (
                        SELECT 1 FROM global.fiscal_date_mapping fdm 
                        WHERE fdm.fiscal_year_week = target.current_week 
                        AND fdm.calendar_date >= elig.eligibility_start_date 
                        AND fdm.calendar_date <= COALESCE(elig.eligibility_end_date, ''9999-12-31''::date)
                    )
            );
    ',
        wp_table_name,
        mapped_hierarchy_code_var,
        original_start_week_id_var,
        end_week_id_var,
        wp_table_name,
        hierarchy_code_var,
        p_channels,
		p_sub_channels_warehouse,
        hierarchy_code_var
    );

    RAISE NOTICE 'Update AUC Query: %', update_rcpt_auc_with_written_auc_query;
	EXECUTE update_rcpt_auc_with_written_auc_query;


	--

	 -- Build and execute query to get min and max current_week
    v_sql := format(
        'SELECT MIN(current_week), MAX(current_week) FROM %s WHERE hierarchy_code = %L',
        wp_table_dest_name,
        hierarchy_code_var
    );
    
    EXECUTE v_sql INTO v_min_week, v_max_week;
    
    -- Get fiscal years using the function
   SELECT item_smart.get_fiscal_years_array(v_min_week, v_max_week) INTO fiscal_years;

	RAISE NOTICE 'FISCAL YEARS: %', fiscal_years;

	--eop bop sync

	-- Sync EOP/BOP values
	hierarchy_code_list := ARRAY[hierarchy_code_var];
    BEGIN
        eop_bop_query_text := format('SELECT item_smart.sync_eop_bop_v3(%L, %L, %L, %L, %L)', 
            entry_date_var, filters, category_var, 'item', hierarchy_code_list);
        RAISE NOTICE 'Calling sync_eop_bop_v3 with query: %', eop_bop_query_text;
        EXECUTE eop_bop_query_text INTO rows_updated_for_eop_bop_sync;
        RAISE NOTICE 'Rows updated by sync_eop_bop_v3: %', rows_updated_for_eop_bop_sync;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error in sync_eop_bop_v3: %', SQLERRM;
        -- Continue processing despite error
    END;


	
	-- recommended_units_supply_v3 update

	-- Loop through each fiscal year
    FOREACH v_fiscal_year IN ARRAY fiscal_years
    LOOP
        -- Get sdate and edate for this fiscal year from the mapping table
        SELECT 
            MIN(date)::DATE,
            MAX(date)::DATE
        INTO v_sdate, v_edate
        FROM global.fiscal_date_mapping
        WHERE fiscal_year = v_fiscal_year
         ;
        
        -- Call sync_eop_bop_v3 for this fiscal year
        BEGIN
            recom_units_supply_query_text := format(
                'SELECT item_smart.recommended_units_supply_v3(%L, %L, %L, %L, %L, %L, %L)', 
                v_sdate, 
                v_edate, 
                filters, 
                p_channels,
                category_var, 
                'item', 
                hierarchy_code_list
            );
            RAISE NOTICE 'Calling recommended_units_supply_v3 for fiscal year % with query: %', v_fiscal_year, recom_units_supply_query_text;
            EXECUTE recom_units_supply_query_text INTO rows_updated_for_eop_bop_sync;
            RAISE NOTICE 'Rows updated by recommended_units_supply_v3 for fiscal year %: %', v_fiscal_year, rows_updated_for_eop_bop_sync;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error in recommended_units_supply_v3 for fiscal year %: %', v_fiscal_year, SQLERRM;
            -- Continue processing despite error
        END;
    END LOOP;


	
   -- reco_receipt_edit_v4

	-- Loop through each fiscal year
    FOREACH v_fiscal_year IN ARRAY fiscal_years
    LOOP
        -- Get sdate and edate for this fiscal year from the mapping table
        SELECT 
            MIN(date)::DATE,
            MAX(date)::DATE
        INTO v_sdate, v_edate
        FROM global.fiscal_date_mapping
        WHERE fiscal_year = v_fiscal_year
         ;
        
        -- Call sync_eop_bop_v3 for this fiscal year
        BEGIN
            recom_units_supply_query_text := format(
                'SELECT item_smart.reco_receipt_edit_v4(%L, %L, %L, %L, %L, %L)', 
                v_sdate, 
                v_edate, 
                filters, 
               
                category_var, 
                'item', 
                hierarchy_code_list
            );
            RAISE NOTICE 'Calling reco_receipt_edit_v4 for fiscal year % with query: %', v_fiscal_year, recom_units_supply_query_text;
            EXECUTE recom_units_supply_query_text INTO rows_updated_for_eop_bop_sync;
            RAISE NOTICE 'Rows updated by reco_receipt_edit_v4 for fiscal year %: %', v_fiscal_year, rows_updated_for_eop_bop_sync;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error in reco_receipt_edit_v4 for fiscal year %: %', v_fiscal_year, SQLERRM;
            -- Continue processing despite error
        END;
    END LOOP;



	

    RAISE NOTICE 'Function completed successfully. Records inserted: %', v_insert_count;
    
    RETURN v_insert_count;

END;
$function$;