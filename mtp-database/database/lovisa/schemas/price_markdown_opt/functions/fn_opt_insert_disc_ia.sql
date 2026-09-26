--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:fn_opt_insert_disc_ia_26112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_opt_insert_disc_ia

DROP FUNCTION IF EXISTS price_markdown_opt.fn_opt_insert_disc_ia;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_opt_insert_disc_ia(in_strategy_id integer, fut_pcd_start_date date, default_discount integer, _currency_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v0_test_query text;
    vl_test_query text;
    vl_total_count int := 9999999;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
BEGIN
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_dia_temp1_%1$s_%2$s;', in_strategy_id, _currency_type);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_dia_temp2_%1$s_%2$s;', in_strategy_id, _currency_type);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_strategy_sku_store_mapping_%2$s_%1$s;', in_strategy_id, _currency_type);

    v0_test_query := format(
        'CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_strategy_sku_store_mapping_%2$s_%1$s AS
            SELECT 
                DISTINCT
                t1.strategy_id, 
                product_level_id, 
                store_level_id, 
                product_level_value, 
                store_level_value, 
                channel_info, 
                price * planned_conversion_multiplier AS price, 
                price_with_vat * planned_conversion_multiplier AS price_with_vat,
                CASE 
                    WHEN ''%2$s'' = ''local'' THEN t1.currency_id
                    WHEN ''%2$s'' = ''dominating'' THEN t3.dominating_currency_id
                    WHEN ''%2$s'' = ''global'' THEN t3.default_currency_id
                END AS currency_id
            FROM price_markdown.tb_strategy_sku_store_mapping_%1$s t1
            INNER JOIN (
                SELECT s1_id, store_id 
                FROM price_markdown.tb_store_master
            ) t2 ON t1.store_id = t2.store_id
            INNER JOIN global.tb_country_currency_mapping t3 
                ON t3.country_id = t2.s1_id
            INNER JOIN (
                SELECT * 
                FROM global.actual_forex_rate 
                WHERE date = (SELECT MAX(date) FROM global.actual_forex_rate)
            ) t4 
                ON t4.source_currency_id = t1.currency_id 
                AND t4.target_currency_id = CASE 
                    WHEN ''%2$s'' = ''local'' THEN t1.currency_id
                    WHEN ''%2$s'' = ''dominating'' THEN t3.dominating_currency_id
                    WHEN ''%2$s'' = ''global'' THEN t3.default_currency_id
                END;',
        in_strategy_id, _currency_type
    );

    RAISE NOTICE 'Query 1: %', v0_test_query;
    start_time := clock_timestamp();
    EXECUTE v0_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for Query 1: %', end_time - start_time;

    -- Query 1
    vl_test_query :=  format('CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_dia_temp1_%1$s_%3$s AS
                                SELECT t1.strategy_id, t1.currency_id, product_level_id, store_level_id, product_level_value, store_level_value,
                                        t2.pcd_id, t2.previous_pcd_id, t2.pcd_start_date, t1.channel_info, 
                                        round(avg(t1.price)::numeric, 2) as average_retail_price,
                                        round(avg(t1.price_with_vat)::numeric, 2) as average_retail_price_with_vat
                                FROM
                                    price_markdown_opt_temp.tb_strategy_sku_store_mapping_%3$s_%1$s t1
                                INNER JOIN (select strategy_id, pcd_id, pcd_start_date,
								lag(pcd_id) over (partition by strategy_id order by pcd_start_date) as previous_pcd_id
								from price_markdown.tb_strategy_pcd
								where strategy_id = %1$s) t2
                                    ON t1.strategy_id = t2.strategy_id
                                WHERE t1.strategy_id = %1$s
								and t2.pcd_start_date >= ''%2$s''
                                group by 1,2,3,4,5,6,7,8,9,10;', in_strategy_id, fut_pcd_start_date, _currency_type);
    RAISE NOTICE 'Query 2: %', vl_test_query;
    start_time := clock_timestamp();
    EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for Query 2: %', end_time - start_time;

    -- Query 2
    vl_test_query :=  format('CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_dia_temp2_%1$s_%3$s AS
                                (
                                    WITH base AS
                                        (
                                            SELECT product_level_id, store_level_id, event as pcd_id,
                                            base_percentage AS markdown_percentage, 
                                            currency_id, effective_price_point
                                            FROM price_markdown_opt_temp.gurobi_output_id_%3$s_%1$s
                                        )

                                        SELECT a1.strategy_id, a1.product_level_value, a1.store_level_value,
                                            a1.pcd_id, a1.previous_pcd_id, a2.markdown_percentage, a1.product_level_id, a1.store_level_id,
											a1.channel_info, a1.average_retail_price, a1.pcd_start_date,
                                            a2.currency_id, a1.average_retail_price_with_vat,
                                            a2.effective_price_point
                                        FROM price_markdown_opt_temp.tb_dia_temp1_%1$s_%3$s a1
                                        LEFT JOIN base a2
                                            USING(product_level_id, store_level_id, pcd_id, currency_id)
                                );', in_strategy_id, fut_pcd_start_date, _currency_type);
    RAISE NOTICE 'Query 3: %', vl_test_query;
    start_time := clock_timestamp();
    EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for Query 3: %', end_time - start_time;

    -- Query 3
    vl_test_query :=  format('
                            INSERT INTO price_markdown.tb_strategy_discount_ia_%3$s_%1$s(strategy_id, product_level_value, store_level_value, pcd_id,
                                markdown_percentage, is_locked, created_at, updated_at, created_by,
                                updated_by, product_level_id, store_level_id, previous_markdown_percentage, incremental_discount, previous_pcd_id,
								channel_info, average_retail_price, markdown_type, currency_id, average_retail_price_with_vat, 
                                effective_price_point)
                            (
							with base
							as
							(
                                SELECT a1.strategy_id, a1.product_level_value, a1.store_level_value,
                                    a1.pcd_id, a1.previous_pcd_id, COALESCE(a1.markdown_percentage, %2$s) AS markdown_percentage,
                                    COALESCE(is_locked, 0) AS is_locked, CURRENT_TIMESTAMP AS created_at, CURRENT_TIMESTAMP AS updated_at,
                                    0 AS created_by, 0 AS updated_by,
                                    a1.product_level_id, a1.store_level_id, a1.pcd_start_date, a1.channel_info, a1.average_retail_price,
                                    a1.currency_id, a1.average_retail_price_with_vat, effective_price_point
                                FROM
                                    (
                                        SELECT z1.strategy_id, z1.product_level_value, z1.store_level_value,
                                            z1.pcd_id, z1.previous_pcd_id, z1.pcd_start_date,
											COALESCE(z2.markdown_percentage, z1.markdown_percentage) AS markdown_percentage,
                                            z1.product_level_id, z1.store_level_id, z2.is_locked, z1.channel_info, z1.average_retail_price,
                                            z1.currency_id, z1.average_retail_price_with_vat, 											
                                            COALESCE(z2.effective_price_point, z1.effective_price_point) AS effective_price_point
                                        FROM price_markdown_opt_temp.tb_dia_temp2_%1$s_%3$s z1
                                        LEFT JOIN (
                                                    SELECT product_level_id, store_level_id, pcd_id, markdown_percentage, is_locked, 
                                                    effective_price_point
                                                    FROM price_markdown.tb_strategy_discount_%3$s tsdf
                                                    WHERE strategy_id = %1$s
													and is_locked = 1
                                                ) z2
                                                USING(product_level_id, store_level_id, pcd_id)
                                    ) a1
							),
							markdown_num_cte as
							(select product_level_id, store_level_id, pcd_id,
							dense_rank() over (partition by product_level_id, store_level_id order by markdown_percentage) as markdown_num
								from (select strategy_id, product_level_id, store_level_id, pcd_id, markdown_percentage
										from price_markdown.tb_strategy_discount_ia_%3$s_%1$s
										union all
										select strategy_id, product_level_id, store_level_id, pcd_id, markdown_percentage from base) u
							)
								select distinct strategy_id, product_level_value, store_level_value, pcd_id,
                                markdown_percentage, is_locked, created_at, updated_at, created_by,
                                updated_by, product_level_id, store_level_id,
								previous_markdown_percentage, 
                                case when previous_markdown_percentage = 100 or markdown_percentage = previous_markdown_percentage then 0 else
                                coalesce(round(((markdown_percentage - previous_markdown_percentage)/(100 - previous_markdown_percentage))::numeric,2)*100,markdown_percentage) end as incremental_discount,
								previous_pcd_id, channel_info, average_retail_price,
								case when markdown_num = 1 then ''First Markdown'' else ''Final Sale Price'' end as markdown_type,
                                currency_id, average_retail_price_with_vat,
                                effective_price_point
								from
								(select *, coalesce(lag(markdown_percentage) over (partition by product_level_id, store_level_id order by pcd_start_date), prev_mkd_disc, 0) as previous_markdown_percentage
								from base
								left join (select product_level_id, store_level_id,
								max(markdown_percentage) as prev_mkd_disc from price_markdown.tb_strategy_discount_ia_%3$s_%1$s
								group by 1,2) c using(product_level_id, store_level_id)
								left join markdown_num_cte using(product_level_id, store_level_id, pcd_id)) b
                            );', in_strategy_id, default_discount, _currency_type);
    RAISE NOTICE 'Query 4: %', vl_test_query;
    start_time := clock_timestamp();
    EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for Query 4: %', end_time - start_time;

    RETURN true;
END;
$function$
;
