--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_create_discount_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
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

	            CROSS JOIN

	                (SELECT DISTINCT date_id AS date, week_start_date

	                FROM

	                    (SELECT start_date, end_date FROM price_promo.promo_master WHERE promo_id = %s) pm

	                INNER JOIN

	                    (SELECT fdmi.date_id, fdmi.simulation_week_start_date AS week_start_date

	                     FROM global.tb_fiscal_date_mapping fdmi) fdm

	                ON fdm.date_id BETWEEN pm.start_date AND pm.end_date) sub3',

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
        'call price_promo_opt.pc_psdf_create_final_table_from_kit(''price_promo_opt_temp.kit_offer_%s_%s'', ''%s'', %s, %s);',
        var_promo_id, var_scenario_id,temp_disc_changes, var_promo_id, var_scenario_id
    );
	redemption_join := format(
  'left join price_promo_opt_temp.kit_offer_%s_%s kt using(product_id, s1_id, c0_id)',
  var_promo_id,
  var_scenario_id
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

	        promo_id::integer AS promo_id,

	        %s ->''%s''->>''created_at'' AS created_at,

	        %s->''%s''->>''offer_type'' AS offer_type,

			(%s->''%s''->>''scan_back_allowance_amount'')::float AS scan_back,	        
	        (%s->''%s''->>''off_invoice_allowance_amount'')::float AS off_invoice,
	        product_level_id,

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

			((%s->''%s''->>''updated_at'')::timestamptz) AS disc_updated_at,

			%s::timestamptz as last_refresh_date,

			l0_id,pdm.currency_id as currency_id, l0_cid, l3_cid,

--			l1_cid,l2_cid,l4_cid, NULL::integer as ecom_shipping_cost,

			store_reco_level, s0_id, s1_id, c0_id,

	        concat(coalesce(product_level_id,0), ''_'', coalesce(store_level_id,0), ''_'', coalesce(customer_level_id,0)) AS discount_level_value,

	        NULL::varchar offer_type_combined_display_name,

	        COALESCE(product_id,0)::integer as product_id,

			customer_reco_level,

--			offer_distribution_channel,

	        customer_type,

	        product_selection_type, store_selection_type,

	        hierarchy_level_id,

	        promo_duration,promo_base_price as msrp,COST,promo_base_price as current_price,promo_base_price as avg_current_price,

			(tab1.user_metadata->>''endcap_flag'')::integer AS end_cap_flag

		     %s

	    FROM

	        (

	                select distinct ps.promo_id, coalesce(dls.product_id, ss.product_id) as product_id, 
						product_level_id, user_metadata,
						store_level_id, coalesce(customer_level_id,0) customer_level_id

						from price_promo.ps_scenario_discounts ps	
		
						left join price_promo.tb_discount_level_products dls using (product_level_id)

						left join price_promo.promo_product_%s ss 
						
					    ON ss.promo_id = ps.promo_id
					    AND (dls.product_id IS NULL OR ss.product_id = dls.product_id)
						
						where ps.promo_id = %s
					)tab1

              -- Store reco via SELECT DISTINCT block

                LEFT JOIN (

							select distinct store_level_id, store_reco_level, s0_id, s1_id from global.tb_store_master
							inner join
							(
								select distinct coalesce(dls.store_id, ss.store_id) as store_id, store_level_id from 
								(select promo_id, store_level_id from price_promo.ps_scenario_discounts where promo_id = %s) ps						
								left join price_promo.tb_discount_level_stores dls using (store_level_id)
								left join price_promo.fn_fetch_stores_for_promo(%s) ss using (promo_id)
							) using (store_id)	

                		  ) sr USING (store_level_id)

				-- Customer reco via SELECT DISTINCT block
				LEFT JOIN (
						    select distinct customer_level_id, customer_reco_level, c0_id from global.customer_master
							inner join
							(
								select distinct coalesce(dls.customer_id, ss.customer_id) as customer_id, coalesce(customer_level_id,0) as customer_level_id from 
								(select promo_id, customer_level_id from price_promo.ps_scenario_discounts where promo_id = %s) ps						
								left join price_promo.tb_discount_level_customers dls using (customer_level_id)
								left join price_promo.fn_fetch_customers_for_promo(%s) ss using (promo_id)
							) using (customer_id)
						 ) cr USING (customer_level_id)

LEFT JOIN (select product_level_id, store_level_id, coalesce(customer_level_id,0) as customer_level_id , scenario_data, ia_recommended_data from price_promo.ps_scenario_discounts WHERE

	                promo_id = %s) na using(product_level_id, store_level_id, customer_level_id)



LEFT JOIN price_promo.product_master pdm using(product_id)



LEFT JOIN price_promo.promo_master using(promo_id)



inner JOIN ( SELECT distinct

	                promo_id, product_id,

	                hierarchy_level_id,

	                promo_duration 
					%s

	            FROM

	                price_promo_opt_temp.promo_product_filter_resim_%s_%s pf)sub12 using(promo_id, product_id)



	            );


