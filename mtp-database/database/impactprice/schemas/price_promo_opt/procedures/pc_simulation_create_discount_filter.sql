--liquibase formatted sql
--changeset divyasree.bingimalla@impactanalytics.co:pc_simulation_create_discount_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_create_discount_filter

DROP PROCEDURE if exists price_promo_opt.pc_simulation_create_discount_filter;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_create_discount_filter(IN var_promo_id integer, IN var_scenario_id integer, IN var_scenario_order_id integer, IN var_stack_flag boolean DEFAULT false, IN var_is_intercept boolean DEFAULT false, IN var_is_entire_refresh boolean DEFAULT true, IN var_pccd_table character varying DEFAULT NULL::character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$



DECLARE

    query varchar;

	offer_name varchar;

	temp_table_name varchar;

	temp_disc_changes varchar;



	join_clause varchar;



	date_columns varchar;



	index_columns varchar;



	index_name_suffix varchar;



	scenario_id_select varchar;



	scenario_json text;

	-- Variables for stack flow

	table_suffix varchar;



	var_start_date date;



	var_end_date date;



	var_week_start_date date;



	var_week_end_date date;



	discount_filter_name varchar;



	discount_filter_name_2 varchar;



	discount_filter_name_3 varchar;



	arr_scenario_id integer[] := ARRAY[var_scenario_id];

	--create array



	product_level_id_tag integer ;



	store_level_id_tag integer ;



	last_refresh_var varchar;

	column_list varchar;

	redemption_proc varchar;

	redemption_join varchar;

	pen_factor varchar;



BEGIN


-- Purpose: Creates and populates discount filter tables for promotional scenario simulations.
-- Example: CALL price_promo_opt.pc_simulation_create_discount_filter(12345, 100, 1, FALSE, FALSE, TRUE);
-- Other Functions Used:
--   * price_promo.fn_fetch_stores_for_promo - Retrieves stores eligible for the promotion
--   * price_promo_opt.fn_simulation_tiered_offer_calculation - Calculates tiered offer details
--   * price_promo_opt.fn_get_promo_details - Gets promotion date ranges (for stacked flow)
--   * price_promo_opt.pc_simulation_create_discount_filter_finalized_stack - Processes stacked discounts
--   * price_promo_opt.generate_promo_scenario_report_stack - Generates reports for stacked scenarios
-- Tables Used:
--   * price_promo.ps_scenario_discounts - Stores scenario discount configurations
--   * price_promo.tb_promo_product_reco_details - Product recommendation details
--   * price_promo.tb_promo_store_reco_details - Store recommendation details
--   * price_promo.tb_discount_level_stores - Store discount level mappings
--   * price_promo.tb_discount_level_products - Product discount level mappings
--   * price_promo.product_master - Product master data
--   * price_promo.promo_master - Promotion master data
--   * price_promo_opt_temp.promo_product_filter_resim - Filtered product data
--   * price_promo_opt.tb_halo_effect_sitewide_factor_opt - Sitewide halo effect factors
--   * price_promo_opt.tb_halo_effect_department_factor_opt - Department halo effect factors
--   * price_promo_opt.tb_loyalty_app_factor_opt - Loyalty and app factors
-- Returns: No direct return value; creates temporary tables with discount filter data for simulation



	SELECT

		count(product_level_value)

	INTO

		product_level_id_tag

	FROM

		price_promo.tb_promo_product_reco_details

	WHERE

		promo_id = var_promo_id;

--offer_name
	SELECT (scenario_data->var_scenario_order_id::text->> 'offer_type')

	INTO offer_name

	FROM price_promo.ps_scenario_discounts

	WHERE promo_id = var_promo_id;

	SELECT

		count(store_level_value)

	INTO

		store_level_id_tag

	FROM

		price_promo.tb_promo_store_reco_details

	WHERE

		promo_id = var_promo_id;

	-- Set scenario_json field name based on scenario order

	scenario_json := CASE

		WHEN var_scenario_order_id IS NULL THEN 'ia_recommended_data'

		ELSE 'scenario_data'

	END;



	last_refresh_var := CASE

		WHEN var_scenario_order_id IS NULL THEN 'last_optimized_time'

		ELSE '
case when
    updated_at AT TIME ZONE ''UTC'' >
   	last_simulation_time then now() - INTERVAL ''180 days'' else last_simulation_time
END
'

	END;

	-- Ensure var_scenario_order_id is set correctly

	    IF var_scenario_order_id IS NULL THEN

	        var_scenario_order_id := 0;

	END IF;

	-- Determine table name and join clause based on stack_flag

	    IF var_stack_flag THEN

	        temp_table_name := format('price_promo_opt_temp.scenario_disc_filter_date_stack_%s_%s', var_promo_id, var_scenario_id);

			temp_disc_changes := format('price_promo_opt_temp.disc_changes_stack_%s_%s', var_promo_id, var_scenario_id);



	date_columns := ', date, week_start_date';



	index_columns := 'product_id, date, week_start_date';



	index_name_suffix := format('_stk_idx_%s_%s',var_promo_id, var_scenario_id);

	-- Suffix for the index names when stacking

	join_clause := format('

	            CROSS JOIN LATERAL

	                (SELECT fdmi.date_id AS date, fdmi.simulation_week_start_date AS week_start_date
				        FROM price_promo.promo_master pm
				        INNER JOIN global.tb_fiscal_date_mapping fdmi
				            ON fdmi.date_id BETWEEN pm.start_date AND pm.end_date
				        WHERE pm.promo_id = %s
					) dates',

	var_promo_id);

	ELSE

	        temp_table_name := format('price_promo_opt_temp.promo_scenario_discount_filter_%s_%s',var_promo_id,var_scenario_id);
			temp_disc_changes := format('price_promo_opt_temp.disc_changes_%s_%s', var_promo_id, var_scenario_id);



	date_columns := '';



	index_columns := 'product_id';



	index_name_suffix := format('_idx_%s_%s',var_promo_id, var_scenario_id);

	-- No suffix when not stacking

	join_clause := '';

	-- No cross join for the non-stacked version

	END IF;

IF offer_name = 'kit_offer' THEN
    column_list := ',kit_offer_type_id, unit_name, units_count, calculated_discount_sf';
    redemption_proc := format(
        'call price_promo_opt.pc_psdf_create_final_table_from_kit(''price_promo_opt_temp.kit_offer_%s_%s_%s'', ''%s'', %s, %s);',
        var_promo_id, var_scenario_id, var_stack_flag, temp_disc_changes, var_promo_id, var_scenario_id
    );
	redemption_join := format(
  'left join price_promo_opt_temp.kit_offer_%s_%s_%s kt using(product_id, s1_id, c0_id)',
  var_promo_id,
  var_scenario_id,
  var_stack_flag
);
	pen_factor := 'WHEN oo.offer_type in (''kit_offer'',''bxgy_offer'', ''tiered_offer'', ''bmsm_transaction_discount'', ''bmsm_fixed_quantity'') then sf_penetration_factor';

ELSIF offer_name = 'bxgy_offer' THEN
    column_list := ',bxgy_offer_type_id, unit_name, units_count, calculated_discount_sf';
    redemption_proc := format(
        'call price_promo_opt.pc_psdf_create_final_table_from_bxgy(''price_promo_opt_temp.bxgy_offer_%s_%s_%s'', ''%s'', %s, %s);',
        var_promo_id, var_scenario_id,var_stack_flag, temp_disc_changes, var_promo_id, var_scenario_id
    );
	redemption_join := format('left join price_promo_opt_temp.bxgy_offer_%s_%s_%s kt using(product_id, s1_id, c0_id)', var_promo_id, var_scenario_id,var_stack_flag);
	pen_factor := 'WHEN oo.offer_type in (''kit_offer'',''bxgy_offer'', ''tiered_offer'', ''bmsm_transaction_discount'', ''bmsm_fixed_quantity'') then sf_penetration_factor';

ELSIF offer_name = 'tiered_offer' THEN
    column_list := ',tier_offer_type_id, calculated_discount_sf';
    redemption_proc := format(
        'call price_promo_opt.pc_psdf_create_final_table_from_tier(''price_promo_opt_temp.tier_offer_%s_%s_%s'', ''%s'', %s, %s);',
        var_promo_id, var_scenario_id, var_stack_flag, temp_disc_changes, var_promo_id, var_scenario_id
    );
	redemption_join := format('left join price_promo_opt_temp.tier_offer_%s_%s_%s kt using(product_id, s1_id, c0_id)', var_promo_id, var_scenario_id, var_stack_flag);
	pen_factor := 'WHEN oo.offer_type in (''kit_offer'',''bxgy_offer'', ''tiered_offer'', ''bmsm_transaction_discount'', ''bmsm_fixed_quantity'') then sf_penetration_factor';

ELSIF offer_name = 'bmsm_transaction_discount' THEN
    column_list := ',1 as calculated_discount_sf';
    redemption_proc := format(
        'call price_promo_opt.pc_psdf_create_final_table_from_bmsmtxndisc(''price_promo_opt_temp.transaction_offer_%s_%s_%s'', ''%s'', %s, %s);',
        var_promo_id, var_scenario_id, var_stack_flag, temp_disc_changes, var_promo_id, var_scenario_id
    );
	redemption_join := format('left join price_promo_opt_temp.transaction_offer_%s_%s_%s kt using(product_id, s1_id, c0_id)', var_promo_id, var_scenario_id, var_stack_flag);
	pen_factor := 'WHEN oo.offer_type in (''kit_offer'',''bxgy_offer'', ''tiered_offer'', ''bmsm_transaction_discount'', ''bmsm_fixed_quantity'') then sf_penetration_factor';

ELSIF offer_name = 'bmsm_fixed_quantity' THEN
    column_list := ',1 as calculated_discount_sf';
    redemption_proc := format(
        'call price_promo_opt.pc_psdf_create_final_table_from_bmsmfixedqty(''price_promo_opt_temp.fixed_quantity_offer_%s_%s_%s'', ''%s'', %s, %s);',
        var_promo_id, var_scenario_id, var_stack_flag, temp_disc_changes, var_promo_id, var_scenario_id
    );
	redemption_join := format('left join price_promo_opt_temp.fixed_quantity_offer_%s_%s_%s kt using(product_id, s1_id, c0_id)', var_promo_id, var_scenario_id, var_stack_flag);
	pen_factor := 'WHEN oo.offer_type in (''kit_offer'',''bxgy_offer'', ''tiered_offer'', ''bmsm_transaction_discount'', ''bmsm_fixed_quantity'') then sf_penetration_factor';

ELSE
    column_list := ',1 as calculated_discount_sf';
    redemption_proc := '';
	redemption_join := '';
	pen_factor := '';
END IF;


	-- Construct the main query

	query := format('

			DROP TABLE IF EXISTS %s;

	        CREATE UNLOGGED TABLE %s AS

	        (

	                SELECT

	        pdm.promo_id::integer AS promo_id,
			pdm.created_at,
	        pdm.offer_type,
	        pdm.scan_back,
	        pdm.off_invoice,
	        pdm.product_level_id,
	        pdm.scenario_id,
	        pdm.offer_type_id,
	        pdm.offer_x_value,
	        pdm.offer_x_type,
	        pdm.offer_y_value,
	        pdm.offer_y_type,
	        pdm.offer_z_value,
	        pdm.offer_z_type,
	        pdm.tier_id,
	        pdm.customer_reach,
	        pdm.customer_redemption_rate,
	        pdm.discount_value,
	        pdm.discount_type,
	        pdm.disc_updated_at,

			%s::timestamptz as last_refresh_date,

			pdm.l0_id,pdm.currency_id as currency_id, pdm.l0_cid, pdm.l3_cid,

--			l1_cid,l2_cid,l4_cid, NULL::integer as ecom_shipping_cost,

			store_reco_level, s0_id, s1_id, c0_id,

	        concat(coalesce(product_level_id,0), ''_'', coalesce(store_level_id,0), ''_'', coalesce(customer_level_id,0)) AS discount_level_value,

	        NULL::varchar offer_type_combined_display_name,

	        COALESCE(product_id,0)::integer as product_id,

			customer_reco_level,

--			offer_distribution_channel,

	        pdm.customer_type,

	        pdm.product_selection_type, pdm.store_selection_type,

	        pdm.hierarchy_level_id,

	        pdm.promo_duration,promo_base_price as msrp,pdm.COST,promo_base_price as current_price,promo_base_price as avg_current_price,

			--(tab1.user_metadata->>''endcap_flag'')
			0::integer AS end_cap_flag

		     %s
-----------------------------------------------------------------------------
	    FROM

	        (

SELECT
 tab1.promo_id, 
 tab1.product_id, 
 store_reco_level, 
 customer_reco_level,
 coalesce(tpsp.promo_base_price, pdmi.promo_base_price) as promo_base_price,
 coalesce(tpsp.cost, pdmi.cost) as cost, scenario_data, ia_recommended_data , product_level_id, pmm.updated_at,
 pmm.last_simulation_time,last_optimized_time, l0_id, pdmi.currency_id, l0_cid, l3_cid, s0_id, s1_id, c0_id, tab1.store_level_id,
 tab1.customer_level_id, customer_type, product_selection_type, store_selection_type, null as hierarchy_level_id,
 null as promo_duration,
 %s ->''%s''->>''created_at'' AS created_at,

	        %s->''%s''->>''offer_type'' AS offer_type,

			(%s->''%s''->>''scan_back_allowance_amount'')::float AS scan_back,	        
	        (%s->''%s''->>''off_invoice_allowance_amount'')::float AS off_invoice,

	        (%s->''%s''->>''scenario_id'')::integer AS scenario_id,

	        (%s->''%s''->>''offer_type_id'')::integer AS offer_type_id,

	        (%s->''%s''->>''offer_x_value'')::float AS offer_x_value,

	        %s->''%s''->>''offer_x_type'' AS offer_x_type,

	        (%s->''%s''->>''offer_y_value'')::float AS offer_y_value,

	        %s->''%s''->>''offer_y_type'' AS offer_y_type,

	        (%s->''%s''->>''offer_z_value'')::float AS offer_z_value,

	        %s->''%s''->>''offer_z_type'' AS offer_z_type,

	        (%s->''%s''->>''tier_id'')::integer AS tier_id,

			((%s->''%s''->''special_offer_data''->>''customer_reach'')::FLOAT)*0.01 AS customer_reach,

			((%s->''%s''->''special_offer_data''->>''customer_redemption_rate'')::FLOAT)*0.01 AS customer_redemption_rate,

			((%s->''%s''->''special_offer_data''->>''discount_value'')::FLOAT)  AS discount_value,

		 	(%s->''%s''->''special_offer_data''->>''discount_type'') AS discount_type,

			((%s->''%s''->>''updated_at'')::timestamptz) AS disc_updated_at
 
	    FROM

	        (
	        
	        SELECT 
                            ps.promo_id, 
                            ss.product_id, -- Result of coalesce(dls.product_id, ss.product_id) when both match
                            ps.product_level_id, 
                            ps.store_level_id, 
                            COALESCE(ps.customer_level_id, 0) AS customer_level_id,scenario_data, ia_recommended_data 
                        FROM price_promo.ps_scenario_discounts ps
                        JOIN price_promo.tb_discount_level_products dls 
                            USING (product_level_id)
                        JOIN price_promo.fn_fetch_products_for_promo(%s) ss 
                            ON ss.promo_id = ps.promo_id 
                            AND ss.product_id = dls.product_id
                        WHERE ps.promo_id = %s
                        
                        UNION ALL
                        
                        SELECT 
                            ps.promo_id, 
                            COALESCE(dls.product_id, ss.product_id) AS product_id, 
                            ps.product_level_id, 
                            ps.store_level_id, 
                            COALESCE(ps.customer_level_id, 0) AS customer_level_id,scenario_data, ia_recommended_data 
                        FROM price_promo.ps_scenario_discounts ps
                        LEFT JOIN price_promo.tb_discount_level_products dls 
                            USING (product_level_id)
                        LEFT JOIN price_promo.fn_fetch_products_for_promo(%s) ss 
                            ON ss.promo_id = ps.promo_id
                        WHERE ps.promo_id = %s 
                          AND dls.product_id IS NULL
                        GROUP BY 1, 2, 3, 4, 5, 6,7
					)tab1


     LEFT JOIN (
     select distinct store_level_id, store_reco_level, s0_id, s1_id from pricesmart.tb_store_master
							inner join
							(
	        
	        SELECT 
                          
                            ss."store_id", 
                            ps.store_level_id
                        FROM price_promo.ps_scenario_discounts ps
                        JOIN price_promo.tb_discount_level_stores dls 
                            USING (store_level_id)
                        JOIN price_promo.fn_fetch_stores_for_promo(%s) ss 
                            ON ss.promo_id = ps.promo_id 
                            AND ss.store_id = dls.store_id
                        WHERE ps.promo_id = %s
                        GROUP BY 1, 2
                        UNION ALL          
                        SELECT 
                           
                            COALESCE(dls.store_id, ss."store_id") AS store_id, 
                            ps.store_level_id
                        FROM price_promo.ps_scenario_discounts ps
                        LEFT JOIN price_promo.tb_discount_level_stores dls 
                            USING (store_level_id)
                        LEFT JOIN price_promo.fn_fetch_stores_for_promo(%s) ss 
                            ON ss.promo_id = ps.promo_id
                        WHERE ps.promo_id = %s 
                          AND dls.store_id IS NULL
                        GROUP BY 1, 2
							
							) ss USING (store_id)
							) sr on sr.store_level_id = tab1.store_level_id
				LEFT JOIN (
						    select distinct customer_level_id, customer_reco_level, c0_id from global.customer_master
							inner join
							(
								select distinct coalesce(dls.customer_id, ss.customer_id) as customer_id, coalesce(customer_level_id,0) as customer_level_id from 
								(select promo_id, customer_level_id from price_promo.ps_scenario_discounts where promo_id = %s) ps						
								left join price_promo.tb_discount_level_customers dls using (customer_level_id)
								left join price_promo.fn_fetch_customers_for_promo(%s) ss using (promo_id)
							) using (customer_id)
						 ) cr on cr.customer_level_id = tab1.customer_level_id
LEFT JOIN LATERAL (
    SELECT *
    FROM price_promo.tb_product_store_price tpsp
    WHERE tpsp.product_id = tab1.product_id
      AND tpsp.store_id =  sr.store_reco_level::integer
    ORDER BY tpsp.effective_from_date DESC
    LIMIT 1
) tpsp ON true
				left join price_promo.product_master pdmi
				on tab1.product_id = pdmi.product_id
				left join price_promo.promo_master pmm on tab1.promo_id = pmm.promo_id




) pdm
left join price_promo_opt_temp.promo_product_filter_resim_%s_%s using(product_id)
);
---------------------------------------------------------------------------------------------------------------------------------------

%s

SET LOCAL enable_nestloop = ''off'';
SET LOCAL work_mem = ''512MB'';
	        DROP TABLE IF EXISTS %s;

	        CREATE UNLOGGED TABLE %s AS
			(
	            WITH 
	            -- 1. Identify distinct tier_ids to minimize function calls
	            unique_tiers AS (
	                SELECT DISTINCT tier_id 
	                FROM %s
	                WHERE tier_id IS NOT NULL
	            ),
	            
	            -- 2. Calculate tiered offers once for all distinct tiers using the array input
	            tiered_calcs AS (
	                SELECT *
	                FROM price_promo_opt.fn_simulation_tiered_offer_calculation(
	                    (SELECT COALESCE(array_agg(tier_id), ARRAY[]::integer[]) FROM unique_tiers)
	                )
	            ),
	            -- 3. Main Calculation Stream
    			-- We calculate everything BEFORE the date explosion to minimize overhead.
	            pre_date_expansion AS (
	                SELECT
	                    psd.promo_id,
	                    psd.product_id,
	                    psd.customer_reco_level, 
	                    psd.l0_id, 
	                    psd.currency_id, 
	                    psd.l0_cid, 
	                    psd.l3_cid, 
	                    psd.s0_id, 
	                    psd.s1_id, 
	                    psd.c0_id,
	                    psd.store_reco_level,
	                    psd.promo_duration,
	                    psd.customer_type,
	                    psd.product_selection_type, 
	                    psd.store_selection_type, 
	                    psd.hierarchy_level_id,
	                    psd.scenario_id, 
	                    psd.discount_level_value,
						psd.created_at,
			            psd.msrp, 
			            psd.cost, 
			            psd.current_price, 
			            psd.avg_current_price,
			            psd.scan_back, 
			            psd.off_invoice, 
			            psd.product_level_id,
			            psd.end_cap_flag,
			            psd.offer_type_id, -- Keep original for selection if needed
			            -- Resolved Offer Params (Coalesce Logic)
						COALESCE(tpsd.offer_type, psd.offer_type) AS final_offer_type,
			            COALESCE(tpsd.offer_x_value, psd.offer_x_value) AS final_offer_x_value,
			            COALESCE(tpsd.offer_x_type, psd.offer_x_type) AS final_offer_x_type,
			            COALESCE(tpsd.offer_y_value, psd.offer_y_value) AS final_offer_y_value,
			            COALESCE(tpsd.offer_y_type, psd.offer_y_type) AS final_offer_y_type,
			            COALESCE(tpsd.offer_z_value, psd.offer_z_value) AS final_offer_z_value,
			            COALESCE(tpsd.offer_z_type, psd.offer_z_type) AS final_offer_z_type,
			            COALESCE(tpsd.tier_id, psd.tier_id) AS final_tier_id,
			            
			            psd.customer_redemption_rate,
			            psd.discount_type,
			            psd.discount_value,
			            psd.customer_reach,

	                    COALESCE(tpsd.max_tier, 1) AS max_tier,
            			COALESCE(tpsd.tiered_offer_indicator, 0) AS tiered_offer_indicator,	
						-- Calculated Discount Logic
			            LEAST(GREATEST(
			                CASE
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) IN (''percent_off'', ''upto_x_percent_off'') THEN COALESCE(tpsd.offer_x_value, psd.offer_x_value)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''extra_amount_off'' THEN COALESCE(((COALESCE(tpsd.offer_x_value, psd.offer_x_value) / NULLIF(psd.current_price, 0)) * 100), 0)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''fixed_price'' THEN COALESCE((((psd.current_price - COALESCE(tpsd.offer_x_value, psd.offer_x_value)) / NULLIF(psd.current_price,0)) * 100), 0)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bxgx_percent_off'' THEN ((COALESCE(tpsd.offer_z_value, psd.offer_z_value) * 0.01 * COALESCE(tpsd.offer_y_value, psd.offer_y_value)) / (COALESCE(tpsd.offer_y_value, psd.offer_y_value) + COALESCE(tpsd.offer_x_value, psd.offer_x_value))) * 100
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bxgx'' THEN ((COALESCE(tpsd.offer_y_value, psd.offer_y_value) / (COALESCE(tpsd.offer_y_value, psd.offer_y_value) + COALESCE(tpsd.offer_x_value, psd.offer_x_value))) * 100)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''dollar'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''percent_off'' THEN COALESCE(tpsd.offer_y_value, psd.offer_y_value)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''unit'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''percent_off'' THEN COALESCE(tpsd.offer_y_value, psd.offer_y_value)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''dollar'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''dollar_off'' THEN ((COALESCE(tpsd.offer_y_value, psd.offer_y_value) / COALESCE(tpsd.offer_x_value, psd.offer_x_value)) * 100)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''unit'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''dollar_off'' THEN COALESCE(((COALESCE(tpsd.offer_y_value, psd.offer_y_value) / (COALESCE(tpsd.offer_x_value, psd.offer_x_value) * NULLIF(psd.current_price,0))) * 100),0)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''unit'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''at_dollar'' THEN COALESCE((((psd.current_price - (COALESCE(tpsd.offer_y_value, psd.offer_y_value) / COALESCE(tpsd.offer_x_value, psd.offer_x_value))) / NULLIF(psd.current_price,0)) * 100),0)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) IN (''kit_offer'', ''bxgy_offer'', ''tiered_offer'') THEN psd.calculated_discount_sf
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm_transaction_discount'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''dollar'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''percent_off'' THEN COALESCE(tpsd.offer_y_value, psd.offer_y_value)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm_transaction_discount'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''dollar'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''dollar_off'' THEN (COALESCE(tpsd.offer_y_value, psd.offer_y_value) / COALESCE(tpsd.offer_x_value, psd.offer_x_value)) * 100
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm_fixed_quantity'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''unit'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''percent_off'' THEN (COALESCE(tpsd.offer_y_value, psd.offer_y_value))
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm_fixed_quantity'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''unit'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''dollar_off'' THEN (COALESCE(tpsd.offer_y_value, psd.offer_y_value) / (COALESCE(tpsd.offer_x_value, psd.offer_x_value) * psd.current_price)) * 100
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm_fixed_quantity'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''unit'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''at_dollar'' THEN ((psd.current_price - (COALESCE(tpsd.offer_y_value, psd.offer_y_value) / COALESCE(tpsd.offer_x_value, psd.offer_x_value))) / NULLIF (psd.current_price,0)) * 100
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''special_offer_type'' and psd.discount_type = ''extra_amount_off'' THEN COALESCE(((psd.discount_value / NULLIF(psd.current_price,0)) * 100),0)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''special_offer_type'' and psd.discount_type = ''percent_off'' THEN psd.discount_value
			                END, 0), 100
			            ) AS calculated_discount,
			            -- Temp Discount (uses avg_current_price)
			            LEAST(GREATEST(
			                CASE
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) IN (''percent_off'', ''upto_x_percent_off'') THEN COALESCE(tpsd.offer_x_value, psd.offer_x_value)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''extra_amount_off'' THEN COALESCE(((COALESCE(tpsd.offer_x_value, psd.offer_x_value) / NULLIF(psd.avg_current_price,0)) * 100),0)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''fixed_price'' THEN COALESCE((((psd.avg_current_price - COALESCE(tpsd.offer_x_value, psd.offer_x_value)) / NULLIF(psd.avg_current_price,0)) * 100),0)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bxgx_percent_off'' THEN ((COALESCE(tpsd.offer_z_value, psd.offer_z_value) * 0.01 * COALESCE(tpsd.offer_y_value, psd.offer_y_value)) / (COALESCE(tpsd.offer_y_value, psd.offer_y_value) + COALESCE(tpsd.offer_x_value, psd.offer_x_value))) * 100
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bxgx'' THEN ((COALESCE(tpsd.offer_y_value, psd.offer_y_value) / (COALESCE(tpsd.offer_y_value, psd.offer_y_value) + COALESCE(tpsd.offer_x_value, psd.offer_x_value))) * 100)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''dollar'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''percent_off'' THEN COALESCE(tpsd.offer_y_value, psd.offer_y_value)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''unit'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''percent_off'' THEN COALESCE(tpsd.offer_y_value, psd.offer_y_value)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''dollar'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''dollar_off'' THEN ((COALESCE(tpsd.offer_y_value, psd.offer_y_value) / COALESCE(tpsd.offer_x_value, psd.offer_x_value)) * 100)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''unit'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''dollar_off'' THEN COALESCE(((COALESCE(tpsd.offer_y_value, psd.offer_y_value) / (COALESCE(tpsd.offer_x_value, psd.offer_x_value) * NULLIF(psd.avg_current_price,0))) * 100),0)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''unit'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''at_dollar'' THEN COALESCE((((psd.avg_current_price - (COALESCE(tpsd.offer_y_value, psd.offer_y_value) / COALESCE(tpsd.offer_x_value, psd.offer_x_value))) / NULLIF(psd.avg_current_price,0)) * 100),0)
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm_fixed_quantity'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''unit'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''percent_off'' THEN (COALESCE(tpsd.offer_y_value, psd.offer_y_value))
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm_fixed_quantity'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''unit'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''dollar_off'' THEN (COALESCE(tpsd.offer_y_value, psd.offer_y_value) / (COALESCE(tpsd.offer_x_value, psd.offer_x_value) * psd.current_price)) * 100
			                    WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm_fixed_quantity'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''unit'' AND COALESCE(tpsd.offer_y_type, psd.offer_y_type) = ''at_dollar'' THEN ((psd.current_price - (COALESCE(tpsd.offer_y_value, psd.offer_y_value) / COALESCE(tpsd.offer_x_value, psd.offer_x_value))) / NULLIF (psd.current_price,0)) * 100
			                END * 0.01, 0), 1
			            ) AS temp_discount,
			            -- Expected Qty
			            (CASE
			                WHEN COALESCE(tpsd.offer_type, psd.offer_type) = ''bmsm'' AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''dollar'' THEN COALESCE(COALESCE(tpsd.offer_x_value, psd.offer_x_value) / NULLIF(psd.avg_current_price,0),0)
			                WHEN COALESCE(tpsd.offer_type, psd.offer_type) IN (''bmsm'', ''bxgx'', ''bxgx_percent_off'', ''bmsm_fixed_quantity'') AND COALESCE(tpsd.offer_x_type, psd.offer_x_type) = ''unit'' THEN COALESCE(tpsd.offer_x_value, psd.offer_x_value)
			            END) - 1 AS exp_qty
	                FROM %s psd
	                LEFT JOIN tiered_calcs tpsd ON psd.tier_id = tpsd.tier_id

				)
				    SELECT
				        mc.promo_id,
				        mc.scenario_id,
				        mc.discount_level_value,
				        mc.product_id, 
				        coalesce(mc.store_reco_level,''1_1'') as store_reco_level, 
				        coalesce(mc.customer_reco_level,''1'') as customer_reco_level, 
				        mc.l0_cid, mc.l3_cid, 
				        mc.s0_id, mc.s1_id,
				        mc.current_price, mc.currency_id, mc.l0_id,
				        mc.msrp,
				        mc.cost,
				        mc.promo_duration,
				        mc.created_at,
				        mc.offer_type_id,
				        mc.final_offer_type as offer_type,
				        ROUND(mc.calculated_discount::numeric, 2) AS calculated_discount,
				        
				        -- Penetration Factor Logic
				        COALESCE(
				            CASE
				                WHEN mc.final_offer_type = ''special_offer_type'' THEN mc.customer_reach * mc.customer_redemption_rate
				                WHEN mc.exp_qty > 0 THEN
				                    GREATEST(0.3, LEAST(0.98, POWER(0.85, (mc.exp_qty - (LEAST(ROUND((ceil(mc.temp_discount * 10 * 1000) / 1000.0)::numeric, 2), 3) * mc.temp_discount)))))
				                ELSE 1
				            END,
				            1
				        ) AS penetration_factor,
				        -- Effective Discount
				        case 
				            when mc.final_offer_type in (''kit_offer'',''bxgy_offer'') then mc.calculated_discount 
				            else ROUND(COALESCE(mc.calculated_discount * 
				                COALESCE(
				                    CASE
				                        WHEN mc.final_offer_type = ''special_offer_type'' THEN mc.customer_reach * mc.customer_redemption_rate
				                        WHEN mc.exp_qty > 0 THEN
				                            GREATEST(0.3, LEAST(0.98, POWER(0.85, (mc.exp_qty - (LEAST(ROUND((ceil(mc.temp_discount * 10 * 1000) / 1000.0)::numeric, 2), 3) * mc.temp_discount)))))
				                        ELSE 1
				                    END,
				                    1
				                )
				            , 0)::numeric, 2) 
				        end AS effective_discount,
				        mc.customer_type,
				        mc.product_selection_type, mc.store_selection_type,
				        mc.hierarchy_level_id,
				        (COALESCE(mc.scan_back,0)) as scan_back_per_product,
				        (COALESCE(mc.off_invoice,0)) as off_invoice_per_product,
				        -- Base Percentage
				        CASE 
				            when mc.final_offer_type in (''kit_offer'',''bxgy_offer'') then ROUND(mc.calculated_discount::numeric / 5) * 5
				            WHEN mc.final_offer_type <> ''kit_offer'' and COALESCE(mc.calculated_discount * 
				                COALESCE(
				                    CASE
				                        WHEN mc.final_offer_type = ''special_offer_type'' THEN mc.customer_reach * mc.customer_redemption_rate
				                        WHEN mc.exp_qty > 0 THEN
				                            GREATEST(0.3, LEAST(0.98, POWER(0.85, (mc.exp_qty - (LEAST(ROUND((ceil(mc.temp_discount * 10 * 1000) / 1000.0)::numeric, 2), 3) * mc.temp_discount)))))
				                        ELSE 1
				                    END,
				                    1
				                )
				            , 0) >= 95 THEN 95
				            ELSE FLOOR(COALESCE(mc.calculated_discount * 
				                COALESCE(
				                    CASE
				                        WHEN mc.final_offer_type = ''special_offer_type'' THEN mc.customer_reach * mc.customer_redemption_rate
				                        WHEN mc.exp_qty > 0 THEN
				                            GREATEST(0.3, LEAST(0.98, POWER(0.85, (mc.exp_qty - (LEAST(ROUND((ceil(mc.temp_discount * 10 * 1000) / 1000.0)::numeric, 2), 3) * mc.temp_discount)))))
				                        ELSE 1
				                    END,
				                    1
				                )
				            , 0) / 5) * 5 + CASE WHEN COALESCE(mc.calculated_discount * 
				                COALESCE(
				                    CASE
				                        WHEN mc.final_offer_type = ''special_offer_type'' THEN mc.customer_reach * mc.customer_redemption_rate
				                        WHEN mc.exp_qty > 0 THEN
				                            GREATEST(0.3, LEAST(0.98, POWER(0.85, (mc.exp_qty - (LEAST(ROUND((ceil(mc.temp_discount * 10 * 1000) / 1000.0)::numeric, 2), 3) * mc.temp_discount)))))
				                        ELSE 1
				                    END,
				                    1
				                )
				            , 0)::numeric %% 5 >= 2.5 THEN 5 ELSE 0 END
				        END::integer AS base_percentage,
				        0 AS offer_identifier,
				        
				        -- Priorities
				        ROUND(COALESCE(mc.calculated_discount * 
				            COALESCE(
				                CASE
				                    WHEN mc.final_offer_type = ''special_offer_type'' THEN mc.customer_reach * mc.customer_redemption_rate
				                    WHEN mc.exp_qty > 0 THEN
				                        GREATEST(0.3, LEAST(0.98, POWER(0.85, (mc.exp_qty - (LEAST(ROUND((ceil(mc.temp_discount * 10 * 1000) / 1000.0)::numeric, 2), 3) * mc.temp_discount)))))
				                    ELSE 1
				                END,
				                1
				            )
				        , 0)::numeric, 2) AS max_discount_priority_1,
				        
				        ROUND(COALESCE(mc.calculated_discount * 
				            COALESCE(
				                CASE
				                    WHEN mc.final_offer_type = ''special_offer_type'' THEN mc.customer_reach * mc.customer_redemption_rate
				                    WHEN mc.exp_qty > 0 THEN
				                        GREATEST(0.3, LEAST(0.98, POWER(0.85, (mc.exp_qty - (LEAST(ROUND((ceil(mc.temp_discount * 10 * 1000) / 1000.0)::numeric, 2), 3) * mc.temp_discount)))))
				                    ELSE 1
				                END,
				                1
				            )
				        , 0)::numeric, 2) AS max_discount_priority_2,
				        -- Calculate Description HERE (Before date explosion)
				        -- This is safer than the complex join and much faster than doing it after the cross join.
				        price_promo.get_offer_description_v2(
				            mc.final_offer_type::text, mc.final_offer_x_value::numeric, mc.final_offer_x_type::text,
				            mc.final_offer_y_value::numeric, mc.final_offer_y_type::text,
				            mc.final_offer_z_value::numeric, mc.final_tier_id::numeric
				        )::text as offer_type_combined_display_name,
				        mc.end_cap_flag

						 %s -- Date columns (or empty if not stacking)
				    FROM pre_date_expansion mc

	            %s  --cross join (or empty if not stacking)

	        );



