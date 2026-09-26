--liquibase formatted sql
--changeset bingimalla.divyasree@impactanalytics.co:pc_simulation_insert_data_batchv1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  changes for pc_simulation_insert_data_batchv1

DROP PROCEDURE if exists price_promo_opt.pc_simulation_insert_data_batch;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_insert_data_batch(IN var_promo_id integer, IN var_scenario_id integer, IN var_start_date date, IN var_week_start_date date, IN filter_week_start_date date, IN filter_week_end_date date, IN filter_start_date date, IN filter_end_date date, IN table_name_to_insert character varying, IN table_suffix character varying, IN discount_filter character varying, IN var_stack_flag boolean DEFAULT false)
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


    -- Determine which cannibalization and PF coefficient tables to use based on var_stack_flag

--    IF var_stack_flag THEN
--
--        cannibalization_table_suffix := 'cannibalization_coefficient_stack_' || table_suffix;
--
--        pf_coefficient_table_suffix := 'pf_coefficient_stack_' || table_suffix;
--
--        
--
--         EXECUTE format('SELECT COUNT(*) FROM price_promo_opt_temp.promo_simulation_%s WHERE promo_date BETWEEN ''%s'' AND ''%s''',
--
--                   pf_coefficient_table_suffix, filter_start_date, filter_end_date)
--
--        INTO pf_count;

--    ELSE

--        cannibalization_table_suffix := 'cannibalization_coefficient_' || table_suffix;
--
--        pf_coefficient_table_suffix := 'pf_coefficient_' || table_suffix;
--
--
--        EXECUTE format('SELECT COUNT(*) FROM price_promo_opt_temp.promo_simulation_%s WHERE week_start_date BETWEEN ''%s'' AND ''%s''',
--
--                   pf_coefficient_table_suffix, filter_week_start_date, filter_week_end_date)
--
--        INTO pf_count;

