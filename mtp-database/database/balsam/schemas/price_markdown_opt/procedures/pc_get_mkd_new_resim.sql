--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_get_mkd_new_resim_29052025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: schema changes for pc_get_mkd_new_resim

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_get_mkd_new_resim(int4, date, date, text, text, text);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_get_mkd_new_resim(IN _strategy_id integer, IN _min_week_start date, IN _max_week_start date, IN _version text, IN _table_type text, IN _temp_table_ssd_fin text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

    DECLARE _table_name text;
            _sim_sku_tab_name text;
            _sku_store_date_tab_name text;
            _table_name_1 text;
            _table_name_2 text;
            _table_name_3 text;
            vl_query text;
            v2_query text;
            v3_query text;
            v4_query text;
            start_time TIMESTAMP;
            end_time TIMESTAMP;
    BEGIN
        -- Construct the dynamic SQL statement to drop the table
        _table_name := 'tb_' || '_ssd_'||_version ||_strategy_id;
        _sim_sku_tab_name := 'mvm_sim_' ||_strategy_id;
        _sku_store_date_tab_name := 'tb_ssd_resim_temp' ||_strategy_id;
        _table_name_1 := 'tb_' || '_ssd_'||_table_type ||_strategy_id || '_3';
        _table_name_2 := 'tb_' || '_ssd_'||_table_type ||_strategy_id || '_4';
        _table_name_3 := 'tb_' || '_ssd_'||_table_type ||_strategy_id || '_5';

        vl_query := FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.%I;
            CREATE unlogged TABLE price_markdown_opt_temp.%I AS
            select f5.strategy_id, f5.product_id, f5.store_id, f5.product_level_id, f5.store_level_id,
                    f5.date, f5.week_start_date, f5.event, f5.start_date, f5.end_date, f5.price, f5.cost,
                    f5.markdown_percentage_exact::decimal AS effective_promo_discount,
                    f5.total_inventory as inv_oh,
					coalesce(((f1.elasticity * (f5.markdown_percentage_exact -f5.markdown_percentage) / 100) + 1) * f1.sales_units*f5.day_split_ratio, 0) AS sales_units_bef_cap,
                    f5.previous_markdown_percentage, f5.channel_info, 
                    f5.currency_id, f5.price_with_vat
            from price_markdown_opt_temp.%I f5
            inner join price_markdown_opt.%I f1
            on f1.product_id = f5.product_id
            and f1.week_start_date = f5.week_start_date
            and f1.base_percentage = f5.markdown_percentage
            and f1.week_start_date BETWEEN $1 AND $2;
            ', _table_name_1, _table_name_1, _sku_store_date_tab_name, _sim_sku_tab_name) ;

        start_time := clock_timestamp();
        raise notice 'CTE --- %', vl_query;
        execute vl_query using _min_week_start ,_max_week_start;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken by 1st SQL: %', end_time - start_time;

        v2_query := FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.%I;
                            CREATE unlogged TABLE price_markdown_opt_temp.%I as
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
                     WHEN (sales_units_bef_cap + (inv_oh - cumsum_sales))> 0 THEN (sales_units_bef_cap + (inv_oh - cumsum_sales))
                     ELSE 0
                 END AS start_day_inv
             FROM
                 (select * , SUM(sales_units_bef_cap) OVER(PARTITION BY product_id, store_id
                                             ORDER BY date ROWS UNBOUNDED PRECEDING) AS cumsum_sales
                 from price_markdown_opt_temp.%I
                 ) t1;
        ',_table_name_2, _table_name_2, _table_name_1);

        start_time := clock_timestamp();
        raise notice 'CTE --- %', v2_query;
        execute v2_query;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken by 2nd SQL: %', end_time - start_time;

            v3_query := FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.%I;
                    CREATE unlogged TABLE price_markdown_opt_temp.%I as
               select product_level_id, store_level_id, pcd_id, 99 as end_rule
				from price_markdown.tb_strategy_discount
               where strategy_id = $1;
        ',_table_name_3, _table_name_3);

        start_time := clock_timestamp();
        raise notice 'CTE --- %', v3_query;
        execute v3_query using _strategy_id;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken by 83rd SQL: %', end_time - start_time;

            v4_query := FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.%I;
                    CREATE unlogged TABLE price_markdown_opt_temp.%I as
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
           spend_with_vat
         from (
                SELECT
                 tb1.*,
                CASE WHEN end_rule is NULL
                     THEN ROUND(CAST(price*(1-effective_promo_discount/100) as numeric), 2)
                     ELSE ROUND(cast(price*(1-effective_promo_discount/100)-(end_rule::numeric/100) as numeric))+(end_rule::numeric/100)
                END as selling_price,
                COALESCE(round(CAST(price *(1-effective_promo_discount / 100)* sales_units AS numeric),2),0) AS revenue,
                COALESCE(round(CAST((price *(1-effective_promo_discount / 100)-COST)* sales_units AS numeric),2),0) AS margin,
                COALESCE(CAST(((price * effective_promo_discount * sales_units)/100) AS NUMERIC),0) as spend,
                CASE WHEN end_rule is NULL
                     THEN ROUND(CAST(price_with_vat*(1-effective_promo_discount/100) as numeric), 2)
                     ELSE ROUND(cast(price_with_vat*(1-effective_promo_discount/100)-(end_rule::numeric/100) as numeric))+(end_rule::numeric/100)
                END as selling_price_with_vat,
                COALESCE(round(CAST(price_with_vat *(1-effective_promo_discount / 100)* sales_units AS numeric),2),0) AS revenue_with_vat,
                COALESCE(round(CAST((price_with_vat *(1-effective_promo_discount / 100)-cost)* sales_units AS numeric),2),0) AS margin_with_vat,
                COALESCE(CAST(((price_with_vat * effective_promo_discount * sales_units)/100) AS NUMERIC),0) as spend_with_vat
             FROM
                 (
                  SELECT
                        strategy_id, product_id, store_id, product_level_id, store_level_id,
                        date, week_start_date, event, start_date, end_date,
                        price, cost, effective_promo_discount, previous_markdown_percentage,
                        sales_units_bef_cap, sales_units, inv_oh, start_day_inv,
                        CASE WHEN (start_day_inv - sales_units) < 0 THEN 0
                             ELSE (start_day_inv - sales_units)
                        END as rem_inv, channel_info,
                        currency_id, price_with_vat
                    FROM price_markdown_opt_temp.%I) tb1
            left join price_markdown_opt_temp.%I x2
            on tb1.product_level_id = x2.product_level_id
			and tb1.store_level_id = x2.store_level_id
			and tb1.event = x2.pcd_id) tab;
        ',_temp_table_ssd_fin, _temp_table_ssd_fin, _table_name_2, _table_name_3);

        start_time := clock_timestamp();
        raise notice 'CTE --- %', v4_query;
        execute v4_query using _strategy_id;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken by final insert SQL: %', end_time - start_time;

END;
$procedure$
;