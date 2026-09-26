--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:fn_opt_ssd_insertion_15122025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: simulation schema changes for fn_opt_ssd_insertion_schema+15122025

DROP FUNCTION IF EXISTS price_markdown_opt.fn_opt_ssd_insertion(int4, date);

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_opt_ssd_insertion(in_strategy_id integer, fut_pcd_start_date date)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    DECLARE
    vl_test_query text;
    vl_total_count int := 9999999;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    BEGIN

            execute format('drop table if exists price_markdown_opt_temp.tb_ssd_sim_temp4_%1$s ;',in_strategy_id);
            vl_test_query :=  format('create unlogged table price_markdown_opt_temp.tb_ssd_sim_temp4_%1$s AS
                SELECT e1.strategy_id, e1.event, e1.start_date, e1.end_date, e1.date, e1.week_start_date,
                e1.product_id, e1.store_id, e1.product_level_id, e1.store_level_id,
                e1.opt_level_bins, e1.l3_cid, e1.price, e1.cost, e1.inv_oh,
                e1.store_ratio, e1.base_percentage, e1.day_split_ratio, e1.markdown_percentage_exact,
                e1.sales_units_bef_cap,
                SUM(e1.sales_units_bef_cap) OVER(PARTITION BY e1.product_id, e1.store_id ORDER BY e1.date
                ROWS UNBOUNDED PRECEDING) AS cumsum_sales,
                coalesce(e1.markdown_percentage_exact, e1.base_percentage)::decimal AS effective_promo_discount,
                e1.currency_id, e1.price_with_vat
                FROM price_markdown_opt_temp.tb_%1$s_ssd_temp e1;',in_strategy_id);

            raise notice 'query- 1 --%' , vl_test_query;
            start_time := clock_timestamp();
            execute vl_test_query;
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;

            execute format('drop table if exists price_markdown_opt_temp.tb_ssd_sim_inv_temp5_%1$s ;',in_strategy_id);
            vl_test_query :=  format('create unlogged table price_markdown_opt_temp.tb_ssd_sim_inv_temp5_%1$s AS
                                SELECT *,
                                    CASE WHEN (inv_oh - cumsum_sales) < 0
                                    THEN CASE WHEN (sales_units_bef_cap + (inv_oh - cumsum_sales))> 0
                                              THEN (sales_units_bef_cap + (inv_oh - cumsum_sales))
                                              ELSE 0 END
                                    ELSE sales_units_bef_cap END AS sales_units,
                                    CASE WHEN (sales_units_bef_cap + (inv_oh - cumsum_sales))> 0
                                         THEN (sales_units_bef_cap + (inv_oh - cumsum_sales))
                                         ELSE 0 END AS start_day_inv
                                FROM price_markdown_opt_temp.tb_ssd_sim_temp4_%1$s;',in_strategy_id);

            raise notice 'query- 2 --%' , vl_test_query;
            start_time := clock_timestamp();
            execute vl_test_query;
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken SQL 2 statement: %', end_time - start_time;

    execute format('drop table if exists price_markdown_opt_temp.tb_stg_disc_prevpcd_temp6_%1$s ;',in_strategy_id);

    vl_test_query :=  format('create unlogged table price_markdown_opt_temp.tb_stg_disc_prevpcd_temp6_%1$s as
                             select x1.strategy_id, l3_cid, product_id, x1.product_level_id, x1.store_level_id, opt_level_bins,
                    		store_id, date as recommendation_date, week_start_date, EVENT as pcd_id, start_date, end_date, price, cost,
                    		effective_promo_discount as recommended_offer_percentage, sales_units_bef_cap as sales_units_uncapped, channel_info,
                    		sales_units, inv_oh, start_day_inv, previous_markdown_percentage,
							99 as end_rule,
                            x1.currency_id, x1.price_with_vat
                                    from price_markdown_opt_temp.tb_ssd_sim_inv_temp5_%1$s  x1
                                    inner join price_markdown.tb_strategy_discount_ia_%1$s x2
                                    on x1.product_level_id =  x2.product_level_id
                                    and x1.store_level_id = x2.store_level_id
                                    and x1.event = x2.pcd_id ;',in_strategy_id);

    raise notice 'query- 3 B --%' , vl_test_query;
    start_time := clock_timestamp();
    execute vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 3 B statement: %', end_time - start_time;

        execute format('drop table if exists price_markdown_opt_temp.tb_ssd_ia_temp7_%1$s ;',in_strategy_id);

            vl_test_query :=format('create unlogged table price_markdown_opt_temp.tb_ssd_ia_temp7_%1$s  as
                 SELECT tb1.*,
                        CASE WHEN end_rule is NULL
                             THEN ROUND(CAST(price*(1-recommended_offer_percentage/100) as numeric), 2)
                             ELSE ROUND(cast(price*(1-recommended_offer_percentage/100)-(end_rule::numeric/100) as numeric))+(end_rule::numeric/100)
                             END as effective_price_point,
                        COALESCE(round(CAST(price *(1-recommended_offer_percentage / 100)* sales_units AS numeric),2),0) AS revenue,
                        COALESCE(round(CAST((price *(1-recommended_offer_percentage / 100)-cost)* sales_units AS numeric),2),0) AS margin,
                        CASE WHEN (start_day_inv - sales_units) < 0 THEN 0 ELSE (start_day_inv - sales_units)
                                    END as rem_inv,
                        COALESCE(CAST(((price * recommended_offer_percentage * sales_units)/100) AS NUMERIC),0) as spend,
                        current_timestamp as created_at, current_timestamp as updated_at,
                        CASE WHEN end_rule is NULL
                            THEN ROUND(CAST(price_with_vat*(1-recommended_offer_percentage/100) as numeric), 2)
                            ELSE ROUND(cast(price_with_vat*(1-recommended_offer_percentage/100)-(end_rule::numeric/100) as numeric))+(end_rule::numeric/100)
                        END as effective_price_point_with_vat,
                        COALESCE(round(CAST(price_with_vat*(1-recommended_offer_percentage/100)* sales_units AS numeric),2),0) AS revenue_with_vat,
                        COALESCE(round(CAST((price_with_vat*(1-recommended_offer_percentage/100)-cost)* sales_units AS numeric),2),0) AS margin_with_vat,
                        COALESCE(CAST(((price_with_vat*recommended_offer_percentage/100)*sales_units) AS numeric),0) as spend_with_vat
                    FROM price_markdown_opt_temp.tb_stg_disc_prevpcd_temp6_%1$s tb1;',in_strategy_id);
    raise notice 'query- 6 --%' , vl_test_query;
    start_time := clock_timestamp();
    execute vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 6 statement: %', end_time - start_time;

    execute format('drop table if exists price_markdown_opt_temp.tb_sku_store_temp1_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_opt_temp.tb_sku_store_pcd_temp2_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_opt_temp.tb_sku_store_promo_temp_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_opt_temp.tb_day_store_ratio_temp_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_opt_temp.tb_%1$s_ssd_temp ;',in_strategy_id);
    execute format('drop table if exists price_markdown_opt_temp.tb_ssd_sim_temp4_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_opt_temp.tb_ssd_sim_inv_temp5_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_opt_temp.tb_stg_disc_prevpcd_temp6_%1$s ;',in_strategy_id);
    RETURN true;
  end;
$function$
;
