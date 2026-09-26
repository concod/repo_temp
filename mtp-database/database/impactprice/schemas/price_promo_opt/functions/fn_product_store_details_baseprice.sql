--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_product_store_details_baseprice runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_product_store_details_baseprice

DROP FUNCTION if exists price_promo_opt.fn_product_store_details_baseprice;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_product_store_details_baseprice(var_promo_ids integer[])
 RETURNS TABLE(promo_id integer, start_date date, end_date date, promo_name character varying, offer_type character varying, product_level_id integer, store_level_id integer, scenario_id integer, offer_type_id integer, offer_x_value double precision, offer_x_type character varying, offer_y_value double precision, offer_y_type character varying, offer_z_value double precision, offer_z_type character varying, l0_id integer, currency_id integer, l0_cid integer, l3_cid integer, store_reco_level character varying, s0_id integer, s1_id integer, store_id integer, c0_id integer, discount_level_value character varying, offer_type_combined_display_name character varying, product_id integer, customer_reco_level character varying, customer_type character varying, product_selection_type character varying, store_selection_type character varying, hierarchy_level_id integer, promo_duration integer)
 LANGUAGE plpgsql
 STABLE
 SET enable_nestloop TO 'off'
AS $function$

DECLARE

    query varchar;
	var_promo_id INTEGER;

BEGIN

