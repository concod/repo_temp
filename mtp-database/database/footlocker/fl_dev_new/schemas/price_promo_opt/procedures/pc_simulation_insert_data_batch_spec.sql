--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_insert_data_batch_spec runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_insert_data_batch_spec

DROP PROCEDURE if exists price_promo_opt.pc_simulation_insert_data_batch_spec;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_insert_data_batch_spec(IN var_promo_id integer, IN var_scenario_id integer, IN var_start_date date, IN var_week_start_date date, IN filter_week_start_date date, IN filter_week_end_date date, IN filter_start_date date, IN filter_end_date date, IN table_name_to_insert character varying, IN table_suffix character varying, IN discount_filter character varying, IN var_stack_flag boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    query varchar;

BEGIN

-- Purpose: Calculates and inserts promotional metrics for scenarios into a results table.
-- Example: CALL price_promo_opt.pc_simulation_insert_data_batch(12345, 100, '2023-01-01', '2023-01-01', '2023-01-01', '2023-01-28', '2023-01-01', '2023-01-28', 'price_promo_opt_temp.promo_results_12345_100', '12345_100', 'price_promo_opt_temp.promo_scenario_discount_filter_12345_100', FALSE);
-- Other Functions Used:
--   * No direct function calls within procedure, but references various simulation tables
-- Tables Used:
--   * price_promo_opt.tb_simulation_week_opt - Weekly elasticity data
--   * price_promo_opt.tb_day_split_opt - Daily sales distribution data
--   * price_promo_opt_temp.promo_simulation_cannibalization_coefficient_* - Cannibalization effects
--   * price_promo_opt_temp.promo_simulation_pf_coefficient_* - Pull-forward effects
--   * Input discount_filter - Contains discount data for simulation
--   * Output table_name_to_insert - Target table for calculated metrics
-- Returns: No direct return value; inserts calculated promotional metrics including sales units,
--   revenue, margin, cannibalization, pull-forward effects, and contribution metrics


    query := format('

        WITH

		cte_0 as materialized
		(
			SELECT product_id, simulation_week_start_date, base_percentage, sales_units, baseline_sales_units, elasticity

            FROM price_promo_opt.tb_simulation_week_opt 

			%s
		)


		,cte_1 as materialized(

			select fd.promo_id,
			    fd.scenario_id,
			    fd.discount_level_value,
			    fd.store_reco_level,
			    fd.customer_reco_level,
			    fd.l0_cid,
			    fd.l0_id,
--			    fd.l1_cid,
--			    fd.l2_cid,
			    fd.l3_cid,
--			    fd.l4_cid,
			    fd.brand_cid,
				fd.s0_id,
			    fd.currency_id,
			    fd.current_price,
			    fd.msrp,
			    fd.cost,
--			    fd.ecom_shipping_cost,
			    fd.promo_duration,
			    fd.created_at,
			    fd.offer_type_id,
			    fd.offer_type,
			    fd.calculated_discount,
			    fd.effective_discount,
--			    fd.offer_distribution_channel,
			    fd.customer_type,
			    fd.product_selection_type,
			    fd.hierarchy_level_id,
			    fd.scan_back_per_product,
			    fd.off_invoice_per_product,
			    fd.offer_identifier,
			    fd.max_discount_priority_1,
			    fd.max_discount_priority_2,
			    fd.offer_type_combined_display_name,
			    fd.end_cap_flag,
fd.customer_reach,
fd.customer_redemption_rate,

				fd.penetration_factor,
			    smw.*

				from %s fd

                INNER JOIN cte_0 smw USING(product_id, base_percentage)

				%s

             )



        ,sub_q as materialized (

                SELECT promo_id, scenario_id, discount_level_value, product_id, currency_id, current_price as current_price_with_vat,(current_price / (1 + COALESCE(vat_percentage, 0)/100)) as current_price, msrp,

                cost, store_reco_level, customer_reco_level, l0_cid, brand_cid, s0_id, l3_cid, penetration_factor,

--				l1_cid, l2_cid, 

				simulation_week_start_date, base_percentage,

                offer_type_id, offer_type,

                calculated_discount,

                effective_discount,
				scan_back_per_product,

				off_invoice_per_product,

				(sales_units 
--                + (COALESCE(end_cap_flag, 0) * COALESCE(end_cap_multiplier, 0))
--                ) * CASE WHEN offer_type = ''reg_price'' THEN reg_price_multiplier ELSE 1 END 
				) AS sales_units_sim,

                baseline_sales_units as baseline_sales_units_sim,

                1 as product_split_ratio, elasticity,

                1+(COALESCE(elasticity,0) * (effective_discount - base_percentage) / 100) AS elasticity_factor,

				1 AS store_split_factor, recommendation_date, day_split_ratio, storesplit_ratio, customersplit_ratio,

                promo_duration,

                NULL::integer AS stacked_baseline_sales_units, -- Use stacked_baseline if stacked, otherwise NULL

				coalesce(vat_percentage::integer,0) as  vat_percentage,
--				max_discount_priority_1, max_discount_priority_2
-- Calculate priority 1 discounted price (pricing offers)
      			(current_price / (1 + COALESCE(vat_percentage, 0)/100)) * (100-COALESCE(max_discount_priority_1, 0)) * 0.01 AS priority_1_discounted_price,
offer_type_combined_display_name


                FROM cte_1

				INNER JOIN (select l3_cid, simulation_week_start_date, date as recommendation_date, day_split_ratio from price_promo_opt.tb_day_split_opt

                            WHERE date BETWEEN ''%s'' AND ''%s'') ds

                USING(l3_cid,simulation_week_start_date)

                INNER JOIN (select simulation_week_start_date,l3_cid,brand_cid, store_reco_level, sum(store_split_ratio) as storesplit_ratio from price_promo_opt.tb_store_split_opt a
--							inner join (select store_id from price_promo.promo_store where promo_id = %s) b using (store_id)

                            WHERE simulation_week_start_date BETWEEN ''%s'' AND ''%s''

							group by simulation_week_start_date, l3_cid, brand_cid, store_reco_level
						   ) ss

                USING(simulation_week_start_date,l3_cid,brand_cid,store_reco_level)

				INNER JOIN (select distinct simulation_week_start_date, customer_reco_level, sum(customer_split_ratio) as customersplit_ratio from price_promo_opt.tb_customer_split_opt a
							inner join (select customer_id from price_promo.fn_fetch_customers_for_promo(%s)) b using (customer_id)

                            WHERE simulation_week_start_date BETWEEN ''%s'' AND ''%s''

							group by simulation_week_start_date, customer_reco_level) cs

                USING(simulation_week_start_date,customer_reco_level)

				LEFT JOIN (select s0_id ::integer s0_id, vat_percentage*100::integer as vat_percentage from  global.tb_vat_master) vm using(s0_id)


                ),



        subquery_calc AS materialized  (
				select *, 

				case when offer_type in (''kit_offer'', ''bxgy_offer'',''tired_offer'',''special_offer'') 
 					then (current_price * (100-final_effective_discount) * 0.01 )
					else  (current_price * (100-effective_discount) * 0.01)
				end AS discounted_price,

				case when offer_type in (''kit_offer'', ''bxgy_offer'',''tired_offer'',''special_offer'') 
					then (current_price * (100-final_effective_discount) * 0.01 * (1 + COALESCE(vat_percentage, 0)/100))
					else (current_price * (100-effective_discount) * 0.01 * (1 + COALESCE(vat_percentage, 0)/100))
				end AS discounted_price_with_vat

				from
				(
					select *, (forcasted_sales_units/(1+(COALESCE(elasticity,0) * calculated_discount) :: numeric)) as final_effective_discount
					from
					(
						select *, 


--baseline_sales_units+ ((sales_units_store_day - baseline_sales_units)*penetration_factor) as forcasted_sales_units

CASE
    WHEN offer_type = ''special_offer'' THEN
        baseline_sales_units
        + ((sales_units_store_day - baseline_sales_units)
            * COALESCE(customer_reach, 1)
            * COALESCE(customer_redemption_rate, 1))

    WHEN offer_type IN (''kit_offer'',''bxgy_offer'',''tired_offer'') THEN
        baseline_sales_units
        + ((sales_units_store_day - baseline_sales_units)
            * COALESCE(penetration_factor, 1))

    ELSE
        baseline_sales_units
        + (sales_units_store_day - baseline_sales_units)

END
AS forcasted_sales_units

			
							from
							(
				
					            SELECT sq.*, pm.l0_id, pm.l1_id, pm.l2_id, pm.l3_id, pm.brand, 
					
					            elasticity_factor  * day_split_ratio * storesplit_ratio * customersplit_ratio * sales_units_sim AS sales_units_store_day,
					
					            baseline_sales_units_sim * day_split_ratio * storesplit_ratio * customersplit_ratio AS baseline_sales_units
					
					            FROM sub_q sq
								
								inner join price_promo.product_master pm using (product_id)
							) a
					)b
				)c 
			)

			

        INSERT INTO %s

        (promo_id, scenario_id, product_id, currency_id, recommendation_date,-- store_reco_level,
		store_reco_level,customer_reco_level, discount_level_value,

        offer_type_id, effective_discount, original_cost, discounted_price,

        sales_units, baseline_sales_units, incremental_sales_units, revenue, baseline_revenue, incremental_revenue,

        margin_wo_vf, margin, baseline_margin, incremental_margin, scan_back, off_invoice, tot_vendor_fund, promo_spend,
 
		affinity_units, cannibalization_units, pull_forward_units,
		affinity_revenue, cannibalization_revenue, pull_forward_revenue, 
		affinity_margin, cannibalization_margin, pull_forward_margin, 

		contribution_revenue, contribution_margin,vat_percentage, coupon_spend,offer_type_combined_display_name)


        SELECT

            promo_id::int4 AS promo_id,

            scenario_id::int4 AS scenario_id,

            product_id::int8 AS product_id,

			currency_id::int4 as currency_id,

            recommendation_date::date AS recommendation_date,

			store_reco_level,

			customer_reco_level,

            null as discount_level_value,

            offer_type_id::int4 AS offer_type_id,

            effective_discount::int4 AS effective_discount,

            cost::float8 AS original_cost,

            discounted_price_with_vat::float8 AS discounted_price,

            sales_units::float8 AS sales_units,

            baseline_sales_units::float8 AS baseline_sales_units,

            (sales_units - baseline_sales_units)::float8 AS incremental_sales_units,

            (sales_units * discounted_price)::float8 AS revenue,

            (baseline_sales_units * current_price)::float8 AS baseline_revenue,

            ((sales_units * discounted_price) - (baseline_sales_units * current_price))::float8 AS incremental_revenue,

            (sales_units * (discounted_price - cost))::float8 AS margin_wo_vf,
			((sales_units * (discounted_price - cost)) + ((scan_back_per_product + off_invoice_per_product) * sales_units))::float8 AS margin,

            (baseline_sales_units * (current_price - cost))::float8 AS baseline_margin,

			(((sales_units * (discounted_price - cost)) + ((scan_back_per_product + off_invoice_per_product) *sales_units))- 
			(baseline_sales_units * (current_price - cost)))::float8 AS incremental_margin,

			(scan_back_per_product* sales_units) as scan_back,

			(off_invoice_per_product* sales_units) as off_invoice,

			((scan_back_per_product+off_invoice_per_product)* sales_units) as tot_vendor_fund,

            (sales_units * (current_price - discounted_price)) AS promo_spend,

            0 as affinity_units, 0 as cannibalized_units, 0 as pf_sales_units,

            0 AS affinity_revenue, 0 AS cannibalization_revenue, 0 AS pull_forward_revenue,
			
            0 AS affinity_margin, 0 AS cannibalization_margin, 0 AS pull_forward_margin,

			0 AS contribution_revenue, 0 AS contribution_margin,

			vat_percentage,
			(sales_units * (current_price - discounted_price)) - (sales_units * (current_price - priority_1_discounted_price)) AS coupon_spend,
			offer_type_combined_display_name

            FROM (select subquery_calc.*, 0 as cannibalized_units, 0 as pf_sales_units, 0 as affinity_units, 0 as affinity_margin, 0 as affinity_revenue,

					(sales_units_store_day)::float8 as sales_units
--					(sales_units_store_day + affinity_units + pf_sales_units + cannibalized_units)::float8 as tot_sales_units

					from subquery_calc
					
				) subx

			--	LEFT JOIN price_promo_opt.tb_business_metrics_config_opt using(store_reco_level)



        ',

-- cte_0

format(' WHERE simulation_week_start_date BETWEEN %L AND %L', filter_week_start_date, filter_week_end_date),


--cte_1

discount_filter,

CASE WHEN var_stack_flag THEN format('where date between %L and %L',filter_start_date,filter_end_date)  ELSE '' END,

--sub_q


filter_start_date, filter_end_date,

var_promo_id,

 filter_week_start_date, filter_week_end_date,

var_promo_id,

filter_week_start_date, filter_week_end_date,

        -- table_insert

        table_name_to_insert

    );



    -- Print the query

    RAISE NOTICE '%', query;



    -- Execute the query

    EXECUTE query;



END;

$procedure$
;