--    END IF;


    query := format('

        WITH

		cte_0 as materialized
		(
			SELECT product_id, simulation_week_start_date, date %s, base_percentage, sales_units, baseline_sales_units, elasticity, day_split_ratio, end_cap_multiplier, reg_price_multiplier

            FROM price_promo_opt.tb_simulation_day_opt 

			%s
		),

		cte_1 as materialized

			(select fd.promo_id,
			    fd.scenario_id,
			    fd.discount_level_value,
			    fd.store_reco_level,
			    fd.customer_reco_level,
			    fd.l0_cid,
			    fd.l0_id,
--			    fd.l1_cid,
--			    fd.l2_cid,
--			    fd.l3_cid,
--			    fd.l4_cid,
--			    fd.brand_cid,
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
			    fd.halo_effect_factor,
			    fd.max_discount_priority_1,
			    fd.max_discount_priority_2,
			    fd.offer_type_combined_display_name,
			    fd.end_cap_flag,
			    smw.*  

				from %s fd

                INNER JOIN cte_0 smw USING(product_id, base_percentage %s)

			 %s

             ),



        sub_q as materialized (

                SELECT promo_id, scenario_id, discount_level_value, product_id, currency_id, current_price as current_price_with_vat,(current_price / (1 + COALESCE(vat_percentage, 0)/100)) as current_price, msrp,

                cost, store_reco_level, customer_reco_level, l0_cid,

--				brand_cid, l1_cid, l2_cid, l3_cid, 

				simulation_week_start_date, base_percentage,

                offer_type_id, offer_type,

                calculated_discount,

                effective_discount,
				scan_back_per_product,

				off_invoice_per_product,

                COALESCE(0, 0) AS pf_coefficient,

                --COALESCE(attractiveness_factor, 1)

                1 AS attractiveness_factor,

				((sales_units
                + (COALESCE(end_cap_flag, 0) * COALESCE(end_cap_multiplier, 0))
                ) * CASE WHEN offer_type = ''reg_price'' THEN reg_price_multiplier ELSE 1 END 
				) AS sales_units_sim,

                baseline_sales_units as baseline_sales_units_sim,

                1 as product_split_ratio,

                1+(COALESCE(elasticity,0) * (effective_discount - base_percentage) / 100) AS elasticity_factor,

                --store_split 
				1 AS store_split_factor, %s recommendation_date, day_split_ratio,

                promo_duration, NULL:: integer discount_level,

                COALESCE(0, 1) AS fatigue_factor,

                COALESCE(0, 0) AS cb_coefficient,

              --  loyalty_factor_final,

                halo_effect_factor,

--                COALESCE( (0, pc.factor * COALESCE(NULLIF(ds.week_no-1, 0) * week_dampening_factor, 1)),
--
--                            (day_split_ratio ) * COALESCE(ff.factor, 1))

                (current_price / (1 + COALESCE(vat_percentage, 0)/100)) * (100-effective_discount) * 0.01 AS discounted_price,
                (current_price / (1 + COALESCE(vat_percentage, 0)/100)) * (100-effective_discount) * 0.01 * (1 + COALESCE(vat_percentage, 0)/100) AS discounted_price_with_vat,
                --%s
                NULL::integer AS stacked_baseline_sales_units, -- Use stacked_baseline if stacked, otherwise NULL

				coalesce(vat_percentage::integer,0) as  vat_percentage,
--				max_discount_priority_1, max_discount_priority_2
-- Calculate priority 1 discounted price (pricing offers)
      			(current_price / (1 + COALESCE(vat_percentage, 0)/100)) * (100-COALESCE(max_discount_priority_1, 0)) * 0.01 AS priority_1_discounted_price,
offer_type_combined_display_name


                FROM cte_1

--                INNER JOIN (select week_start_date,l3_cid,brand_cid, store_reco_level, store_split from price_promo_opt_temp.promo_simulation_store_level_data_%s
--
--                            WHERE week_start_date BETWEEN ''%s'' AND ''%s'') ss
--
--                USING(week_start_date,l3_cid,brand_cid,store_reco_level)

				LEFT JOIN (select l0_cid ::integer l0_cid, vat_percentage*100::integer as vat_percentage from  global.tb_vat_master) vm using(l0_cid)


                ),

        subquery_calc AS materialized  (

            SELECT sq.*, pm.l0_id, pm.l1_id, pm.l2_id, pm.l3_id, pm.brand, 

            elasticity_factor  * store_split_factor * 
1
--loyalty_factor_final 
* sales_units_sim AS sales_units_store_day,

           store_split_factor *
1
-- loyalty_factor_final 
* baseline_sales_units_sim AS baseline_sales_units,



--            elasticity_factor  * store_split_factor * 
--1
----loyalty_factor_final 
--* sales_units_sim * ( halo_effect_factor - 1 ) as affinity_units,

            coalesce(store_split_factor * 
1
--loyalty_factor_final
* pf_coefficient * product_split_ratio,0) AS pull_forward_units

            FROM sub_q sq
inner join price_promo.product_master pm using (product_id)),

			cannibalization_cte1 AS materialized
			(
				select victim_brand, 
				(sum( (case when cannibalizer_brand_sales < (min_value * day_split_median) then 0
								when cannibalizer_brand_sales > (max_value * day_split_median) then 1 
								else ((cannibalizer_brand_sales - (min_value * day_split_median))/((max_value * day_split_median) - (min_value*day_split_median))) end ) *multiplier * day_split_median)) as tot_cann_reducer
				from
					(	select victim_brand, cannibalizer_brand, cannibalizer_brand_sales, min_value, max_value, multiplier, PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY day_split_ratio) AS day_split_median
						from price_promo_opt_temp.promo_simulation_cannibalization_coefficient%s_%s a
						
						inner join cte_0 b on 
						a.product_id = b.product_id and 
						ROUND(a.effective_discount::numeric / 5) * 5 = b.base_percentage and 
						a.recommendation_date = %L
						
						group by victim_brand, cannibalizer_brand, cannibalizer_brand_sales, min_value, max_value, multiplier
					) t1
				group by victim_brand
			),

			cannibalization_cte2 AS materialized  
			(
				select t1.product_id, (((t1.sales_units_store_day/nullif(victimbrand_sales,0)) * final_forcast) - t1.sales_units_store_day)  as cannibalized_units
				from
				(
					select victim_brand, victimbrand_sales,
					case when (victimbrand_sales + tot_cann_reducer) < 0 
						 then (victimbrand_sales*0.05) else (victimbrand_sales + tot_cann_reducer)
				    end as final_forcast

					from
					(
						select victim_brand, sum(sales_units_store_day) as victimbrand_sales, tot_cann_reducer
						
						from subquery_calc as t1
	
						inner join cannibalization_cte1 as t2
							on (t1.l0_id::text || ''_'' || t1.l1_id::text || ''_'' || t1.l2_id::text || ''_'' || t1.l3_id::text || ''_'' || t1.brand::text) = t2.victim_brand
						group by victim_brand, tot_cann_reducer
					) as t3
				) as t2
				inner join subquery_calc as t1 on (t1.l0_id::text || ''_'' || t1.l1_id::text || ''_'' || t1.l2_id::text || ''_'' || t1.l3_id::text || ''_'' || t1.brand::text) = t2.victim_brand
			)
