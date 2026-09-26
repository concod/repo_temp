--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_get_mkd_exist_resim_06042026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: simulation schema changes for pc_get_mkd_exist_resim_06042026

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_get_mkd_exist_resim;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_get_mkd_exist_resim(IN _strategy_id integer, IN _min_week_start date, IN _max_week_start date, IN _table_type text, IN _temp_table_ssd_fin text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

    DECLARE _sim_sku_tab_name text;
            _sku_store_date_tab_name text;
            _table_name_1 text;
            _table_name_2 text;
            _table_name_3 text;
            _table_name_4 text;
            vl_query text;
            v2_query text;
            v3_query text;
            v4_query text;
            v5_query text;
            start_time TIMESTAMP;
            end_time TIMESTAMP;
    BEGIN
        -- Construct the dynamic SQL statement to drop the table
        _sim_sku_tab_name := 'mvm_sim_'||_strategy_id;
        _sku_store_date_tab_name := 'tb_ssd_'||_table_type || _strategy_id;
        _table_name_1 := 'tb_ssd_'||_table_type||_strategy_id || '_3';
        _table_name_2 := 'tb_ssd_'||_table_type||_strategy_id || '_4';
        _table_name_3 := 'tb_ssd_'||_table_type||_strategy_id || '_5';
        _table_name_4 := 'tb_ssd_'||_table_type||_strategy_id || '_6';

        vl_query := FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.%I;
            CREATE UNLOGGED TABLE price_markdown_opt_temp.%I AS
                        select f5.strategy_id, f5.product_id, f5.store_id, f5.product_level_id, f5.store_level_id,
                    f5.date, f5.week_start_date, f5.event, f5.start_date, f5.end_date, f5.price, f5.cost,
                    f5.markdown_percentage_exact::decimal AS effective_promo_discount,
                    f5.total_inventory as inv_oh,
                    coalesce(((f1.elasticity * (f5.markdown_percentage_exact -f5.markdown_percentage) / 100) + 1) * f1.sales_units * f5.day_split_ratio * f5.store_ratio, 0) as sales_units_bef_cap,
               COALESCE(f1.baseline_sales_units * f5.day_split_ratio * f5.store_ratio, 0) AS baseline_sales_units_bef_cap,
               (
                 COALESCE(((f1.elasticity * (f5.markdown_percentage_exact - f5.markdown_percentage) / 100) + 1) * f1.sales_units * f5.day_split_ratio * f5.store_ratio, 0)
                 - COALESCE(f1.baseline_sales_units * f5.day_split_ratio * f5.store_ratio, 0)
               ) AS incremental_sales_units_bef_cap,
                    f5.previous_markdown_percentage, f5.channel_info, f5.currency_id, f5.price_with_vat
            from price_markdown_opt_temp.%I f5
            inner join pricesmart.tb_store_master sm
            on f5.store_id = sm.store_id
            inner join price_markdown_opt.%I f1
            on f1.product_id = f5.product_id
            and f1.week_start_date = f5.week_start_date
            and f1.base_percentage = f5.markdown_percentage
            and f1.s0_id = sm.s0_id
            and f1.s1_id = sm.s1_id
            and f1.week_start_date BETWEEN $1 AND $2;
            ', _table_name_1, _table_name_1, _sku_store_date_tab_name, _sim_sku_tab_name) ;

        raise notice 'CTE --- %', vl_query;
        start_time := clock_timestamp();
        execute vl_query using _min_week_start ,_max_week_start;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken SQL 1 create statement: %', end_time - start_time;

        v2_query = FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.%I;
                            CREATE UNLOGGED TABLE price_markdown_opt_temp.%I as
                         select * , SUM(sales_units_bef_cap) OVER(PARTITION BY product_id, store_id
                                             ORDER BY date ROWS UNBOUNDED PRECEDING) AS cumsum_sales,
                                SUM(baseline_sales_units_bef_cap) OVER (PARTITION BY product_id, store_id ORDER BY date ROWS UNBOUNDED PRECEDING) AS cumsum_baseline_sales
                            from price_markdown_opt_temp.%I;'
                            ,_table_name_2, _table_name_2, _table_name_1);

        raise notice 'CTE --- %', v2_query;
        start_time := clock_timestamp();
        execute v2_query;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken SQL 2 statement: %', end_time - start_time;

        v3_query := FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.%I;
                            CREATE UNLOGGED TABLE price_markdown_opt_temp.%I as
             SELECT
                 *,
                 CASE
                     WHEN (inv_oh - cumsum_sales) < 0 THEN CASE
                         WHEN (sales_units_bef_cap + (inv_oh - cumsum_sales))> 0 THEN (sales_units_bef_cap + (inv_oh - cumsum_sales))
                         ELSE 0
                     END
                     ELSE sales_units_bef_cap
                 END AS sales_units,
                 CASE
                WHEN (inv_oh - cumsum_baseline_sales) < 0 THEN CASE
                    WHEN (baseline_sales_units_bef_cap + (inv_oh - cumsum_baseline_sales)) > 0
                    THEN (baseline_sales_units_bef_cap + (inv_oh - cumsum_baseline_sales))
                    ELSE 0
                END
                ELSE baseline_sales_units_bef_cap
            END AS baseline_sales_units,
                 CASE
                     WHEN (sales_units_bef_cap + (inv_oh - cumsum_sales))> 0 THEN (sales_units_bef_cap + (inv_oh - cumsum_sales))
                     ELSE 0
                 END AS start_day_inv
             FROM price_markdown_opt_temp.%I t1;
        ',_table_name_3, _table_name_3, _table_name_2);

        raise notice 'CTE --- %', v3_query;
        start_time := clock_timestamp();
        execute v3_query;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken SQL 3 statement: %', end_time - start_time;

        v4_query := FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.%I;
                    CREATE UNLOGGED TABLE price_markdown_opt_temp.%I as
        SELECT product_level_id, store_level_id,
                (pcd.value->>''pcd_id'')::integer as pcd_id,
                case when (pcd.value->>''markdown_type'') = ''First Markdown'' then 97 else 99 end as end_rule
        FROM price_markdown.tb_strategy_discount_level
            CROSS JOIN LATERAL jsonb_each(pcd_data) as pcd(key, value)
        WHERE strategy_id = $1
            ;
        ',_table_name_4, _table_name_4);

        raise notice 'CTE --- %', v4_query;
        start_time := clock_timestamp();
        execute v4_query using _strategy_id;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken SQL 4 statement: %', end_time - start_time;

        v5_query := FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.%I;
                                CREATE UNLOGGED TABLE price_markdown_opt_temp.%I as
        select
            strategy_id,
            product_id,
           store_id,
           product_level_id,
           store_level_id,
           date as recommendation_date,
           effective_promo_discount as recommended_offer_percentage,
           selling_price as effective_price_point,
           EVENT as pcd_id,
           sales_units,
           margin,
           revenue,
           current_timestamp as created_at,
           current_timestamp as updated_at,
           rem_inv,
           spend,
           sales_units_bef_cap as sales_units_uncapped,
            previous_markdown_percentage,
            channel_info,
            currency_id,
            price_with_vat,
            selling_price_with_vat as effective_price_point_with_vat,
            margin_with_vat,
            revenue_with_vat,
            spend_with_vat,
            baseline_sales_units,
            baseline_revenue,
            baseline_margin,
            baseline_spend,
            baseline_revenue_with_vat,
            baseline_margin_with_vat,
            baseline_spend_with_vat,
            incremental_sales_units,
            incremental_revenue,
            incremental_margin,
            incremental_spend,
            incremental_revenue_with_vat,
            incremental_margin_with_vat,
            incremental_spend_with_vat
         from (
                SELECT
                     tb1.*,
                CASE WHEN end_rule is NULL
                     THEN ROUND(CAST(price*(1-effective_promo_discount/100) as numeric), 2)
                     ELSE ROUND(cast(price*(1-effective_promo_discount/100)-(end_rule::numeric/100) as numeric))+(end_rule::numeric/100)
                END as selling_price,
                COALESCE(round(CAST(price *(1-effective_promo_discount / 100)* sales_units AS numeric),2),0) AS revenue,
                COALESCE(round(CAST((price *(1-effective_promo_discount / 100)-cost)* sales_units AS numeric),2),0) AS margin,
                COALESCE(CAST(((price * effective_promo_discount * sales_units)/100) AS NUMERIC),0) as spend,
                CASE WHEN end_rule is NULL
                     THEN ROUND(CAST(price_with_vat*(1-effective_promo_discount/100) as numeric), 2)
                     ELSE ROUND(cast(price_with_vat*(1-effective_promo_discount/100)-(end_rule::numeric/100) as numeric))+(end_rule::numeric/100)
                END as selling_price_with_vat,
                COALESCE(round(CAST(price_with_vat *(1-effective_promo_discount / 100)* sales_units AS numeric),2),0) AS revenue_with_vat,
                COALESCE(round(CAST((price_with_vat *(1-effective_promo_discount / 100)-cost)* sales_units AS numeric),2),0) AS margin_with_vat,
                COALESCE(CAST(((price_with_vat * effective_promo_discount * sales_units)/100) AS NUMERIC),0) as spend_with_vat,
                COALESCE(ROUND(CAST(price * (1 - effective_promo_discount / 100) * baseline_sales_units AS numeric), 2), 0) AS baseline_revenue,
                COALESCE(ROUND(CAST((price * (1 - effective_promo_discount / 100) - cost) * baseline_sales_units AS numeric), 2), 0) AS baseline_margin,
                COALESCE(CAST(((price * effective_promo_discount * baseline_sales_units) / 100) AS numeric), 0) AS baseline_spend,
                COALESCE(ROUND(CAST(price_with_vat * (1 - effective_promo_discount / 100) * baseline_sales_units AS numeric), 2), 0) AS baseline_revenue_with_vat,
                COALESCE(ROUND(CAST((price_with_vat * (1 - effective_promo_discount / 100) - cost) * baseline_sales_units AS numeric), 2), 0) AS baseline_margin_with_vat,
                COALESCE(CAST(((price_with_vat * effective_promo_discount * baseline_sales_units) / 100) AS numeric), 0) AS baseline_spend_with_vat,
                (COALESCE(sales_units, 0) - COALESCE(baseline_sales_units, 0)) AS incremental_sales_units,
                (
                  COALESCE(ROUND(CAST(price * (1 - effective_promo_discount / 100) * sales_units AS numeric), 2), 0)
                  - COALESCE(ROUND(CAST(price * (1 - effective_promo_discount / 100) * baseline_sales_units AS numeric), 2), 0)
                ) AS incremental_revenue,
                (
                  COALESCE(ROUND(CAST((price * (1 - effective_promo_discount / 100) - cost) * sales_units AS numeric), 2), 0)
                  - COALESCE(ROUND(CAST((price * (1 - effective_promo_discount / 100) - cost) * baseline_sales_units AS numeric), 2), 0)
                ) AS incremental_margin,
                (
                  COALESCE(CAST(((price * effective_promo_discount * sales_units) / 100) AS numeric), 0)
                  - COALESCE(CAST(((price * effective_promo_discount * baseline_sales_units) / 100) AS numeric), 0)
                ) AS incremental_spend,
                (
                  COALESCE(ROUND(CAST(price_with_vat * (1 - effective_promo_discount / 100) * sales_units AS numeric), 2), 0)
                  - COALESCE(ROUND(CAST(price_with_vat * (1 - effective_promo_discount / 100) * baseline_sales_units AS numeric), 2), 0)
                ) AS incremental_revenue_with_vat,
                (
                  COALESCE(ROUND(CAST((price_with_vat * (1 - effective_promo_discount / 100) - cost) * sales_units AS numeric), 2), 0)
                  - COALESCE(ROUND(CAST((price_with_vat * (1 - effective_promo_discount / 100) - cost) * baseline_sales_units AS numeric), 2), 0)
                ) AS incremental_margin_with_vat,
                (
                  COALESCE(CAST(((price_with_vat * effective_promo_discount * sales_units) / 100) AS numeric), 0)
                  - COALESCE(CAST(((price_with_vat * effective_promo_discount * baseline_sales_units) / 100) AS numeric), 0)
                ) AS incremental_spend_with_vat
                FROM
                     (
                      SELECT
                            strategy_id, product_id, store_id, product_level_id, store_level_id,
                            date, week_start_date, EVENT, start_date, end_date,
                            price, cost, effective_promo_discount, previous_markdown_percentage,
                       sales_units_bef_cap, sales_units, 
                       baseline_sales_units_bef_cap, baseline_sales_units,
                       inv_oh, start_day_inv,
                            CASE WHEN (start_day_inv - sales_units) < 0 THEN 0
                                 ELSE (start_day_inv - sales_units)
                            END as rem_inv, channel_info,
                            currency_id, price_with_vat
                        FROM
                            price_markdown_opt_temp.%I) tb1
                left join price_markdown_opt_temp.%I x2
                on tb1.product_level_id = x2.product_level_id
				and tb1.store_level_id = x2.store_level_id
				and tb1.event = x2.pcd_id) tab;
        ',_temp_table_ssd_fin, _temp_table_ssd_fin, _table_name_3, _table_name_4);

        raise notice 'CTE --- %', v5_query;
        start_time := clock_timestamp();
        execute v5_query using _strategy_id;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken SQL 5 statement: %', end_time - start_time;

END;
$procedure$
;