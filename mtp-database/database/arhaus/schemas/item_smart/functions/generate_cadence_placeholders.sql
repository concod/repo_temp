--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:generate_cadence_placeholders runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:generate_cadence_placeholders_updated_at_fix
--comment: initial changeset for generate_cadence__placeholders
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.generate_cadence_placeholders(_text, _text, _text);

CREATE OR REPLACE FUNCTION item_smart.generate_cadence_placeholders(p_placeholder_ids text[], p_mapped_product_codes text[], p_channels text[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_dept TEXT;
    v_hierarchy_code INT;
    prd_dept TEXT;
    prd_hierarchy_code INT;
    v_insert_count INT := 0; -- Initialize insert count variable
    v_total_insert_count INT := 0; -- Variable to keep track of total inserted records
    i INT; -- Loop variable
    v_entry_date DATE;
    v_exit_date DATE;
    v_start_week_id INT;
   	v_end_week_id INT;
BEGIN
    -- Loop through each placeholder_id and mapped_product_code
    FOR i IN 1 .. array_length(p_placeholder_ids, 1) LOOP
        -- Step 1: Retrieve l2_name, hierarchy_code from placeholders_info table
        SELECT l2_name, hierarchy_code,entry_date,exit_date
        INTO v_dept, v_hierarchy_code,v_entry_date,v_exit_date
        FROM item_smart.placeholders_info 
        WHERE product_code = p_placeholder_ids[i] and mapped_product_code = p_mapped_product_codes[i]
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No data found in placeholders_info for product code: %', p_placeholder_ids[i];
        END IF;
        
        SELECT l2_name AS dept, hierarchy_code
        INTO prd_dept, prd_hierarchy_code
        FROM item_smart.mv_product_hierarchies_filter
        WHERE product_code = p_mapped_product_codes[i];
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'No data found in product MV for product code: %', p_placeholder_ids[i];
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
                SELECT item_smart.get_lead_week(26, v_exit_date) INTO v_end_week_id;

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
       
       
        
        -- Step 3: Fetch data from wp_master using dept, hierarchy_code, and channel
       --insert into wp_master
        INSERT INTO item_smart.wp_master (
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
            v_dept, channel, current_week, v_hierarchy_code, product_type, created_by, 
            NOW() AS created_at, -- Set created_at to current timestamp
            updated_by, updated_at,
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
        WHERE 
            dept = prd_dept AND 
            hierarchy_code = prd_hierarchy_code AND 
            current_week between v_start_week_id and v_end_week_id AND
            channel = ANY(p_channels);
        
                -- Get the count of inserted records
        GET DIAGNOSTICS v_insert_count = ROW_COUNT;
       	
       	v_total_insert_count := v_total_insert_count + v_insert_count;
       
       -- Log insertion status and count
        RAISE INFO 'Inserted % records into wp_master for dept: %, hierarchy_code: %', v_insert_count, v_dept, v_hierarchy_code;
		
       
       
       
       	        --insert into iaf master
           
                INSERT INTO item_smart.iaf_master (
                
                dept, channel, current_week, hierarchy_code, product_type, created_by, created_at, updated_by,
            	updated_at, written_sales_dollars, written_sales_units, written_sales_cost, written_air, written_aur,
            	written_auc, written_gm_perc, written_gm_dollar, written_dr_perc, scenario, actualised, revenue, discount
           
            
            

        )
        SELECT 
            v_dept, channel, current_week, v_hierarchy_code, product_type, created_by, 
            NOW() AS created_at, -- Set created_at to current timestamp
            updated_by,
            	updated_at, written_sales_dollars, written_sales_units, written_sales_cost, written_air, written_aur,
            	written_auc, written_gm_perc, written_gm_dollar, written_dr_perc , scenario, actualised, revenue, discount
        FROM item_smart.iaf_master
        WHERE 
            dept = prd_dept AND 
            hierarchy_code = prd_hierarchy_code AND 
            current_week between v_start_week_id and v_end_week_id AND
            channel = ANY(p_channels);
           
         
        -- Get the count of inserted records
        GET DIAGNOSTICS v_insert_count = ROW_COUNT;
       	
       	v_total_insert_count := v_total_insert_count + v_insert_count;

        -- Log insertion status and count
        RAISE INFO 'Inserted % records into iaf_master for dept: %, hierarchy_code: %', v_insert_count, v_dept, v_hierarchy_code;
       
       
        UPDATE item_smart.placeholders_info
        SET is_cadence_generated = TRUE,updated_at=now()
        WHERE product_code = p_placeholder_ids[i] and mapped_product_code = p_mapped_product_codes[i];
    END LOOP;

    -- Return the total count of inserted records
    RETURN v_total_insert_count;
END;
$function$
;