--	        CREATE INDEX %s%s

--	                ON %s

--	                USING btree (%s);

--

--	        CREATE INDEX %s%s_product_base

--	                ON %s

--	                USING btree (product_id, base_percentage %s);



',

	temp_disc_changes, temp_disc_changes, --drop and create


	last_refresh_var,

column_list,
--------------------------------------------------------------------------------------------------------
    scenario_json, var_scenario_order_id,

	scenario_json, var_scenario_order_id,

	scenario_json, var_scenario_order_id,

	scenario_json, var_scenario_order_id,

	scenario_json, var_scenario_order_id,

	scenario_json, var_scenario_order_id,

	scenario_json, var_scenario_order_id, scenario_json, var_scenario_order_id, scenario_json, var_scenario_order_id,

	scenario_json, var_scenario_order_id, scenario_json, var_scenario_order_id, scenario_json, var_scenario_order_id,

	scenario_json, var_scenario_order_id, scenario_json, var_scenario_order_id, scenario_json, var_scenario_order_id,

	scenario_json, var_scenario_order_id, scenario_json, var_scenario_order_id, scenario_json, var_scenario_order_id,

var_promo_id,

var_promo_id,

var_promo_id,

var_promo_id,

var_promo_id,

var_promo_id,

var_promo_id,

