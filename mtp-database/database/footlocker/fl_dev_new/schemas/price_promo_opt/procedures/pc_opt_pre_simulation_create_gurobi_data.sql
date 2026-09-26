--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_pre_simulation_create_gurobi_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_opt_pre_simulation_create_gurobi_data

DROP PROCEDURE if exists price_promo_opt.pc_opt_pre_simulation_create_gurobi_data;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_pre_simulation_create_gurobi_data(IN var_promo_id integer, IN arr_speed_id integer[], IN var_week_start_date date, IN var_week_end_date date, IN var_start_date date, IN var_end_date date, IN table_suffix character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE
    query varchar;
BEGIN

-- Call store split procedure to populate temp table
CALL price_promo_opt.pc_simulation_fetch_store_level_data(
    var_promo_id,
    var_week_start_date,
    var_week_end_date,
    arr_speed_id   -- or arr_scenario_id?
);

    query := format('

        DROP TABLE IF EXISTS price_promo_opt_temp.promo_gurobi_data_pre_%s;

        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_gurobi_data_pre_%s AS

        WITH

        -- UPDATE:
        cte_0 AS materialized (
            SELECT product_id, concat(s0_id,''_'', s1_id) store_reco_level, simulation_week_start_date, base_percentage,
                   sales_units, baseline_sales_units, elasticity
            FROM price_promo_opt.tb_simulation_week_opt
            WHERE simulation_week_start_date BETWEEN ''%s'' AND ''%s''
        ),

        cte_1 AS materialized (
            SELECT fd.*, 
			fdm.simulation_week_start_date,
			fd.date AS recommendation_date,
            smw.sales_units, smw.baseline_sales_units, smw.elasticity

            FROM price_promo_opt_temp.promo_opt_pre_discount_filter_%s_final fd
    		 
			inner join global.tb_fiscal_date_mapping fdm using (date)
            
			LEFT JOIN cte_0 smw USING(product_id, base_percentage, simulation_week_start_date, store_reco_level) 

        ),

        sub_q AS materialized (
            SELECT
                discount_level_value,
                cost,
                (current_price / (1 + COALESCE(vat_percentage, 0)/100)) * (100-effective_discount) * 0.01 AS discounted_price,
                offer_type, offer_identifier, discount_filter,
                (sales_units ) AS sales_units_sim,
                baseline_sales_units AS baseline_sales_units_sim,
                1 AS product_split_ratio,
                (1+(COALESCE(elasticity,0) * (effective_discount - base_percentage) / 100)) AS elasticity_factor,
                scan_back_per_product,new_product_flag,
                off_invoice_per_product,
                product_id,
                effective_discount_old,
                discount_constraint_hierachy,
                -- UPDATE: split ratios 
                COALESCE(ds.day_split_ratio,1) AS day_split_ratio,
                COALESCE(ss.store_split,1) AS store_split_factor,
                COALESCE(cs.customer_split_ratio,1) AS customer_split_factor,
                vm.vat_percentage,
discount_amount
            FROM cte_1

            -- UPDATE: store split join replicated


            LEFT JOIN price_promo_opt_temp.promo_simulation_store_level_data_%s ss
            USING (simulation_week_start_date, l3_cid, l0_cid, store_reco_level)


            -- UPDATE: day split join replicated
            LEFT JOIN (
                SELECT l0_cid, concat(s0_id,''_'', s1_id) store_reco_level, l3_cid, simulation_week_start_date, date AS recommendation_date,
                       (day_split_ratio) AS day_split_ratio
                FROM price_promo_opt.tb_day_split_opt
                WHERE date BETWEEN ''%s'' AND ''%s''
--                GROUP BY l3_cid, simulation_week_start_date, date
            ) ds USING(l0_cid, store_reco_level, l3_cid, simulation_week_start_date,recommendation_date)
--, recommendation_date)


            -- UPDATE: customer split join replicated
            LEFT JOIN (
                SELECT simulation_week_start_date, customer_reco_level,
                       SUM(customer_split_ratio) AS customer_split_ratio
                FROM price_promo_opt.tb_customer_split_opt
--inner join (select customer_id from price_promo.fn_fetch_customers_for_promo(%s)) b using (customer_id)
                WHERE simulation_week_start_date BETWEEN ''%s'' AND ''%s''
                GROUP BY simulation_week_start_date, customer_reco_level
            ) cs USING(simulation_week_start_date, customer_reco_level)

            LEFT JOIN (
                SELECT s0_id, vat_percentage*100::integer AS vat_percentage
                FROM global.tb_vat_master
            ) vm USING(s0_id)
        ),

        subquery_calc AS materialized (
            SELECT
                discount_constraint_hierachy, discount_level_value, offer_type, offer_identifier,
                discount_filter, discounted_price, cost,
                (elasticity_factor * store_split_factor * day_split_ratio * customer_split_factor * sales_units_sim) AS sales_units_store_day,
                (store_split_factor * day_split_ratio * customer_split_factor * baseline_sales_units_sim) AS baseline_sales_units,
                COALESCE(store_split_factor * day_split_ratio * customer_split_factor * 0,0) AS pull_forward_units, -- pf_coefficient placeholder
                COALESCE(store_split_factor * day_split_ratio * customer_split_factor * 0,0) AS cannibalization_units, -- cb_coefficient placeholder
                product_id, effective_discount_old,
                scan_back_per_product, off_invoice_per_product,new_product_flag,
discount_amount

            FROM sub_q
        ),
subquery_calc_2 as (SELECT discount_constraint_hierachy::text AS discount_constraint_hierachy,
                   discount_level_value::text AS opt_level_bins,
                   offer_type, offer_identifier, discount_filter,
                   ROUND(COALESCE(SUM(COALESCE(sales_units,0)),0)::numeric,2) :: float AS sales_units,

                   ROUND(COALESCE(SUM((COALESCE(sales_units,0) * discounted_price)),0)::numeric,2) :: float AS revenue,
                   ROUND(COALESCE(SUM((COALESCE(sales_units,0) * (discounted_price - cost))),0)::numeric,2) :: float AS margin_wo_vf,
                   ROUND(COALESCE(COUNT(DISTINCT product_id),1),0) :: int AS sku_count,
                   ROUND(COALESCE(AVG(effective_discount_old),0),0) :: float AS effective_percentage_discount,
                   ROUND(COALESCE(SUM(scan_back_per_product),0)::numeric,2) :: float AS scan_back_per_discount_level,
                   ROUND(COALESCE(SUM(off_invoice_per_product),0)::numeric,2) :: float AS off_invoice_per_discount_levl,
				   COALESCE(SUM(new_product_flag),0) as new_product_flag,
 				   ROUND(COALESCE(SUM(promo_spend),0)::numeric,2) :: float AS promo_spend   -- ← ADD THIS -- update

            FROM (
                SELECT *,
                       (sales_units_store_day
--                        - LEAST(0.15*baseline_sales_units, pull_forward_units)
--                        - LEAST(0.15*baseline_sales_units, cannibalization_units)
)::float8 AS sales_units,
       (discount_amount *
        (sales_units_store_day
--         - LEAST(0.15*baseline_sales_units, pull_forward_units)
--         - LEAST(0.15*baseline_sales_units, cannibalization_units)
        )::float8) AS promo_spend
                FROM subquery_calc
            ) sq1
            GROUP BY 1,2,3,4,5
        )

        SELECT
            COALESCE(discount_constraint_hierachy, ''0'') AS discount_constraint_hierachy,
            COALESCE(opt_level_bins,''-200'') AS opt_level_bins,
            offer_type, offer_identifier, discount_filter AS offer_value,
            COALESCE(sales_units,0) AS sales_units,
            COALESCE(revenue,0) AS revenue,
            COALESCE(margin_wo_vf,0) AS margin_wo_vf,
            COALESCE(ROUND((margin_wo_vf + ((scan_back_per_discount_level + off_invoice_per_discount_levl) * sales_units))::numeric,2),0) :: float AS margin,
            sku_count, effective_percentage_discount,
     COALESCE(promo_spend,0) AS promo_spend   -- ← ADD THIS


        FROM (

select *, ROW_NUMBER() OVER (
  PARTITION BY opt_level_bins
  ORDER BY effective_percentage_discount ASC
) AS rn from subquery_calc_2

            ) final_1 where new_product_flag = 0 or rn = 1
        ',
        -- table name
        table_suffix, table_suffix,
        -- SMW
        var_week_start_date, var_week_end_date,
        -- Discount filter
        table_suffix, table_suffix,
        -- Store split
--       var_week_start_date, var_week_end_date,
        -- Day split
        var_start_date, var_end_date,

 var_promo_id,
        -- Store split
--       var_week_start_date, var_week_end_date,
        -- Customer split
        var_week_start_date, var_week_end_date
    );

    -- Print the query
    RAISE NOTICE '%', query;

    -- Execute the query
    EXECUTE query;

END;

$procedure$
;