-- Purpose: Returns promotional details for multiple promo_ids.
-- Example: SELECT * FROM price_promo_opt.fn_product_store_details_baseprice(ARRAY[434, 435, 436]);
-- Other Functions Used:
--   * price_promo.fn_fetch_stores_for_promo - Retrieves stores eligible for the promotion
--   * price_promo.fn_fetch_products_for_promo - Retrieves products eligible for the promotion
--   * price_promo.fn_fetch_customers_for_promo - Retrieves customers eligible for the promotion
-- Tables Used:
--   * price_promo.ps_scenario_discounts - Stores scenario discount configurations
--   * price_promo.tb_discount_level_stores - Store discount level mappings
--   * price_promo.tb_discount_level_products - Product discount level mappings
--   * price_promo.tb_discount_level_customers - Customer discount level mappings
--   * price_promo.product_master - Product master data
--   * price_promo.promo_master - Promotion master data
--   * price_promo.tb_product_store_price - Product store pricing
-- Returns: Table with all promotional details including calculated discounts

	-- Loop through each promo_id in the array
	FOREACH var_promo_id IN ARRAY var_promo_ids LOOP
	
		RAISE NOTICE 'Processing promo_id: %', var_promo_id;

		-- Construct the query for this promo_id
		query := format('

			with cte0 as 
			(
	            -- Get metrics from scenarios
	            SELECT 
	                sm.promo_id,
	                sm.scenario_order_id, scenario_name,
	                pm.last_approved_scenario_id
	                
	            from price_promo.scenario_master sm
	            join price_promo.promo_master pm on sm.scenario_id = pm.last_approved_scenario_id
	            where pm.promo_id = %s
        	)

			,flattened_scenarios AS Materialized
			(
	            select b.promo_id, scenario_order_id, scenario_name,
	                last_approved_scenario_id, product_level_id, store_level_id, customer_level_id, scenario_key, scenario_data 
				from 
				(
	            SELECT psd.promo_id, psd.product_level_id,psd.store_level_id,coalesce(psd.customer_level_id,0) as customer_level_id,
	                   key::TEXT AS scenario_key, value AS scenario_data
	                   
	            FROM price_promo.ps_scenario_discounts psd,
	                 jsonb_each(psd.scenario_data)
	                 
	            WHERE psd.promo_id = %s 
			           
				) a 
				join cte0 b on a.scenario_key::int = b.scenario_order_id
			           
			)

			
				SELECT
				pdm.promo_id::integer AS promo_id,
				pm.start_date, pm.end_date, price_promo.impute_special_characters(pm.name):: character varying as promo_name,
				pdm.offer_type,
				pdm.product_level_id::integer as product_level_id , pdm.store_level_id::integer as store_level_id,
				pdm.scenario_id,
				pdm.offer_type_id,
				pdm.offer_x_value,
				pdm.offer_x_type,
				pdm.offer_y_value,
				pdm.offer_y_type,
				pdm.offer_z_value,
				pdm.offer_z_type,
				pdm.l0_id, pdm.currency_id as currency_id, pdm.l0_cid, pdm.l3_cid,
				store_reco_level::varchar as store_reco_level, s0_id, s1_id, store_id, c0_id,

				concat(coalesce(product_level_id,0), ''_'', coalesce(store_level_id,0), ''_'', coalesce(customer_level_id,0))::varchar AS discount_level_value,

				NULL::varchar offer_type_combined_display_name,

				COALESCE(product_id,0)::integer as product_id,

				customer_reco_level::varchar as customer_reco_level,

				pdm.customer_type::varchar as customer_type,

				pdm.product_selection_type::varchar as product_selection_type, 

				pdm.store_selection_type::varchar as store_selection_type,

				pdm.hierarchy_level_id::integer as hierarchy_level_id

				,pdm.promo_duration::integer as promo_duration
--, promo_base_price::double precision  as msrp, pdm.COST::double precision as cost, promo_base_price::double precision  as current_price, promo_base_price::double precision  as avg_current_price
-----------------------------------------------------------------------------
			FROM

				(

						SELECT
						 tab1.promo_id, 
						 tab1.product_id, 
						 store_reco_level, 
						 customer_reco_level,
--						 coalesce(tpsp.promo_base_price, pdmi.promo_base_price) as promo_base_price,
--						 coalesce(tpsp.cost, pdmi.cost) as cost, 
						 scenario_data, product_level_id, pmm.updated_at,
						 pmm.last_simulation_time, last_optimized_time, l0_id, pdmi.currency_id, l0_cid, l3_cid, s0_id, s1_id, sr.store_id, c0_id, tab1.store_level_id,
						 tab1.customer_level_id, customer_type, product_selection_type, store_selection_type, null as hierarchy_level_id,
						 null as promo_duration,
			
						(scenario_data->>''offer_type'')::varchar AS offer_type,

						
						(scenario_data->>''scenario_id'')::integer AS scenario_id,
						(scenario_data->>''offer_type_id'')::integer AS offer_type_id,
						
						(scenario_data->>''offer_x_value'')::float AS offer_x_value,
						(scenario_data->>''offer_x_type'')::varchar AS offer_x_type,
						
						(scenario_data->>''offer_y_value'')::float AS offer_y_value,
						(scenario_data->>''offer_y_type'')::varchar AS offer_y_type,
						
						(scenario_data->>''offer_z_value'')::float AS offer_z_value,
						(scenario_data->>''offer_z_type'')::varchar AS offer_z_type
						
						

 
	FROM

				(
				
				SELECT 
					ps.promo_id, 
					ss.product_id,
					ps.product_level_id, 
					ps.store_level_id, 
					COALESCE(ps.customer_level_id, 0) AS customer_level_id, scenario_data
				FROM flattened_scenarios ps
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
					COALESCE(ps.customer_level_id, 0) AS customer_level_id, scenario_data
				FROM flattened_scenarios ps
				LEFT JOIN price_promo.tb_discount_level_products dls 
					USING (product_level_id)
				LEFT JOIN price_promo.fn_fetch_products_for_promo(%s) ss 
					ON ss.promo_id = ps.promo_id
				WHERE ps.promo_id = %s 
				  AND dls.product_id IS NULL
				GROUP BY 1, 2, 3, 4, 5, 6
			)tab1

	LEFT JOIN (
		select distinct store_level_id, store_reco_level, s0_id, s1_id, ss.store_id from pricesmart.tb_store_master
		inner join
		(
		
		SELECT 
			ss."store_id", 
			ps.store_level_id
		FROM flattened_scenarios ps
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
		FROM flattened_scenarios ps
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
			flattened_scenarios ps						
			left join price_promo.tb_discount_level_customers dls using (customer_level_id)
			left join price_promo.fn_fetch_customers_for_promo(%s) ss using (promo_id)
		) using (customer_id)
	) cr on cr.customer_level_id = tab1.customer_level_id
--	left join price_promo.tb_product_store_price tpsp
--		on tpsp.product_id = tab1.product_id and tpsp.store_id = sr.store_reco_level::integer
	left join price_promo.product_master pdmi
		on tab1.product_id = pdmi.product_id
	left join price_promo.promo_master pmm on tab1.promo_id = pmm.promo_id

) pdm 
left join price_promo.promo_master pm using(promo_id)

---------------------------------------------------------------------------------------------------------------------------------------
',

		-- Replace all hardcoded promo_id values with var_promo_id
		var_promo_id, var_promo_id,
		var_promo_id, -- fn_fetch_products_for_promo
		var_promo_id, -- WHERE ps.promo_id
		var_promo_id, -- fn_fetch_products_for_promo (second)
		var_promo_id, -- WHERE ps.promo_id (second)
		var_promo_id, -- fn_fetch_stores_for_promo
		var_promo_id, -- WHERE ps.promo_id (stores)
		var_promo_id, -- fn_fetch_stores_for_promo (second)
		var_promo_id, -- WHERE ps.promo_id (stores second)
		var_promo_id, -- WHERE promo_id (customers)
		var_promo_id  -- fn_fetch_customers_for_promo
	);
-- Debug: print full query
RAISE NOTICE 'Executing query for promo_id %:%', var_promo_id, query;

	-- Execute the query and return results directly
	RETURN QUERY EXECUTE query;

	RAISE NOTICE 'Completed processing for promo_id: %', var_promo_id;

	END LOOP; -- End of FOREACH loop

	RAISE NOTICE 'Finished processing all promo_ids';

	RETURN;

END;

$function$
;