,

			pull_forward AS materialized  
			(
				select product_id, 
				case 
					when ABS(pf_sales) > sales_units_store_day then (sales_units_store_day * 0.02 * -1)
					else pf_sales end as pf_sales_units
				from
				(
					select t1.product_id, sales_units_store_day, (sum(lag_units)*day_split_ratio) as pf_sales
					
					from subquery_calc as t1
	
					inner join price_promo_opt_temp.promo_simulation_pf_coefficient%s_%s as t2 
					on t1.product_id = t2.product_id and t1.recommendation_date = t2.date
	
					group by t1.product_id, sales_units_store_day, day_split_ratio
				) a
			)

,cte_4 as materialized
		(
			select a.product_id as driven_product_id, sub_dept, promo_base_price, cost, (a.baseline_sales_units * 1.05) as fivepercent_sales,
			((baseline_sales_units/sum(baseline_sales_units) over (partition by sub_dept)) *100) as driven_sub_dept_product_split
			from cte_0 a
			inner join (select distinct driven_product_id, sub_dept, promo_base_price, cost from price_promo_opt_temp.promo_simulation_halo_coefficient%s_%s_driven where %L = any(recommendation_dates)) b 
			on a.product_id = b.driven_product_id and a.base_percentage = 0 
		)

,cte_5 as materialized
		(
			select driven_product_id, driven_product_sales, sub_dept,
			driven_product_sales * promo_base_price as driven_product_rev, 
			(driven_product_sales * (promo_base_price - cost)) as driven_product_mar
			from
			(
				select driven_product_id, sub_dept, promo_base_price, cost, least((driven_sub_dept_product_split*driving_sub_dept_sales), fivepercent_sales) as driven_product_sales
				from cte_4 a
				inner join
				(
					select sub_dept, 
					(sum( (case when sales_units_store_day < (min_value * day_split_ratio) then 0
								when sales_units_store_day > (max_value * day_split_ratio) then 1 
								else ((sales_units_store_day - (min_value * day_split_ratio))/((max_value * day_split_ratio) - (min_value*day_split_ratio))) end ) *multiplier * day_split_ratio)) as driving_sub_dept_sales
					from subquery_calc a
					inner join price_promo_opt_temp.promo_simulation_halo_coefficient%s_%s_driving b 
					using (product_id)
					group by sub_dept
				) b using (sub_dept)
			) c
		)

