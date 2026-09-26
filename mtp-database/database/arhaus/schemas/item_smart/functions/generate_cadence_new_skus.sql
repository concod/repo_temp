--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:generate_cadence_new_skus runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:generate_cadence_new_skus_updated_at_insert_fix_ignore
--comment: generate_cadence_new_skus
--rollback: SELECT 1
DROP FUNCTION IF EXISTS item_smart.generate_cadence_new_skus(_text, _text, _text);
CREATE OR REPLACE FUNCTION item_smart.generate_cadence_new_skus(p_product_codes text[], p_mapped_product_codes text[], p_channels text[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_dept TEXT;
    v_hierarchy_code INT;
    prd_dept TEXT;
    prd_hierarchy_code INT;
    v_insert_count INT := 0;
    v_total_insert_count INT := 0;
    i INT;
   	v_entry_date DATE;
    v_exit_date DATE;
    v_start_week_id INT;
   	v_end_week_id INT;
	wp_table_name TEXT;
	query_insert_wp TEXT;
	query_insert_iaf TEXT;
	query_text_delete TEXT;

BEGIN
    FOR i IN 1 .. array_length(p_product_codes, 1) LOOP
        -- Retrieve l2_name and hierarchy_code from new_skus table
        SELECT l2_name, hierarchy_code, launch_date,exit_date
        INTO v_dept, v_hierarchy_code,v_entry_date,v_exit_date
        FROM item_smart.new_skus
        WHERE product_code = p_product_codes[i] AND mapped_product_code = p_mapped_product_codes[i]
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No data found in new_skus for product_code: %', p_product_codes[i];
        END IF;

        -- Retrieve l2_name and hierarchy_code from mv_product_hierarchies_filter table
        SELECT l2_name AS dept, hierarchy_code
        INTO prd_dept, prd_hierarchy_code
        FROM item_smart.mv_product_hierarchies_filter
        WHERE product_code = p_mapped_product_codes[i];

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No data found in product mv for product_code: %', p_mapped_product_codes[i];
        END IF;
       
       
       
       -- Step 2: Calculating week_ids based on dates
       
       
       -- Get start_week_id based on entry_date for the current loop
        -- Calculate start_week_id based on entry_date
        SELECT MIN(fiscal_year_week) INTO v_start_week_id
        FROM global.fiscal_date_mapping
        WHERE calendar_date = v_entry_date;

        IF v_start_week_id IS NULL THEN
            RAISE EXCEPTION 'No week ID found for entry_date: %', v_entry_date;
        END IF;

        -- Calculate end_week_id based on exit_date
        IF v_exit_date IS NOT NULL THEN
            -- Calculate end_week_id + 26 weeks if exit_date is provided
            SELECT MAX(fiscal_year_week) + 26 INTO v_end_week_id
            FROM global.fiscal_date_mapping
            WHERE calendar_date = v_exit_date;

            IF v_end_week_id IS NULL THEN
                RAISE EXCEPTION 'No week ID found for exit_date: %', v_exit_date;
            END IF;
        ELSE
            -- If no exit_date is provided, set end_week_id to the maximum week available
            SELECT MAX(fiscal_year_week) INTO v_end_week_id
            FROM global.fiscal_date_mapping;

            IF v_end_week_id IS NULL THEN
                RAISE EXCEPTION 'No maximum week ID available in fiscal mapping table.';
            END IF;
        END IF;

       --insert into wp_master

		query_insert_wp := format(
		    'INSERT INTO item_smart.wp_master (
		        dept, channel, current_week, hierarchy_code, product_type, created_by, created_at, updated_by, updated_at,
		        store_count, written_sales_dollars, compared_week, written_sales_units, written_sales_cost, written_air,
		        written_aur, written_dr_perc, written_backorder_sales_units, written_backorder_sales, cancelled_dollars,
		        cancelled_qty, cancelled_cost, non_delivered_dollars, non_delivered_qty, non_delivered_cost,
		        wei_age_non_delivered_sales_dollars, wei_age_non_delivered_units, wei_age_non_delivered_costs,
		        delivered_returns_dollars, delivered_returns_qty, delivered_returns_cost, delivered_net_sales_dollars,
		        delivered_air, delivered_aur, delivered_drperc, delivered_net_sales_units, delivered_net_sales_cost,
		        delivered_auc, bop_units, bop_cost, bop_auc, atp_units, atp_cost, aoh_units, aoh_cost, total_receipt_cost,
		        total_receipt_units, delivered_gmperc, delivered_gm, on_order_placed_total, on_order_placed_stock,
		        on_order_placed_total_unit, on_order_placed_stock_unit, written_auc, written_cancel_retail_rate_perc,
		        written_cancel_units_rate_perc, written_cancel_cost_rate_perc, delivered_retail_return_rate_perc,
		        delivered_unit_return_rate_perc, delivered_cost_return_rate_perc, written_sales_build_ratio,
		        written_sales_units_build_ratio, delivered_net_sales_build_ratio, delivered_net_sales_units_build_ratio,
		        on_order_placed_total_auc, on_order_placed_stock_auc, on_order_placed_spo_auc, eop_cost, total_receipts_auc,
		        stock_receipts_auc, spo_receipts_auc, eop_auc, inv_adj_cost, inv_adj_units, written_imu, delivered_gmroi,
		        inv_adj_cost_perc, inv_adj_units_perc, inv_adj_auc, aoh_fwos_units, aoh_fwos_cost, atp_fwos_units, atp_fwos_cost,
		        retail_conversion_adjustment, on_order_unplaced_total, on_order_unplaced_stock, on_order_unplaced_total_unit,
		        on_order_unplaced_stock_unit, on_order_unplaced_total_auc, on_order_unplaced_stock_auc, 
		        written_gm_perc, written_gm_dollar, eop_units, written_backorder_aur, cancelled_aur
		    )
		    SELECT 
		         %L, channel, current_week, %L, product_type,created_by,
           		 NOW() AS created_at, updated_by, updated_at,
		        store_count, written_sales_dollars, compared_week, written_sales_units, written_sales_cost, written_air,
		        written_aur, written_dr_perc, written_backorder_sales_units, written_backorder_sales, cancelled_dollars,
		        cancelled_qty, cancelled_cost, non_delivered_dollars, non_delivered_qty, non_delivered_cost,
		        wei_age_non_delivered_sales_dollars, wei_age_non_delivered_units, wei_age_non_delivered_costs,
		        delivered_returns_dollars, delivered_returns_qty, delivered_returns_cost, delivered_net_sales_dollars,
		        delivered_air, delivered_aur, delivered_drperc, delivered_net_sales_units, delivered_net_sales_cost,
		        delivered_auc, bop_units, bop_cost, bop_auc, atp_units, atp_cost, aoh_units, aoh_cost, total_receipt_cost,
		        total_receipt_units, delivered_gmperc, delivered_gm, on_order_placed_total, on_order_placed_stock,
		        on_order_placed_total_unit, on_order_placed_stock_unit, written_auc, written_cancel_retail_rate_perc,
		        written_cancel_units_rate_perc, written_cancel_cost_rate_perc, delivered_retail_return_rate_perc,
		        delivered_unit_return_rate_perc, delivered_cost_return_rate_perc, written_sales_build_ratio,
		        written_sales_units_build_ratio, delivered_net_sales_build_ratio, delivered_net_sales_units_build_ratio,
		        on_order_placed_total_auc, on_order_placed_stock_auc, on_order_placed_spo_auc, eop_cost, total_receipts_auc,
		        stock_receipts_auc, spo_receipts_auc, eop_auc, inv_adj_cost, inv_adj_units, written_imu, delivered_gmroi,
		        inv_adj_cost_perc, inv_adj_units_perc, inv_adj_auc, aoh_fwos_units, aoh_fwos_cost, atp_fwos_units, atp_fwos_cost,
		        retail_conversion_adjustment, on_order_unplaced_total, on_order_unplaced_stock, on_order_unplaced_total_unit,
		        on_order_unplaced_stock_unit, on_order_unplaced_total_auc, on_order_unplaced_stock_auc, 
		        written_gm_perc, written_gm_dollar, eop_units, written_backorder_aur, cancelled_aur
		    FROM item_smart.wp_master
		    WHERE dept = %L AND hierarchy_code = %L AND current_week BETWEEN %L AND %L AND channel = ANY(%L)
		    ON CONFLICT (dept, current_week, channel, hierarchy_code) DO UPDATE
		    SET
		        product_type = EXCLUDED.product_type,
		        created_by = EXCLUDED.created_by,
		        created_at = EXCLUDED.created_at,
		        updated_by = EXCLUDED.updated_by,
		        updated_at = EXCLUDED.updated_at,
		        store_count = EXCLUDED.store_count,
		        written_sales_dollars = EXCLUDED.written_sales_dollars,
		        written_sales_units = EXCLUDED.written_sales_units,
		        written_sales_cost = EXCLUDED.written_sales_cost,
		        written_air = EXCLUDED.written_air,
		        written_aur = EXCLUDED.written_aur,
		        written_dr_perc = EXCLUDED.written_dr_perc,
		        written_backorder_sales_units = EXCLUDED.written_backorder_sales_units,
		        written_backorder_sales = EXCLUDED.written_backorder_sales,
		        cancelled_dollars = EXCLUDED.cancelled_dollars,
		        cancelled_qty = EXCLUDED.cancelled_qty,
		        cancelled_cost = EXCLUDED.cancelled_cost,
		        non_delivered_dollars = EXCLUDED.non_delivered_dollars,
		        non_delivered_qty = EXCLUDED.non_delivered_qty,
		        non_delivered_cost = EXCLUDED.non_delivered_cost,
				wei_age_non_delivered_sales_dollars = EXCLUDED.wei_age_non_delivered_sales_dollars,
	            wei_age_non_delivered_units = EXCLUDED.wei_age_non_delivered_units,
	            wei_age_non_delivered_costs = EXCLUDED.wei_age_non_delivered_costs,
	            delivered_returns_dollars = EXCLUDED.delivered_returns_dollars,
	            delivered_returns_qty = EXCLUDED.delivered_returns_qty,
	            delivered_returns_cost = EXCLUDED.delivered_returns_cost,
	            delivered_net_sales_dollars = EXCLUDED.delivered_net_sales_dollars,
	            delivered_air = EXCLUDED.delivered_air,
	            delivered_aur = EXCLUDED.delivered_aur,
	            delivered_drperc = EXCLUDED.delivered_drperc,
	            delivered_net_sales_units = EXCLUDED.delivered_net_sales_units,
	            delivered_net_sales_cost = EXCLUDED.delivered_net_sales_cost,
	            delivered_auc = EXCLUDED.delivered_auc,
	            bop_units = EXCLUDED.bop_units,
				bop_cost = EXCLUDED.bop_cost,
                bop_auc = EXCLUDED.bop_auc,
                atp_units = EXCLUDED.atp_units,
                atp_cost = EXCLUDED.atp_cost,
                aoh_units = EXCLUDED.aoh_units,
                aoh_cost = EXCLUDED.aoh_cost,
                total_receipt_cost = EXCLUDED.total_receipt_cost,
                total_receipt_units = EXCLUDED.total_receipt_units,
                delivered_gmperc = EXCLUDED.delivered_gmperc,
                delivered_gm = EXCLUDED.delivered_gm,
                on_order_placed_total = EXCLUDED.on_order_placed_total,
                on_order_placed_stock = EXCLUDED.on_order_placed_stock,
                on_order_placed_total_unit = EXCLUDED.on_order_placed_total_unit,
                on_order_placed_stock_unit = EXCLUDED.on_order_placed_stock_unit,
                written_auc = EXCLUDED.written_auc,
                written_cancel_retail_rate_perc = EXCLUDED.written_cancel_retail_rate_perc,
                written_cancel_units_rate_perc = EXCLUDED.written_cancel_units_rate_perc,
                written_cancel_cost_rate_perc = EXCLUDED.written_cancel_cost_rate_perc,
                delivered_retail_return_rate_perc = EXCLUDED.delivered_retail_return_rate_perc,
                delivered_unit_return_rate_perc = EXCLUDED.delivered_unit_return_rate_perc,
                delivered_cost_return_rate_perc = EXCLUDED.delivered_cost_return_rate_perc,
                written_sales_build_ratio = EXCLUDED.written_sales_build_ratio,
                written_sales_units_build_ratio = EXCLUDED.written_sales_units_build_ratio,
                delivered_net_sales_build_ratio = EXCLUDED.delivered_net_sales_build_ratio,
                delivered_net_sales_units_build_ratio = EXCLUDED.delivered_net_sales_units_build_ratio,
                on_order_placed_total_auc = EXCLUDED.on_order_placed_total_auc,
                on_order_placed_stock_auc = EXCLUDED.on_order_placed_stock_auc,
                on_order_placed_spo_auc = EXCLUDED.on_order_placed_spo_auc,
                eop_cost = EXCLUDED.eop_cost,
                total_receipts_auc = EXCLUDED.total_receipts_auc,
                stock_receipts_auc = EXCLUDED.stock_receipts_auc,
                spo_receipts_auc = EXCLUDED.spo_receipts_auc,
                eop_auc = EXCLUDED.eop_auc,
                inv_adj_cost = EXCLUDED.inv_adj_cost,
                inv_adj_units = EXCLUDED.inv_adj_units,
                written_imu = EXCLUDED.written_imu,
                delivered_gmroi = EXCLUDED.delivered_gmroi,
                inv_adj_cost_perc = EXCLUDED.inv_adj_cost_perc,
                inv_adj_units_perc = EXCLUDED.inv_adj_units_perc,
                inv_adj_auc = EXCLUDED.inv_adj_auc,
                aoh_fwos_units = EXCLUDED.aoh_fwos_units,
                aoh_fwos_cost = EXCLUDED.aoh_fwos_cost,
                atp_fwos_units = EXCLUDED.atp_fwos_units,
                atp_fwos_cost = EXCLUDED.atp_fwos_cost,
                retail_conversion_adjustment = EXCLUDED.retail_conversion_adjustment,
                on_order_unplaced_total = EXCLUDED.on_order_unplaced_total,
                on_order_unplaced_stock = EXCLUDED.on_order_unplaced_stock,
                on_order_unplaced_total_unit = EXCLUDED.on_order_unplaced_total_unit,
                on_order_unplaced_stock_unit = EXCLUDED.on_order_unplaced_stock_unit,
                on_order_unplaced_total_auc = EXCLUDED.on_order_unplaced_total_auc,
                on_order_unplaced_stock_auc = EXCLUDED.on_order_unplaced_stock_auc,
                l3_name_channel = EXCLUDED.l3_name_channel,
                written_gm_perc = EXCLUDED.written_gm_perc,
                written_gm_dollar = EXCLUDED.written_gm_dollar,
                eop_units = EXCLUDED.eop_units,
                written_backorder_aur = EXCLUDED.written_backorder_aur,
                cancelled_aur = EXCLUDED.cancelled_aur',
		    v_dept, v_hierarchy_code,prd_dept, prd_hierarchy_code, v_start_week_id, v_end_week_id, p_channels
		);
		
		-- Log the query
		RAISE NOTICE 'Executing query: %', query_insert_wp;
		
		-- Execute the query
		EXECUTE query_insert_wp;


        
                -- Get the count of inserted records
        GET DIAGNOSTICS v_insert_count = ROW_COUNT;
       	
       	v_total_insert_count := v_total_insert_count + v_insert_count;
       
       -- Log insertion status and count
        RAISE INFO 'Inserted % records into wp_master for dept: %, hierarchy_code: %', v_insert_count, v_dept, v_hierarchy_code;    

       

        -- Insert into iaf_master
		query_insert_iaf := format(
		    'INSERT INTO item_smart.iaf_master (
		        dept, channel, current_week, hierarchy_code, product_type, created_by, created_at, updated_by,
		        updated_at, written_sales_dollars, written_sales_units, written_sales_cost, written_air, written_aur,
		        written_auc, written_gm_perc, written_gm_dollar, written_dr_perc, scenario, actualised, revenue, discount
		    )
		    SELECT 
		       %L, channel, current_week, %L, product_type, created_by, 
            	NOW() AS created_at, updated_by, updated_at, written_sales_dollars, written_sales_units, written_sales_cost, written_air, written_aur,
		        written_auc, written_gm_perc, written_gm_dollar, written_dr_perc, scenario, actualised, revenue, discount
		    FROM item_smart.iaf_master
		    WHERE dept = %L AND hierarchy_code = %L AND current_week BETWEEN %L AND %L AND channel = ANY(%L)
		    ON CONFLICT (dept, current_week, channel, hierarchy_code) DO UPDATE
		    SET
		        product_type = EXCLUDED.product_type,
		        created_by = EXCLUDED.created_by,
		        created_at = EXCLUDED.created_at,
		        updated_by = EXCLUDED.updated_by,
		        updated_at = EXCLUDED.updated_at,
		        written_sales_dollars = EXCLUDED.written_sales_dollars,
		        written_sales_units = EXCLUDED.written_sales_units,
		        written_sales_cost = EXCLUDED.written_sales_cost,
		        written_air = EXCLUDED.written_air,
		        written_aur = EXCLUDED.written_aur,
		        written_auc = EXCLUDED.written_auc,
		        written_gm_perc = EXCLUDED.written_gm_perc,
		        written_gm_dollar = EXCLUDED.written_gm_dollar,
		        written_dr_perc = EXCLUDED.written_dr_perc,
		        scenario = EXCLUDED.scenario,
		        actualised = EXCLUDED.actualised,
		        revenue = EXCLUDED.revenue,
		        discount = EXCLUDED.discount',
		    v_dept, v_hierarchy_code,prd_dept, prd_hierarchy_code, v_start_week_id, v_end_week_id, p_channels
		);
		
		-- Log the query
		RAISE NOTICE 'Executing query: %', query_insert_iaf;
		
		-- Execute the query
		EXECUTE query_insert_iaf;

        
        GET DIAGNOSTICS v_insert_count = ROW_COUNT;
        v_total_insert_count := v_total_insert_count + v_insert_count;

        RAISE INFO 'Inserted % records into iaf_master for dept: %, hierarchy_code: %', v_insert_count, v_dept, v_hierarchy_code;

        -- Update new_skus to mark cadence as generated
        UPDATE item_smart.new_skus
        SET is_cadence_generated = TRUE,updated_at=now()
        WHERE product_code = p_product_codes[i] AND mapped_product_code = p_mapped_product_codes[i];
    END LOOP;

    RETURN v_total_insert_count;
END;
$function$
;