
--liquibase formatted sql
--changeset vaibhav@:pc_opt_pre_simulation_create_gurobi_data._v9 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_pre_simulation_create_gurobi_data

DROP PROCEDURE IF EXISTS price_promo_opt.pc_opt_pre_simulation_create_gurobi_data ;

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_pre_simulation_create_gurobi_data(IN var_promo_id integer, IN arr_speed_id integer[], IN var_week_start_date date, IN var_week_end_date date, IN var_start_date date, IN var_end_date date, IN table_suffix text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE

    query TEXT;

BEGIN

    query := format('
        		DROP TABLE IF EXISTS price_promo_opt_temp.promo_gurobi_data_pre_%s;
        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_gurobi_data_pre_%s AS
        WITH
        cte_1 as materialized
        (select * from price_promo_opt_temp.promo_opt_pre_discount_filter_%s fd
                INNER JOIN (
                    SELECT *
                    FROM price_promo_opt.tb_simulation_week_opt WHERE week_start_date BETWEEN ''%s'' AND ''%s''
                ) smw USING(product_id, base_percentage)
                ),
                sub_q as materialized (
                        SELECT
				discount_level_value, --product_id, recommendation_date, s0_id, s1_id,
                case when s1_id = 1 then cost + ecom_shipping_cost else cost end as cost,
				current_price * (100-effective_discount) * 0.01 AS discounted_price ,
				offer_type, offer_identifier, discount_filter,
                case when s1_id = 1 then ecom_sales_units else bnm_sales_units end as sales_units_sim,
				case when s1_id = 1 then ecom_baseline_sales_units else bnm_baseline_sales_units end as
				baseline_sales_units_sim,
				coalesce(case when s1_id = 1 then ecom_day_split_ratio else bnm_day_split_ratio end, 0)as day_split_unmod,
                store_split AS store_split_factor,
                case when s1_id = 1 then ecom_product_split_ratio else bnm_product_split_ratio end as product_split_ratio,
                (1+((CASE WHEN s1_id = 1 THEN ecom_elasticity ELSE bnm_elasticity END) * (effective_discount - base_percentage) / 100)) AS elasticity_factor,
				loyalty_factor_final,
                COALESCE(pf_coefficient, 0) AS pf_coefficient,
                COALESCE(cb_coefficient, 0) AS cb_coefficient,
				halo_effect_factor
                FROM cte_1

                INNER JOIN price_promo_opt_temp.promo_simulation_store_level_data_%s ss
                USING(week_start_date, l3_cid, brand_cid, s1_id)

                LEFT JOIN price_promo_opt_temp.promo_simulation_pf_coefficient_%s
                USING( product_id,s1_id,s0_id, effective_discount)

                INNER JOIN (
                    SELECT
                    l3_cid, brand_cid, week_start_date,--, date AS recommendation_date,
                    sum(ecom_day_split_ratio) ecom_day_split_ratio, sum(bnm_day_split_ratio) bnm_day_split_ratio
                    FROM price_promo_opt.tb_day_split_opt
                    WHERE date BETWEEN ''%s'' AND ''%s''
                    group by l3_cid, brand_cid, week_start_date
                ) ds USING(l3_cid, brand_cid, week_start_date)

                LEFT JOIN (select offer_identifier, promo_week as week_start_date, l3_cid, brand_cid, s1_id,s0_id,
                        avg(cb_coefficient) cb_coefficient
                        from price_promo_opt_temp.promo_simulation_cannibalization_coefficient_%s
                        group by offer_identifier, promo_week, l3_cid, brand_cid, s1_id, s0_id )cnf
                        USING( offer_identifier, week_start_date, l3_cid, brand_cid, s1_id, s0_id)

                ),
        subquery_calc AS materialized (
            SELECT
                discount_level_value, offer_type, offer_identifier, discount_filter, discounted_price, cost ,
                (elasticity_factor * day_split_unmod * store_split_factor * loyalty_factor_final * halo_effect_factor * sales_units_sim) as sales_units_store_day,
                ( day_split_unmod * store_split_factor * loyalty_factor_final * baseline_sales_units_sim) as baseline_sales_units,
                coalesce(day_split_unmod * store_split_factor * loyalty_factor_final * pf_coefficient * product_split_ratio,0) as pull_forward_units,
                coalesce((day_split_unmod * store_split_factor * loyalty_factor_final * cb_coefficient * product_split_ratio),0) AS cannibalization_units
                    FROM sub_q)
            select
            coalesce(opt_level_bins,-200) opt_level_bins,
            offer_type, offer_identifier, discount_filter as offer_value,
			coalesce(sales_units,0) as sales_units,
			coalesce(revenue,0) as revenue,
			coalesce(margin,0) as margin

			from
			(select distinct offer_type, offer_identifier, discount_filter from price_promo.master_valid_offers
							Inner join price_promo_opt.fn_get_rules_data(%s) using(offer_type)
			 WHERE (discount_filter BETWEEN min_discount AND max_discount) OR
			(discount_filter = any(CASE WHEN discount_type_values::integer[] is NULL THEN ARRAY[]::integer[]
				ELSE discount_type_values::integer[] end))) mvo1
			LEFT JOIN
        ( SELECT
            discount_level_value::int8 AS opt_level_bins,
			offer_type,
			offer_identifier,
			discount_filter,
			round(coalesce(sum(sales_units),0)::numeric,2) as sales_units,
			round(coalesce(sum((sales_units * discounted_price)),0)::numeric,2) as revenue,
			round(coalesce(sum((sales_units * (discounted_price - cost))),0)::numeric,2) as margin
        FROM (select *,
			(sales_units_store_day -
			    Least(0.15*baseline_sales_units, pull_forward_units) -
			    Least(0.15*baseline_sales_units, cannibalization_units))::float8
			        as sales_units from subquery_calc) sq1
			group by 1,2,3,4) final_1
			using(offer_type, offer_identifier,discount_filter)

        ',

		-- table name
		table_suffix,table_suffix,
        -- Discount filter
        table_suffix,

        -- SMW
        var_week_start_date, var_week_end_date,
        -- SS
        table_suffix,
        -- PF
        table_suffix,
        -- DS
       var_start_date, var_end_date,
        -- CNF
        table_suffix, var_promo_id
    );


    -- Print the query
    RAISE NOTICE '%', query;

    -- Execute the query
    EXECUTE query;


END;
$procedure$
;