,halo AS materialized  
			(				
				select b.product_id,
				sum(driven_product_sales) as affinity_units, 
				sum(driven_product_rev) as affinity_revenue,
				sum(driven_product_mar) as affinity_margin
				from cte_5 a
				inner join 
				price_promo_opt_temp.promo_simulation_halo_coefficient%s_%s_driving b using (sub_dept)	
				group by b.product_id									
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

--            s0_id::int8 AS s0_id,
--
--            s1_id::int8 AS s1_id,

			store_reco_level,

			customer_reco_level,

            NULL::int8 AS discount_level_value,

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

            COALESCE(affinity_units,0) as affinity_units, 
			COALESCE(cannibalized_units,0) as cannibalized_units, 
			COALESCE(pf_sales_units,0) as pf_sales_units,


            least((baseline_sales_units * current_price*0.05),COALESCE(affinity_revenue,0))::float8 AS affinity_revenue,

            COALESCE((cannibalized_units * discounted_price),0) ::float8 AS cannibalization_revenue,

            COALESCE((pf_sales_units * discounted_price),0)::float8 AS pull_forward_revenue,

				
            case when COALESCE(affinity_margin,0) = 0 then 0
			else least((baseline_sales_units * (current_price - cost)*0.05), COALESCE(affinity_margin,0)) :: float8 
			end AS affinity_margin,

            COALESCE((cannibalized_units * (discounted_price-cost)),0)::float8 AS cannibalization_margin,

            COALESCE((pf_sales_units * (discounted_price-cost)),0)::float8 AS pull_forward_margin,

	--		round(coalesce((sales_units * discounted_price) * gross_shipped_rate / 100 * (1 - return_rate / 100),0)::numeric,2)
			0 AS contribution_revenue,

--			round(coalesce(((sales_units * discounted_price) * gross_shipped_rate / 100 * (1 - return_rate / 100) *
--
--			((((sales_units * (discounted_price - cost)) / NULLIF(sales_units * discounted_price, 0)) - (net_gm_buffer_percent / 100)) - (variable_sales_percent / 100 )- (marketing_cost_percent / 100) )
--
--			- (sales_units * fulfilment_cost_dollar)),0)::numeric,2)
			0 AS contribution_margin,

			vat_percentage,
			(sales_units * (current_price - discounted_price)) - (sales_units * (current_price - priority_1_discounted_price)) AS coupon_spend,
			offer_type_combined_display_name



            FROM (select subquery_calc.*, cann.cannibalized_units, pf.pf_sales_units, h.affinity_units, h.affinity_margin, h.affinity_revenue,

					(sales_units_store_day)::float8 as sales_units,
					(sales_units_store_day + affinity_units + pf_sales_units + cannibalized_units)::float8 as tot_sales_units

					from subquery_calc
					left join cannibalization_cte2 as cann using (product_id) 
					left join pull_forward as pf using (product_id) 
					left join halo as h using (product_id) 
					
				) subx

			--	LEFT JOIN price_promo_opt.tb_business_metrics_config_opt using(store_reco_level)



        ',

-- cte_0
CASE WHEN var_stack_flag THEN 'AS date'  ELSE ' AS recommendation_date' END,

format(' WHERE date BETWEEN %L AND %L', filter_start_date, filter_end_date),


--cte_1

discount_filter,

CASE WHEN var_stack_flag THEN ',date' ELSE '' END,

CASE WHEN var_stack_flag THEN
           format(' WHERE date BETWEEN %L::date AND %L::date', filter_start_date, filter_end_date)
ELSE
           format(' WHERE recommendation_date BETWEEN %L::date AND %L::date', filter_start_date, filter_end_date)
END,

--sub_q
 CASE WHEN var_stack_flag THEN 'date as ' ELSE '' END,

 CASE WHEN var_stack_flag THEN 'stacked_baseline_sales_units' ELSE 'NULL' END,

 table_suffix,

 filter_week_start_date, filter_week_end_date,

-- cannibalization
case when var_stack_flag then '_stack' else '' END,
table_suffix,
filter_start_date,
-- pull forward
case when var_stack_flag then '_stack' else '' END,
table_suffix,

-- halo
case when var_stack_flag then '_stack' else '' END,
table_suffix,
filter_start_date,
case when var_stack_flag then '_stack' else '' END,
table_suffix,
case when var_stack_flag then '_stack' else '' END,
table_suffix,

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