var_promo_id,

var_promo_id,

var_promo_id,
var_promo_id, var_scenario_id,
-----------------------------------------------------------------------------------------------------------
redemption_proc,


temp_table_name, temp_table_name,  -- drop and create

temp_disc_changes, -- for unique_tiers CTE

temp_disc_changes, -- for pre_calculated_data CTE

date_columns, -- date columns

join_clause, -- Cross join (or empty) for date stacking

split_part(temp_table_name,

'.',

2),

index_name_suffix,

temp_table_name,

index_columns,

    split_part(temp_table_name,

'.',

2),

index_name_suffix,

temp_table_name,

	CASE

	WHEN var_stack_flag = TRUE THEN ',week_start_date'

	ELSE ''

END

);

-- Print the query (for debugging)

    RAISE NOTICE '%',

query;

-- Execute the query

    EXECUTE query;

-- Stacked flow logic

    IF var_stack_flag THEN



        table_suffix := format('%s_%s',

var_promo_id,

array_to_string(arr_scenario_id,

'_'));



RAISE NOTICE '%',

'log_data_1';



SELECT

	start_date,

	end_date,

	week_start_date,

	week_end_date

FROM

	price_promo_opt.fn_get_promo_details(var_promo_id)

        INTO

	var_start_date,

	var_end_date,

	var_week_start_date,

	var_week_end_date;



RAISE NOTICE '%',

'log_data_2';



discount_filter_name := format('price_promo_opt_temp.scenario_disc_filter_date_stack_%s_%s',

var_promo_id,

array_to_string(arr_scenario_id,

'_'));



RAISE NOTICE '%',

'log_data_4.0';



CALL price_promo_opt.pc_simulation_create_discount_filter_finalized_stack(var_promo_id,

arr_scenario_id, var_pccd_table);



RAISE NOTICE '%',

'log_data_4';



discount_filter_name_2 := format('price_promo_opt_temp.simulation_stacked_discounts_table_%s_%s',

var_promo_id,

array_to_string(arr_scenario_id,

'_'));



RAISE NOTICE '%',

discount_filter_name_2;



CALL price_promo_opt.generate_promo_scenario_report_stack(discount_filter_name,

discount_filter_name_2,

var_is_intercept,

var_pccd_table
);



RAISE NOTICE '%',

'log_data_5';



discount_filter_name_3 := format('price_promo_opt_temp.scenario_disc_filter_date_stack_%s_%s_final',

var_promo_id,

array_to_string(arr_scenario_id,

'_'));



RAISE NOTICE '%',

'log_data_5';



END IF;

END;



$procedure$
;
