--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_create_discount_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_create_discount_filter

DROP PROCEDURE if exists price_promo_opt.pc_simulation_create_discount_filter;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_create_discount_filter(IN var_promo_id integer, IN var_scenario_id integer, IN var_scenario_order_id integer, IN var_stack_flag boolean DEFAULT false, IN var_is_intercept boolean DEFAULT false, IN var_is_entire_refresh boolean DEFAULT true)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$



DECLARE

    query varchar;



	temp_table_name varchar;

	

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

	        temp_table_name := format('price_promo_opt_temp.scenario_disc_filter_date_stack_%s_%s',

	var_promo_id,

	var_scenario_id);

	

	date_columns := ', date, week_start_date';

	

	index_columns := 'l3_cid, brand_cid, s1_id,date, week_start_date';

	

	index_name_suffix := 'stk_idx';

	-- Suffix for the index names when stacking

	join_clause := format('

	            CROSS JOIN

	                (SELECT DISTINCT date_id AS date, week_start_date

	                FROM

	                    (SELECT start_date, end_date FROM price_promo.promo_master WHERE promo_id = %s) pm

	                INNER JOIN

	                    (SELECT fdmi.date_id, fdmi.weeks_start_date AS week_start_date

	                     FROM global.tb_fiscal_date_mapping fdmi) fdm

	                ON fdm.date_id BETWEEN pm.start_date AND pm.end_date) sub3',

	var_promo_id);

	ELSE

	        temp_table_name := format('price_promo_opt_temp.promo_scenario_discount_filter_%s_%s',

	var_promo_id,

	var_scenario_id);

	

	date_columns := '';

	

	index_columns := 'l3_cid, brand_cid, s1_id';

	

	index_name_suffix := '_idx';

	-- No suffix when not stacking

	join_clause := '';

	-- No cross join for the non-stacked version

	END IF;

	-- Construct the main query

	query := format('

	        DROP TABLE IF EXISTS %s;

	        CREATE UNLOGGED TABLE %s AS

	        (

	            WITH

	            disc_changes AS (

	                SELECT

	        promo_id::integer AS promo_id,

	        %s ->''%s''->>''created_at'' AS created_at,

	        %s->''%s''->>''offer_type'' AS offer_type,

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

			l0_cid,l0_id, l1_cid,l2_cid,l3_cid,l4_cid,brand_cid,pdm.currency_id as currency_id,

			s0_id, s1_id,  concat(s0_id, ''_'',s1_id) as store_hierarchy,

	        concat(coalesce(product_level_id,0), ''_'', coalesce(store_level_id,0), ''_'', coalesce(0, customer_level_id,0)) AS discount_level_value,

	        NULL::varchar offer_type_combined_display_name,

	        COALESCE(product_id,0)::integer as product_id,

			COALESCE(0, customer_id,0)::integer as  customer_id,

			offer_distribution_channel,

	        customer_type,

	        product_selection_type,

	        hierarchy_level_id,

	        promo_duration,msrp,COST,msrp_with_vat as current_price,msrp_with_vat as avg_current_price,NULL::integer as ecom_shipping_cost

	    FROM

	        (

	                SELECT distinct

	                psd.promo_id,

	                COALESCE(dlp.product_id, pdm.product_id) product_id,

	                product_level_id,

	                store_level_id, 

	                0 customer_id, 

	                coalesce(0, customer_level_id,0) customer_level_id,

					stm.s0_id, stm.s1_id

	            FROM

	                (select * from price_promo.ps_scenario_discounts WHERE

	                promo_id = %s) psd

				LEFT JOIN

	                price_promo.tb_promo_product_reco_details pprd USING (promo_id, product_level_id)

	            LEFT JOIN

	                price_promo.tb_promo_store_reco_details psrd USING (promo_id, store_level_id)

--	         	LEFT JOIN
--
--	                price_promo.tb_promo_customer_reco_details pcrd USING (promo_id, customer_level_id)

	            LEFT JOIN

	                price_promo.tb_discount_level_stores dls USING (store_level_id)

	            LEFT JOIN

	                price_promo.tb_discount_level_products dlp USING (product_level_id)

--	            LEFT JOIN
--
--	                price_promo.tb_discount_level_customers dlc USING (customer_level_id) 

	

%s

	 			JOIN (SELECT sm.* FROM price_promo.fn_fetch_stores_for_promo(%s) ss

				LEFT join global.tb_store_master sm using(store_id)) stm 

%s

				%s

				JOIN (SELECT product_id FROM price_promo.promo_product_%s pp

				) pdm 

%s

	            WHERE

	                promo_id = %s

	            ) tabl

LEFT JOIN (select product_level_id, store_level_id, coalesce(customer_level_id,0) customer_level_id, scenario_data, ia_recommended_data from price_promo.ps_scenario_discounts WHERE

	                promo_id = %s) na using(product_level_id, store_level_id, customer_level_id)



LEFT JOIN price_promo.product_master pdm using(product_id)



LEFT JOIN price_promo.promo_master using(promo_id)



LEFT JOIN ( SELECT distinct

	                promo_id,

	                hierarchy_level_id,

	                promo_duration

	            FROM

	                price_promo_opt_temp.promo_product_filter_resim_%s_%s pf)sub12 using(promo_id)



	            ) 

	

	,

	            opt_offer AS materialized (SELECT

	        *,

	        LEAST(

	            GREATEST(

	                CASE

	                    WHEN offer_type = ''percent_off'' OR offer_type =''upto_x_percent_off'' THEN offer_x_value

	                    WHEN offer_type = ''extra_amount_off'' THEN ((offer_x_value / current_price) * 100)

	                    WHEN offer_type = ''fixed_price'' THEN (((current_price - offer_x_value) / current_price) * 100)

	                    WHEN offer_type = ''bxgy_percent_off'' THEN ((offer_z_value * 0.01 * offer_y_value) / (offer_y_value + offer_x_value)) * 100

	                    WHEN offer_type = ''bxgy'' THEN ((offer_y_value / (offer_y_value + offer_x_value)) * 100)

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' AND offer_y_type = ''percent_off'' THEN offer_y_value

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''percent_off'' THEN offer_y_value

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' AND offer_y_type = ''dollar_off'' THEN ((offer_y_value / offer_x_value) * 100)

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''dollar_off'' THEN ((offer_y_value / (offer_x_value * current_price)) * 100)

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''at_dollar'' THEN (((current_price - (offer_y_value / offer_x_value)) / current_price) * 100)

						WHEN offer_type = ''special_offer'' and discount_type = ''percent_off'' THEN discount_value

	                    WHEN offer_type = ''special_offer'' and discount_type = ''extra_amount_off'' THEN ((discount_value / current_price) * 100)

	                    WHEN offer_type = ''special_offer'' and discount_type = ''fixed_price'' THEN (((current_price - discount_value) / current_price) * 100)

	                END,

	                0

	            ),

	            100

	        ) AS calculated_discount,

	        LEAST(

	            GREATEST(

	                CASE

	                    WHEN offer_type = ''percent_off'' OR offer_type =''upto_x_percent_off'' THEN offer_x_value

	                    WHEN offer_type = ''extra_amount_off'' THEN ((offer_x_value / avg_current_price) * 100)

	                    WHEN offer_type = ''fixed_price'' THEN (((avg_current_price - offer_x_value) / avg_current_price) * 100)

	                    WHEN offer_type = ''bxgy_percent_off'' THEN ((offer_z_value * 0.01 * offer_y_value) / (offer_y_value + offer_x_value)) * 100

	                    WHEN offer_type = ''bxgy'' THEN ((offer_y_value / (offer_y_value + offer_x_value)) * 100)

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' AND offer_y_type = ''percent_off'' THEN offer_y_value

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''percent_off'' THEN offer_y_value

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' AND offer_y_type = ''dollar_off'' THEN ((offer_y_value / offer_x_value) * 100)

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''dollar_off'' THEN ((offer_y_value / (offer_x_value * avg_current_price)) * 100)

	                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''at_dollar'' THEN (((avg_current_price - (offer_y_value / offer_x_value)) / avg_current_price) * 100)

	                END * 0.01,

	                0

	            ),

	            1

	        ) AS temp_discount,

	        (

	            CASE

	                WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' THEN offer_x_value / avg_current_price

	                WHEN offer_type IN (''bmsm'', ''bxgy'', ''bxgy_percent_off'') AND offer_x_type = ''unit'' THEN offer_x_value

	            END

	        ) - 1 AS exp_qty --,store_hierarchy

	    FROM

	   (

	        SELECT

	            psd.promo_id AS promo_id,product_id,customer_id,

	            l0_cid,l0_id, l1_cid, l2_cid, l3_cid, l4_cid, brand_cid,currency_id,

				s0_id, s1_id,store_hierarchy, ecom_shipping_cost,promo_duration,offer_distribution_channel,customer_type,product_selection_type

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

	            created_at,msrp, cost, current_price, avg_current_price

	        FROM

	            (select * from disc_changes %s ) psd

	        LEFT JOIN

	            price_promo_opt.fn_simulation_tiered_offer_calculation(ARRAY[tier_id]) tpsd USING (tier_id) --%s

	    	) sub2 --USING (promo_id, product_id)

	

	),

	            final_discount AS (

	                SELECT

	                    oo.promo_id,

	                    oo.scenario_id,

	                    oo.discount_level_value,

	                    oo.product_id,oo.store_hierarchy,oo.customer_id,

	                         l0_cid,l0_id, l1_cid, l2_cid, l3_cid, l4_cid, brand_cid,currency_id,

	                        oo.s0_id, oo.s1_id,

	                    oo.current_price,

	                    msrp,

	                    oo.cost,

	                    ecom_shipping_cost,

	                    promo_duration,

	                    oo.offer_type_id,

	                    oo.offer_type,

	                    offer_x_value,

	                    oo.offer_x_type,

	                    offer_y_value,

	                    oo.offer_y_type,

	                    offer_z_value,

	                    oo.offer_z_type,

	                    oo.tier_id,

	                    oo.offer_type_combined_display_name,

	                    calculated_discount,

	                    COALESCE(

	                        CASE

								WHEN offer_type = ''special_offer'' THEN GREATEST(0.3, customer_reach * customer_redemption_rate)

	                            WHEN exp_qty > 0 THEN

	                                GREATEST(0.3, LEAST(0.98, POWER(0.85, (exp_qty - (LEAST(ROUND((ceil(temp_discount * 10 * 1000) / 1000.0)::numeric, 2), 3) * temp_discount)))))

	                            ELSE 1

	                        END,

	                        1

	                    ) AS penetration_factor,

	                    offer_distribution_channel,

	                    customer_type,

	                    product_selection_type,

	                    hierarchy_level_id,

	                    created_at

	                FROM

	                    opt_offer oo

	            )

	            SELECT

	                promo_id,

	                scenario_id,

	                discount_level_value,

	                product_id, store_hierarchy, customer_id,

	                l0_cid,l0_id, l1_cid, l2_cid, l3_cid, l4_cid, brand_cid,currency_id,

	                s0_id, s1_id,

	                current_price,

	                msrp,

	                cost,

	                ecom_shipping_cost,

	                promo_duration,

	                created_at,

	                offer_type_id,

	                offer_type,

	                ROUND(calculated_discount::numeric, 2) AS calculated_discount,

	                penetration_factor,

	                ROUND(COALESCE(calculated_discount * penetration_factor, 0)::numeric, 2) AS effective_discount,

	                offer_distribution_channel,

	                customer_type,

	                product_selection_type,

	                hierarchy_level_id,

	                CASE

	                    WHEN COALESCE(calculated_discount * penetration_factor, 0) >= 95 THEN 95

	                    ELSE FLOOR(COALESCE(calculated_discount * penetration_factor, 0) / 5) * 5 + CASE WHEN COALESCE(calculated_discount * penetration_factor, 0)::numeric %% 5 >= 2.5 THEN 5 ELSE 0 END

	                END::integer AS base_percentage,

	                0 AS offer_identifier,

	                CASE

	                    WHEN COALESCE(calculated_discount * penetration_factor, 0) >= 10 THEN (

	                        COALESCE(

	                            CASE

	                                WHEN product_selection_type IN (2, 3) AND hierarchy_level_id = 2 THEN hd.factor

	                                WHEN product_selection_type = 1 THEN hsd.factor

	                                ELSE 1

	                            END,

	                            1

	                        )

	                    )

	                    ELSE 1

	                END AS halo_effect_factor,

	                CASE

	                    WHEN offer_distribution_channel = 1 THEN app_only_factor

	                    WHEN customer_type = 0 AND offer_distribution_channel = 0 THEN loyalty_factor

	                    ELSE 1

	                END AS loyalty_factor_final,

				ROUND(COALESCE(calculated_discount * penetration_factor, 0)::numeric, 2) AS max_discount_priority_1, 
            	ROUND(COALESCE(calculated_discount * penetration_factor, 0)::numeric, 2) AS max_discount_priority_2

	                %s  -- Date columns (or empty if not stacking)

	

	            FROM

	                final_discount fd

	            LEFT JOIN

	                price_promo_opt.tb_halo_effect_sitewide_factor_opt hsd USING (s1_id)

	            LEFT JOIN

	                price_promo_opt.tb_halo_effect_department_factor_opt hd USING (s1_id, l2_cid)

	            LEFT JOIN

	                price_promo_opt.tb_loyalty_app_factor_opt la USING (s1_id)

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

    temp_table_name, temp_table_name,  -- Table name (DROP and CREATE)

    scenario_json, var_scenario_order_id,

	scenario_json, var_scenario_order_id,

	scenario_json, var_scenario_order_id,

	scenario_json, var_scenario_order_id,

	scenario_json, var_scenario_order_id, scenario_json, var_scenario_order_id, scenario_json, var_scenario_order_id, 

	scenario_json, var_scenario_order_id, scenario_json, var_scenario_order_id, scenario_json, var_scenario_order_id, 

	scenario_json, var_scenario_order_id, scenario_json, var_scenario_order_id, scenario_json, var_scenario_order_id, 

	scenario_json, var_scenario_order_id, scenario_json, var_scenario_order_id, scenario_json, var_scenario_order_id,



	last_refresh_var,

var_promo_id,



CASE

	WHEN store_level_id_tag = 0 THEN 

		'CROSS'

	ELSE 'LEFT'

END,



var_promo_id,

CASE

	WHEN store_level_id_tag = 0 THEN 

		''

	ELSE ' USING(store_id) '

END,



CASE

	WHEN product_level_id_tag = 0 THEN 

		'CROSS'

	ELSE 'LEFT'

END,



var_promo_id,



CASE

	WHEN product_level_id_tag = 0 THEN 

		''

	ELSE ' USING(product_id) '

END,



var_promo_id,



var_promo_id,

-- For promo_product_filter table name



var_promo_id,

var_scenario_id,

  

-- for filtering row level simulate

CASE

	WHEN var_is_entire_refresh IS FALSE THEN 'where coalesce(disc_updated_at,now() + INTERVAL ''180 days'') > coalesce(last_refresh_date, now() - INTERVAL ''180 days'')'

	ELSE ' '

END,



var_scenario_id, --for tiered offer function







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

arr_scenario_id);



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

var_is_intercept );



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