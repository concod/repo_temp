--liquibase formatted sql
--changeset liquibase:fn_opt_insert_disc_ia_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_opt_insert_disc_ia

DROP FUNCTION IF EXISTS price_markdown_opt.fn_opt_insert_disc_ia(int4, date, int4);

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_opt_insert_disc_ia(in_strategy_id integer, fut_pcd_start_date date, default_discount integer)
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
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_dia_temp1_%1$s;', in_strategy_id);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_dia_temp2_%1$s;', in_strategy_id);

    -- Query 1
    vl_test_query :=  format('CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_dia_temp1_%1$s AS
                                SELECT t1.strategy_id, product_level_id, store_level_id, product_level_value, store_level_value,
                                        t2.pcd_id, t2.previous_pcd_id, t2.pcd_start_date, t1.channel_info, round(avg(t1.price)::numeric, 2) as average_retail_price
                                FROM
                                    price_markdown.tb_strategy_sku_store_mapping t1
                                INNER JOIN (select strategy_id, pcd_id, pcd_start_date,
								lag(pcd_id) over (partition by strategy_id order by pcd_start_date) as previous_pcd_id
								from price_markdown.tb_strategy_pcd
								where strategy_id = %1$s) t2
                                    ON t1.strategy_id = t2.strategy_id
                                WHERE t1.strategy_id = %1$s
								and t2.pcd_start_date >= ''%2$s''
                                group by 1,2,3,4,5,6,7,8,9;', in_strategy_id, fut_pcd_start_date);
    RAISE NOTICE 'Query 1: %', vl_test_query;
    start_time := clock_timestamp();
    EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for Query 1: %', end_time - start_time;

    -- Query 2
    vl_test_query :=  format('CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_dia_temp2_%1$s AS
                                (
                                    WITH base AS
                                        (
                                            SELECT product_level_id, store_level_id, event as pcd_id, base_percentage AS markdown_percentage
                                            FROM price_markdown_opt_temp.gurobi_output_id_%1$s
                                        )

                                        SELECT a1.strategy_id, a1.product_level_value, a1.store_level_value,
                                            a1.pcd_id, a1.previous_pcd_id, a2.markdown_percentage, a1.product_level_id, a1.store_level_id,
											a1.channel_info, a1.average_retail_price, a1.pcd_start_date
                                        FROM price_markdown_opt_temp.tb_dia_temp1_%1$s a1
                                        LEFT JOIN base a2
                                            USING(product_level_id, store_level_id, pcd_id)
                                );', in_strategy_id, fut_pcd_start_date);
    RAISE NOTICE 'Query 2: %', vl_test_query;
    start_time := clock_timestamp();
    EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for Query 2: %', end_time - start_time;

    -- Query 3
    vl_test_query :=  format('
                            INSERT INTO price_markdown.tb_strategy_discount_ia_%1$s(strategy_id, product_level_value, store_level_value, pcd_id,
                                markdown_percentage, is_locked, created_at, updated_at, created_by,
                                updated_by, product_level_id, store_level_id, previous_markdown_percentage, incremental_discount, previous_pcd_id,
								channel_info, average_retail_price, markdown_type)
                            (
							with base
							as
							(
                                SELECT a1.strategy_id, a1.product_level_value, a1.store_level_value,
                                    a1.pcd_id, a1.previous_pcd_id, COALESCE(a1.markdown_percentage, %2$s) AS markdown_percentage,
                                    COALESCE(is_locked, 0) AS is_locked, CURRENT_TIMESTAMP AS created_at, CURRENT_TIMESTAMP AS updated_at,
                                    0 AS created_by, 0 AS updated_by,
                                    a1.product_level_id, a1.store_level_id, a1.pcd_start_date, a1.channel_info, a1.average_retail_price
                                FROM
                                    (
                                        SELECT z1.strategy_id, z1.product_level_value, z1.store_level_value,
                                            z1.pcd_id, z1.previous_pcd_id, z1.pcd_start_date,
											COALESCE(z2.markdown_percentage, z1.markdown_percentage) AS markdown_percentage,
                                            z1.product_level_id, z1.store_level_id, z2.is_locked, z1.channel_info, average_retail_price
                                        FROM price_markdown_opt_temp.tb_dia_temp2_%1$s z1
                                        LEFT JOIN (
                                                    SELECT product_level_id, store_level_id, pcd_id, markdown_percentage, is_locked
                                                    FROM price_markdown.tb_strategy_discount tsdf
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
										from price_markdown.tb_strategy_discount_ia_%1$s
										union all
										select strategy_id, product_level_id, store_level_id, pcd_id, markdown_percentage from base) u
							)
								select strategy_id, product_level_value, store_level_value, pcd_id,
                                markdown_percentage, is_locked, created_at, updated_at, created_by,
                                updated_by, product_level_id, store_level_id,
								previous_markdown_percentage, coalesce(round(((markdown_percentage - previous_markdown_percentage)/(100 - previous_markdown_percentage))::numeric,2)*100,markdown_percentage) as incremental_discount,
								previous_pcd_id, channel_info, average_retail_price,
								case when markdown_num = 1 then ''First Markdown'' else ''Final Sale Price'' end as markdown_type
								from
								(select *, coalesce(lag(markdown_percentage) over (partition by product_level_id, store_level_id order by pcd_start_date), prev_mkd_disc, 0) as previous_markdown_percentage
								from base
								left join (select product_level_id, store_level_id,
								max(markdown_percentage) as prev_mkd_disc from price_markdown.tb_strategy_discount_ia_%1$s
								group by 1,2) c using(product_level_id, store_level_id)
								left join markdown_num_cte using(product_level_id, store_level_id, pcd_id)) b
                            );', in_strategy_id, default_discount);
    RAISE NOTICE 'Query 3: %', vl_test_query;
    start_time := clock_timestamp();
    EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for Query 3: %', end_time - start_time;

    RETURN true;
END;
$function$
;
