--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_insert_data_batch_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_insert_data_batch_stack

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_insert_data_batch_stack;

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_insert_data_batch_stack(IN var_promo_id integer, IN arr_scenario_id integer[], IN var_start_date date, IN var_week_start_date date, IN filter_week_start_date date, IN filter_week_end_date date, IN filter_start_date date, IN filter_end_date date, IN table_name_to_insert text, IN table_suffix text, IN discount_filter text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query TEXT;
    cannibalization_count INTEGER;
BEGIN
    -- Check if the cannibalization table is empty
    EXECUTE format('SELECT COUNT(*) FROM price_promo_opt_temp.promo_simulation_cannibalization_coefficient_stack_%s WHERE promo_date BETWEEN ''%s'' AND ''%s''',
                   table_suffix, filter_start_date, filter_end_date)
    INTO cannibalization_count;

    query := format('
        WITH
        cte_1 as materialized (select * from %s fd

               -- LEFT JOIN price_promo_opt_temp.promo_simulation_offer_attractiveness_factor_%s
               -- oaf USING(product_id, scenario_id, effective_discount)

                INNER JOIN (
                    SELECT *
                    FROM price_promo_opt.tb_simulation_week_opt WHERE week_start_date BETWEEN ''%s'' AND ''%s''
                ) smw USING(week_start_date, product_id, base_percentage)
                ),

        sub_q as materialized (
                SELECT promo_id, scenario_id, discount_level_value, product_id, current_price, msrp,
                case when s1_id = 1 then cost + ecom_shipping_cost else cost end as cost,
                ecom_shipping_cost, s0_id, s1_id,
                offer_type_id, offer_type,

                calculated_discount,
                effective_discount,
                COALESCE(pf_coefficient, 0) AS pf_coefficient,
                --COALESCE(attractiveness_factor, 1)
                1 AS attractiveness_factor,
                case when s1_id = 1 then ecom_sales_units else bnm_sales_units end as sales_units_sim,
                case when s1_id = 1 then ecom_baseline_sales_units else bnm_baseline_sales_units end as baseline_sales_units_sim,
                case when s1_id = 1 then ecom_product_split_ratio else bnm_product_split_ratio end as product_split_ratio,
                1+((CASE WHEN s1_id = 1 THEN ecom_elasticity ELSE bnm_elasticity END) * (effective_discount - base_percentage) / 100) AS elasticity_factor,
                store_split AS store_split_factor, date as recommendation_date,
                promo_duration, discount_level,
                COALESCE(ff.factor, 1) AS fatigue_factor,
                COALESCE(cb_coefficient, 0) AS cb_coefficient,
                loyalty_factor_final,
                halo_effect_factor,
                COALESCE( (pc.factor * COALESCE(NULLIF(ds.week_no-1, 0) * week_dampening_factor, 1)),
                            (case when s1_id = 1 then ecom_day_split_ratio else bnm_day_split_ratio end) * COALESCE(ff.factor, 1))
                     AS day_split_factor,
                coalesce(case when s1_id = 1 then ecom_day_split_ratio else bnm_day_split_ratio end, 0)as day_split_unmod,
                current_price * (100-effective_discount) * 0.01 AS discounted_price,stacked_baseline_sales_units

                FROM cte_1
                INNER JOIN (select * from price_promo_opt_temp.promo_simulation_store_level_data_%s
                            WHERE week_start_date BETWEEN ''%s'' AND ''%s'') ss
                USING(week_start_date,l3_cid,brand_cid,s1_id, s0_id)

                LEFT JOIN price_promo_opt_temp.promo_simulation_pf_coefficient_stack_%s
                USING(scenario_id, product_id, s1_id, s0_id, effective_discount)

                INNER JOIN (
                    SELECT
                    l3_cid, brand_cid, week_start_date, date , ecom_day_split_ratio, bnm_day_split_ratio,
                    (((week_start_date - ''%s'')/7)+1)::integer AS week_no,
                    least((date-''%s''+1)::integer, 42) AS promo_day
                    FROM price_promo_opt.tb_day_split_opt
                    WHERE date BETWEEN ''%s'' AND ''%s''
                ) ds USING(week_start_date,date,l3_cid, brand_cid)

                LEFT JOIN price_promo_opt.tb_offer_concentration_factor_opt pc USING(s1_id, l2_cid, promo_duration, promo_day)
                LEFT JOIN price_promo_opt.tb_fatigue_factor_opt ff USING(s1_id, l2_cid, promo_duration, promo_day)
                %s
                ),
        subquery_calc AS materialized  (
            SELECT *,
            elasticity_factor * day_split_factor * store_split_factor * loyalty_factor_final * sales_units_sim AS sales_units_store_day,
            coalesce(stacked_baseline_sales_units,day_split_unmod * store_split_factor * loyalty_factor_final * baseline_sales_units_sim) AS baseline_sales_units,

            elasticity_factor * day_split_factor * store_split_factor * loyalty_factor_final * sales_units_sim * ( halo_effect_factor - 1 ) as affinity_units,
            coalesce(day_split_unmod * store_split_factor * loyalty_factor_final* pf_coefficient * product_split_ratio,0) AS pull_forward_units,
            coalesce(day_split_unmod * store_split_factor * loyalty_factor_final* cb_coefficient * product_split_ratio,0) AS cannibalization_units

            FROM sub_q)

        INSERT INTO %s
        (promo_id, scenario_id, product_id, recommendation_date, s0_id, s1_id, discount_level_value,
        offer_type_id, effective_discount, original_cost, discounted_price,
        sales_units, baseline_sales_units, incremental_sales_units, revenue, baseline_revenue, incremental_revenue,
        margin, baseline_margin, incremental_margin, promo_spend,  affinity_units, cannibalization_units,
        pull_forward_units, affinity_revenue, cannibalization_revenue, pull_forward_revenue, affinity_margin, cannibalization_margin,
        pull_forward_margin, contribution_revenue, contribution_margin)

        SELECT
            promo_id::int4 AS promo_id,
            scenario_id::int4 AS scenario_id,
            product_id::int8 AS product_id,
            recommendation_date::date AS recommendation_date,
            s0_id::int8 AS s0_id,
            s1_id::int8 AS s1_id,
            discount_level_value::int8 AS discount_level_value,
            offer_type_id::int4 AS offer_type_id,

            effective_discount::int4 AS effective_discount,

            cost::float8 AS original_cost,
            discounted_price::float8 AS discounted_price,
            sales_units::float8 AS sales_units,
            baseline_sales_units::float8 AS baseline_sales_units,
            (sales_units - baseline_sales_units)::float8 AS incremental_sales_units,

            (sales_units * discounted_price)::float8 AS revenue,
            (baseline_sales_units * current_price)::float8 AS baseline_revenue,
            ((sales_units * discounted_price) - (baseline_sales_units * current_price))::float8 AS incremental_revenue,

            (sales_units * (discounted_price - cost))::float8 AS margin,
            (baseline_sales_units * (current_price - cost))::float8 AS baseline_margin,
            ((sales_units * (discounted_price - cost)) - (baseline_sales_units * (current_price - cost)))::float8 AS incremental_margin,

            (sales_units * (current_price - discounted_price)) AS promo_spend,

            affinity_units::float4 AS affinity_units,
            Least(0.15*baseline_sales_units, cannibalization_units)::float4 AS cannibalization_units,
            Least(0.15*baseline_sales_units, pull_forward_units)::float4 AS pull_forward_units,

            ((affinity_units * discounted_price))::float8 AS affinity_revenue,
            -1* (Least(0.15*baseline_sales_units, cannibalization_units) * discounted_price)::float8 AS cannibalization_revenue,
            -1* (Least(0.15*baseline_sales_units, pull_forward_units) * discounted_price)::float8 AS pull_forward_revenue,

            ((affinity_units * (discounted_price-cost)))::float8 AS affinity_margin,
            -1* (Least(0.15*baseline_sales_units, cannibalization_units) * (discounted_price-cost))::float8 AS cannibalization_margin,
            -1* (Least(0.15*baseline_sales_units, pull_forward_units) * (discounted_price-cost))::float8 AS pull_forward_margin,

			round(coalesce((sales_units * discounted_price) * gross_shipped_rate / 100 * (1 - return_rate / 100),0)::numeric,2) AS contribution_revenue,

			round(coalesce(((sales_units * discounted_price) * gross_shipped_rate / 100 * (1 - return_rate / 100) *
			((((sales_units * (discounted_price - cost)) / NULLIF(sales_units * discounted_price, 0)) - (net_gm_buffer_percent / 100)) - (variable_sales_percent / 100 )- (marketing_cost_percent / 100) )
			- (sales_units * fulfilment_cost_dollar)),0)::numeric,2) AS contribution_margin


            FROM (select *,
                (sales_units_store_day + affinity_units - Least(0.15*baseline_sales_units, pull_forward_units) - Least(0.15*baseline_sales_units, cannibalization_units))::float8 as sales_units
                from subquery_calc ) subx
				LEFT JOIN price_promo_opt.tb_business_metrics_config_opt using(s0_id, s1_id)
        ',
        -- subquery_calc
        -- Discount filter
        discount_filter,

        -- OAF
        table_suffix,
        -- SMW
        filter_week_start_date, filter_week_end_date,
        -- SS
        table_suffix,
        filter_week_start_date, filter_week_end_date,
        -- PF
        table_suffix,
        -- DS
        var_week_start_date, var_start_date, filter_start_date, filter_end_date,
        -- CNF
        CASE WHEN cannibalization_count > 0 THEN
            format('LEFT JOIN (select * from price_promo_opt_temp.promo_simulation_cannibalization_coefficient_stack_%s
						WHERE promo_date BETWEEN ''%s'' AND ''%s'') cnf
						USING(scenario_id, s1_id, s0_id, brand_cid, promo_day, l3_cid, offer_identifier)',
                   table_suffix, filter_start_date, filter_end_date)
        ELSE
            'CROSS JOIN (select 0 as cb_coefficient) cnf'
        END,
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