%s

	        DROP TABLE IF EXISTS %s;

	        CREATE UNLOGGED TABLE %s AS
			(

	            with opt_offer AS materialized (SELECT

	        *,

	        LEAST(

	            GREATEST(

	                CASE

	                    WHEN offer_type = ''percent_off'' OR offer_type =''upto_x_percent_off'' THEN offer_x_value

	                    WHEN offer_type = ''extra_amount_off'' THEN COALESCE(((offer_x_value / NULLIF(current_price, 0)) * 100), 0)

	                    WHEN offer_type = ''fixed_price'' THEN COALESCE((((current_price - offer_x_value) / NULLIF(current_price,0)) * 100), 0)

	                    WHEN offer_type = ''bxgx_percent_off'' THEN ((offer_z_value * 0.01 * offer_y_value) / (offer_y_value + offer_x_value)) * 100

	                    WHEN offer_type = ''bxgx'' THEN ((offer_y_value / (offer_y_value + offer_x_value)) * 100)

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' AND offer_y_type = ''percent_off'' THEN offer_y_value

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''percent_off'' THEN offer_y_value

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' AND offer_y_type = ''dollar_off'' THEN ((offer_y_value / offer_x_value) * 100)

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''dollar_off'' THEN COALESCE(((offer_y_value / (offer_x_value * NULLIF(current_price,0))) * 100),0)

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''at_dollar'' THEN COALESCE((((current_price - (offer_y_value / offer_x_value)) / NULLIF(current_price,0)) * 100),0)

						WHEN offer_type = ''kit_offer'' THEN calculated_discount_sf

						WHEN offer_type = ''bxgy_offer'' THEN calculated_discount_sf

						WHEN offer_type = ''tiered_offer'' THEN calculated_discount_sf

						WHEN offer_type = ''bmsm_transaction_discount'' AND offer_x_type = ''dollar'' AND offer_y_type = ''percent_off''
							THEN offer_y_value

						WHEN offer_type = ''bmsm_transaction_discount'' AND offer_x_type = ''dollar'' AND offer_y_type = ''dollar_off''
							THEN (offer_y_value / offer_x_value) * 100

						WHEN offer_type = ''bmsm_fixed_quantity'' AND offer_x_type = ''unit'' AND offer_y_type = ''percent_off''
							THEN (offer_y_value)
							
						WHEN offer_type = ''bmsm_fixed_quantity'' AND offer_x_type = ''unit'' AND offer_y_type = ''dollar_off''
							THEN (offer_y_value / (offer_x_value * current_price)) * 100
							
						WHEN offer_type = ''bmsm_fixed_quantity'' AND offer_x_type = ''unit'' AND offer_y_type = ''at_dollar''
							THEN ((current_price - (offer_y_value / offer_x_value)) / NULLIF (current_price,0)) * 100

	                    WHEN offer_type = ''special_offer_type'' and discount_type = ''extra_amount_off'' THEN COALESCE(((discount_value / NULLIF(current_price,0)) * 100),0)

	                    WHEN offer_type = ''special_offer_type'' and discount_type = ''percent_off'' THEN discount_value

	                END,

	                0

	            ),

	            100

	        ) AS calculated_discount,

	        LEAST(

	            GREATEST(

	                CASE

	                    WHEN offer_type = ''percent_off'' OR offer_type =''upto_x_percent_off'' THEN offer_x_value

	                    WHEN offer_type = ''extra_amount_off'' THEN COALESCE(((offer_x_value / NULLIF(avg_current_price,0)) * 100),0)

	                    WHEN offer_type = ''fixed_price'' THEN COALESCE((((avg_current_price - offer_x_value) / NULLIF(avg_current_price,0)) * 100),0)

	                    WHEN offer_type = ''bxgx_percent_off'' THEN ((offer_z_value * 0.01 * offer_y_value) / (offer_y_value + offer_x_value)) * 100

	                    WHEN offer_type = ''bxgx'' THEN ((offer_y_value / (offer_y_value + offer_x_value)) * 100)

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' AND offer_y_type = ''percent_off'' THEN offer_y_value

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''percent_off'' THEN offer_y_value

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' AND offer_y_type = ''dollar_off'' THEN ((offer_y_value / offer_x_value) * 100)

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''dollar_off'' THEN COALESCE(((offer_y_value / (offer_x_value * NULLIF(avg_current_price,0))) * 100),0)

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''at_dollar'' THEN COALESCE((((avg_current_price - (offer_y_value / offer_x_value)) / NULLIF(avg_current_price,0)) * 100),0)

						WHEN offer_type = ''bmsm_fixed_quantity'' AND offer_x_type = ''unit'' AND offer_y_type = ''percent_off''
							THEN (offer_y_value)
							
						WHEN offer_type = ''bmsm_fixed_quantity'' AND offer_x_type = ''unit'' AND offer_y_type = ''dollar_off''
							THEN (offer_y_value / (offer_x_value * current_price)) * 100
							
						WHEN offer_type = ''bmsm_fixed_quantity'' AND offer_x_type = ''unit'' AND offer_y_type = ''at_dollar''
							THEN ((current_price - (offer_y_value / offer_x_value)) / NULLIF (current_price,0)) * 100

	                END * 0.01,

	                0

	            ),

	            1

	        ) AS temp_discount,

	        (

	            CASE

	                WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' THEN COALESCE(offer_x_value / NULLIF(avg_current_price,0),0)

	                WHEN offer_type IN (''bmsm'', ''bxgx'', ''bxgx_percent_off'', ''bmsm_fixed_quantity'') AND offer_x_type = ''unit'' THEN offer_x_value

	            END

	        ) - 1 AS exp_qty --,store_reco_level

	    FROM

	   (

	        SELECT

	            psd.promo_id AS promo_id,product_id,customer_reco_level, l0_id, currency_id, l0_cid, l3_cid, s0_id, s1_id, c0_id,

--	            l1_cid, l2_cid, l4_cid, ecom_shipping_cost, offer_distribution_channel

				store_reco_level,promo_duration,customer_type,product_selection_type, store_selection_type 

				,hierarchy_level_id,

	            scenario_id, discount_level_value AS discount_level_value,

	            COALESCE(tpsd.offer_type_id, psd.offer_type_id) AS offer_type_id,

	            COALESCE(tpsd.offer_type, psd.offer_type) AS offer_type,

	            COALESCE(tpsd.offer_x_value, psd.offer_x_value) AS offer_x_value,

	            COALESCE(tpsd.offer_x_type, psd.offer_x_type) AS offer_x_type,

	            COALESCE(tpsd.offer_y_value, psd.offer_y_value) AS offer_y_value,

	            COALESCE(tpsd.offer_y_type, psd.offer_y_type) AS offer_y_type,

	            COALESCE(tpsd.offer_z_value, psd.offer_z_value) AS offer_z_value,

	            COALESCE(tpsd.offer_z_type, psd.offer_z_type) AS offer_z_type,

	            COALESCE(tpsd.tier_id, psd.tier_id) AS tier_id,

	 			psd.customer_redemption_rate,

	            psd.discount_type,

	            psd.discount_value,

	            psd.customer_reach,

	            psd.offer_type_combined_display_name AS offer_type_combined_display_name,

	            COALESCE(tpsd.max_tier, 1) AS max_tier,

	            COALESCE(tpsd.tiered_offer_indicator, 0) AS tiered_offer_indicator,

	            created_at,msrp, cost, current_price, avg_current_price,

				scan_back, off_invoice, product_level_id,

				psd.end_cap_flag  %s

	        FROM

	            (select * from %s %s ) psd

	        LEFT JOIN

	            price_promo_opt.fn_simulation_tiered_offer_calculation(ARRAY[tier_id]) tpsd USING (tier_id) --%s

	    	) sub2 --USING (promo_id, product_id)

			



	),



	            final_discount AS (

	                SELECT

	                    oo.promo_id,

	                    oo.scenario_id,

	                    oo.discount_level_value,

	                    oo.product_id,oo.store_reco_level,oo.customer_reco_level, oo.l0_cid, oo.l3_cid, oo.s0_id, oo.s1_id, oo.c0_id,

--	                    l1_cid, l2_cid, l4_cid, ecom_shipping_cost

	                    oo.current_price, oo.l0_id, currency_id,

	                    msrp,

	                    oo.cost,                    

	                    promo_duration,

	                    oo.offer_type_id,

	                    oo.offer_type,

	                    oo.offer_x_value,

	                    oo.offer_x_type,

	                    oo.offer_y_value,

	                    oo.offer_y_type,

	                    oo.offer_z_value,

	                    oo.offer_z_type,

	                    oo.tier_id,

	                    --oo.offer_type_combined_display_name,

	                    calculated_discount,

	                    COALESCE(

	                        CASE

								%s

--								WHEN oo.offer_type = ''special_offer_type'' THEN GREATEST(0.3, customer_reach * customer_redemption_rate)
								WHEN oo.offer_type = ''special_offer_type'' THEN customer_reach * customer_redemption_rate

	                            WHEN exp_qty > 0 THEN

								GREATEST(0.3, LEAST(0.98, POWER(0.85, (exp_qty - (LEAST(ROUND((ceil(temp_discount * 10 * 1000) / 1000.0)::numeric, 2), 3) * temp_discount)))))

	                            ELSE 1

	                        END,

	                        1

	                    ) AS penetration_factor,

--	                    offer_distribution_channel,

	                    customer_type,

	                    product_selection_type, store_selection_type,

	                    hierarchy_level_id,

						scan_back, off_invoice, product_level_id,

	                    created_at,
						price_promo.get_offer_description_v2(
                            oo.offer_type::text, oo.offer_x_value::numeric, oo.offer_x_type::text,
                            oo.offer_y_value::numeric, oo.offer_y_type::text,
                            oo.offer_z_value::numeric, tier_id::numeric
                        )::text as offer_type_combined_display_name,

						oo.end_cap_flag

	                FROM opt_offer oo

					%s


	            )


	            SELECT

	                promo_id,

	                scenario_id,

	                discount_level_value,

	                product_id, coalesce(store_reco_level,''1_1'') as store_reco_level, 
					
					coalesce(customer_reco_level,''1'') as customer_reco_level, l0_cid, l3_cid, 
						
					coalesce(s0_id,1) as s0_id,

--	                l1_cid, l2_cid, l4_cid, ecom_shipping_cost

	                current_price, currency_id, l0_id,

	                msrp,

	                cost,

	                promo_duration,

	                created_at,

	                offer_type_id,

	                offer_type,

	                ROUND(calculated_discount::numeric, 2) AS calculated_discount,

	                penetration_factor,

	                case 
						when offer_type in (''kit_offer'',''bxgy_offer'') then calculated_discount 
						else ROUND(COALESCE(calculated_discount * penetration_factor, 0)::numeric, 2) 
					end AS effective_discount,

--	                offer_distribution_channel,

	                customer_type,

	                product_selection_type, store_selection_type,

	                hierarchy_level_id,
					
					(COALESCE(scan_back,0)) as scan_back_per_product,

					(COALESCE(off_invoice,0)) as off_invoice_per_product,

	                CASE when offer_type in (''kit_offer'',''bxgy_offer'') then  ROUND(calculated_discount::numeric / 5) * 5

	                    WHEN offer_type <> ''kit_offer'' and COALESCE(calculated_discount * penetration_factor, 0) >= 95 THEN 95

	                    ELSE FLOOR(COALESCE(calculated_discount * penetration_factor, 0) / 5) * 5 + CASE WHEN COALESCE(calculated_discount * penetration_factor, 0)::numeric %% 5 >= 2.5 THEN 5 ELSE 0 END

	                END::integer AS base_percentage,

	                0 AS offer_identifier,

				ROUND(COALESCE(calculated_discount * penetration_factor, 0)::numeric, 2) AS max_discount_priority_1,
            	ROUND(COALESCE(calculated_discount * penetration_factor, 0)::numeric, 2) AS max_discount_priority_2,
				offer_type_combined_display_name,

				fd.end_cap_flag

	                %s  -- Date columns (or empty if not stacking)



	            FROM

	                final_discount fd

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

	last_refresh_var,

column_list,

var_promo_id,

var_promo_id,

var_promo_id,

var_promo_id,

var_promo_id,

var_promo_id,

var_promo_id,

-- For promo_product_filter table name
column_list,

var_promo_id,

var_scenario_id,

redemption_proc,


temp_table_name, temp_table_name,  -- drop and create

column_list,

temp_disc_changes,


-- for filtering row level simulate

CASE

	WHEN var_is_entire_refresh IS FALSE THEN 'where coalesce(disc_updated_at,now() + INTERVAL ''180 days'') > coalesce(last_refresh_date, now() - INTERVAL ''180 days'')'

	ELSE ' '

END,



var_scenario_id, --for tiered offer function

pen_factor,

redemption_join,

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

var_pccd_table);



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

