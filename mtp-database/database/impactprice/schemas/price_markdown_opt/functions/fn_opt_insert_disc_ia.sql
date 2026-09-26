--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co::fn_opt_insert_disc_ia_01042026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_opt_insert_disc_ia_01042026

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
                                SELECT t1.strategy_id, t1.currency_id, product_level_id, store_level_id,
                                        t2.pcd_id, t2.previous_pcd_id, t2.pcd_start_date, t1.channel_info, t2.pcd_order_key,
                                        round(avg(t1.price)::numeric, 2) as average_retail_price,
                                        round(avg(t1.price_with_vat)::numeric, 2) as average_retail_price_with_vat
                                FROM
                                    price_markdown.tb_strategy_sku_store_mapping t1
                                INNER JOIN (select strategy_id, pcd_id, pcd_start_date,order_number as pcd_order_key,
								lag(pcd_id) over (partition by strategy_id order by pcd_start_date) as previous_pcd_id
								from price_markdown.tb_strategy_pcd_new
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

                                        SELECT a1.strategy_id,
                                            a1.pcd_id, a1.previous_pcd_id, a2.markdown_percentage, a1.product_level_id, a1.store_level_id,
											a1.channel_info, a1.average_retail_price, a1.pcd_start_date,
                                            a1.currency_id, a1.average_retail_price_with_vat, a1.pcd_order_key
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
                            INSERT INTO price_markdown.tb_strategy_discount_level(strategy_id, product_level_id, store_level_id, currency_id, channel_info,
                                ia_pcd_data, pcd_data, created_at, updated_at, created_by, updated_by)
                            (
							with base as
							(
                                SELECT a1.strategy_id,
                                    a1.pcd_id, a1.previous_pcd_id, COALESCE(a1.markdown_percentage, %2$s) AS markdown_percentage,
                                    COALESCE(is_locked, 0) AS is_locked,
                                    a1.product_level_id, a1.store_level_id, a1.pcd_start_date, a1.channel_info, a1.average_retail_price,
                                    a1.currency_id, a1.average_retail_price_with_vat, a1.pcd_order_key
                                FROM
                                    (
                                        SELECT z1.strategy_id,
                                            z1.pcd_id, z1.previous_pcd_id, z1.pcd_start_date,
											COALESCE(z2.markdown_percentage, z1.markdown_percentage) AS markdown_percentage,
                                            z1.product_level_id, z1.store_level_id, z2.is_locked, z1.channel_info, z1.average_retail_price,
                                            z1.currency_id, z1.average_retail_price_with_vat, z1.pcd_order_key
                                        FROM price_markdown_opt_temp.tb_dia_temp2_%1$s z1
                                        LEFT JOIN (
                                                    SELECT product_level_id, store_level_id,
                                                            (pcd.value->>''pcd_id'')::integer as pcd_id,
                                                            (pcd.value->>''markdown_percentage'')::numeric as markdown_percentage,
                                                            (pcd.value->>''is_locked'')::integer as is_locked
                                                    FROM price_markdown.tb_strategy_discount_level tsdf
                                                    CROSS JOIN LATERAL jsonb_each(COALESCE(tsdf.pcd_data, ''{}''::jsonb)) as pcd(key, value)
                                                    WHERE tsdf.strategy_id = %1$s
                                                    AND (pcd.value->>''is_locked'')::integer = 1
                                                ) z2
                                                USING(product_level_id, store_level_id, pcd_id)
                                    ) a1
							),
							existing_ia_data as
							(
                                select product_level_id, store_level_id,
                                        (pcd.value->>''ia_pcd_id'')::integer as pcd_id,
                                        (pcd.value->>''ia_markdown_percentage'')::numeric as markdown_percentage,
                                        currency_id, channel_info
                                from price_markdown.tb_strategy_discount_level tsd,
                                jsonb_each(COALESCE(tsd.ia_pcd_data, ''{}''::jsonb)) as pcd(key, value)
                                where tsd.strategy_id = %1$s
							),
							prev_mkd_cte as
							(
                                select product_level_id, store_level_id,
                                       max((pcd.value->>''ia_markdown_percentage'')::numeric) as prev_mkd_disc
                                from price_markdown.tb_strategy_discount_level tsd,
                                jsonb_each(COALESCE(tsd.ia_pcd_data, ''{}''::jsonb)) as pcd(key, value)
                                where tsd.strategy_id = %1$s
                                group by 1,2
							),
							markdown_num_cte as
							(select product_level_id, store_level_id, pcd_id,
							dense_rank() over (partition by product_level_id, store_level_id order by markdown_percentage) as markdown_num
								from (select product_level_id, store_level_id, pcd_id, markdown_percentage
										from existing_ia_data
										union all
										select product_level_id, store_level_id, pcd_id, markdown_percentage from base) u
							),
							final as
							(select strategy_id, product_level_id, store_level_id, pcd_id,
                                markdown_percentage, is_locked, created_at, updated_at, created_by,
                                updated_by,
								previous_markdown_percentage, 
                                case when previous_markdown_percentage = 100 or markdown_percentage = previous_markdown_percentage then 0 else
                                coalesce(round(((markdown_percentage - previous_markdown_percentage)/(100 - previous_markdown_percentage))::numeric,2)*100,markdown_percentage) end as incremental_discount,
								previous_pcd_id, channel_info, average_retail_price,
								case when markdown_num = 1 then ''First Markdown'' else ''Final Sale Price'' end as markdown_type,
                                currency_id, average_retail_price_with_vat, pcd_order_key
								from
								(select *, 
								CURRENT_TIMESTAMP AS created_at, CURRENT_TIMESTAMP AS updated_at,
                                0 AS created_by, 0 AS updated_by,
								coalesce(lag(markdown_percentage) over (partition by product_level_id, store_level_id order by pcd_start_date), prev_mkd_disc, 0) as previous_markdown_percentage
								from base
								left join prev_mkd_cte using(product_level_id, store_level_id)
								left join markdown_num_cte using(product_level_id, store_level_id, pcd_id)) b
							)
							select strategy_id, product_level_id, store_level_id, 
                            currency_id, channel_info,
							jsonb_object_agg(
                                pcd_order_key::text,
                                jsonb_build_object(
                                    ''ia_pcd_id'',                       pcd_id,
                                    ''ia_markdown_percentage'',          markdown_percentage,
                                    ''ia_incremental_discount'',         incremental_discount,
                                    ''ia_previous_markdown_percentage'', previous_markdown_percentage,
                                    ''ia_markdown_type'',                markdown_type,
                                    ''ia_average_retail_price'',         average_retail_price,
                                    ''ia_average_retail_price_with_vat'', average_retail_price_with_vat
                                )
                            ) as ia_pcd_data,
                            ''{}''::jsonb as pcd_data,
                            current_timestamp as created_at,
                            current_timestamp as updated_at,
                            0 as created_by,
                            0 as updated_by
							from final
							group by 1,2,3,4,5
                            )
                            ON CONFLICT (strategy_id, product_level_id, store_level_id)
                            DO UPDATE SET
                                ia_pcd_data = COALESCE(price_markdown.tb_strategy_discount_level.ia_pcd_data, ''{}''::jsonb) || EXCLUDED.ia_pcd_data,
                                updated_at = current_timestamp
                            ;', in_strategy_id, default_discount);
    RAISE NOTICE 'Query 3: %', vl_test_query;
    start_time := clock_timestamp();
    EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for Query 3: %', end_time - start_time;

    RETURN true;
END;
$function$
;