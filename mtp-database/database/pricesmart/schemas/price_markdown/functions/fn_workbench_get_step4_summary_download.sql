--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_workbench_get_step4_summary_download runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_workbench_get_step4_summary_download
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_workbench_get_step4_summary_download;
CREATE OR REPLACE FUNCTION price_markdown.fn_workbench_get_step4_summary_download(_sid integer, _table_type character varying)
 RETURNS TABLE("Discount Bucket" character varying, "PCD Start Date" date, "PCD End Date" date, "SKU-Store Count" numeric, "Inventory Units" numeric, "Markdown $" numeric, "Units" numeric, "Revenue $" numeric, "Margin $" numeric)
	LANGUAGE plpgsql
AS $function$
DECLARE
    vl_test_query text;
    vl_total_count int := 9999999;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    future_start_date date;
    _temp_integer int := TO_NUMBER(TO_CHAR(CURRENT_TIMESTAMP, 'HH24MISS'), '999999');
    _discount_table text;
BEGIN
    IF _table_type = 'ia' THEN
        _discount_table := 'price_markdown.tb_strategy_discount_ia';
    ELSIF _table_type = 'blo' THEN
        _discount_table := 'price_markdown.tb_strategy_discount';
    ELSE
        _discount_table := 'price_markdown.tb_strategy_discount_finalized';
    END IF;

    EXECUTE format('DROP TABLE IF EXISTS markdown_opt.tb_sum_alldisc_%1$s_%2$s_%3$s;', _sid, _table_type, _temp_integer);
    vl_test_query := format('
        CREATE UNLOGGED TABLE markdown_opt.tb_sum_alldisc_%1$s_%2$s_%3$s AS
        (SELECT
            a.product_level_id,
            a.store_level_id,
            a.pcd_id,
            a.product_level_value,
            a.store_level_value,
            a.markdown_percentage AS draft_discount,
            CONCAT(FLOOR(markdown_percentage / 10) * 10, ''%% - '',
                   FLOOR(markdown_percentage / 10) * 10 + 10, ''%%'')::VARCHAR AS discount_bucket,
            d.pcd_start_date,
            d.pcd_end_date,
            COUNT(b.product_level_id) AS sku_store_count
        FROM
            %4$s a
        LEFT JOIN
            price_markdown.tb_strategy_sku_store_mapping b ON a.product_level_id = b.product_level_id
                                                      AND a.store_level_id = b.store_level_id
                                                      AND a.strategy_id = b.strategy_id
        INNER JOIN
            price_markdown.tb_strategy_pcd d ON a.strategy_id = d.strategy_id
                                         AND a.pcd_id = d.pcd_id
        WHERE
            a.strategy_id = %1$s
        GROUP BY
            1,2,3,4,5,6,7,8,9)
        ;', _sid, _table_type, _temp_integer, _discount_table);

    RAISE NOTICE 'query- 1 --%', vl_test_query;
    start_time := clock_timestamp();
    EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;

    EXECUTE format('DROP TABLE IF EXISTS markdown_opt.tb_sum_metrics_%1$s_%2$s_%3$s ;', _sid, _table_type, _temp_integer);
    vl_test_query := format('CREATE UNLOGGED TABLE markdown_opt.tb_sum_metrics_%1$s_%2$s_%3$s AS
        (SELECT
            product_level_id,
            store_level_id,
            pcd_id,
            recommended_offer_percentage,
            CONCAT(FLOOR(recommended_offer_percentage / 10) * 10, ''%% - '',
                   FLOOR(recommended_offer_percentage / 10) * 10 + 10, ''%%'')::VARCHAR AS discount_bucket,
            SUM(sales_units) AS sales_units,
            SUM(revenue) AS revenue,
            SUM(margin) AS margin,
            SUM(spend) AS spend,
            SUM(sales_units) + MIN(rem_inv) AS rem_inv
        FROM
            price_markdown.fn_create_strategies_union_query_from_agg_tables(ARRAY[%1$s], ''%2$s'')
        GROUP BY
            1, 2, 3, 4, 5
    );', _sid, _table_type, _temp_integer);

    RAISE NOTICE 'query- 2 --%', vl_test_query;
    start_time := clock_timestamp();
    EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 2 statement: %', end_time - start_time;

    EXECUTE format('DROP TABLE IF EXISTS markdown_opt.tb_sum_bucketdisc_%1$s_%2$s_%3$s ;', _sid, _table_type, _temp_integer);
    vl_test_query := format('CREATE UNLOGGED TABLE markdown_opt.tb_sum_bucketdisc_%1$s_%2$s_%3$s AS
        (SELECT
            discount_bucket, pcd_id, pcd_start_date, pcd_end_date, SUM(sku_store_count) AS sku_store_count
        FROM
            markdown_opt.tb_sum_alldisc_%1$s_%2$s_%3$s
        GROUP BY
            1, 2, 3, 4);', _sid, _table_type, _temp_integer);

    RAISE NOTICE 'query- 3 --%', vl_test_query;
    start_time := clock_timestamp();
    EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 3 statement: %', end_time - start_time;

    EXECUTE format('DROP TABLE IF EXISTS markdown_opt.tb_sum_bucketmetrics_%1$s_%2$s_%3$s ;', _sid, _table_type, _temp_integer);
    vl_test_query := format('CREATE UNLOGGED TABLE markdown_opt.tb_sum_bucketmetrics_%1$s_%2$s_%3$s AS
        (SELECT
            discount_bucket, pcd_id, SUM(sales_units) AS sales_units, SUM(revenue) AS revenue,
            SUM(margin) AS margin, SUM(spend) AS spend, SUM(rem_inv) AS rem_inv
        FROM
            markdown_opt.tb_sum_metrics_%1$s_%2$s_%3$s
        GROUP BY
            1, 2);', _sid, _table_type, _temp_integer);

    RAISE NOTICE 'query- 4 --%', vl_test_query;
    start_time := clock_timestamp();
    EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 4 statement: %', end_time - start_time;


   vl_test_query :=  format('
   SELECT
        a.discount_bucket,
        a.pcd_start_date,
        a.pcd_end_date,
        a.sku_store_count,
        ROUND(b.rem_inv::numeric, 0) AS "Inventory",
        ROUND(b.spend::numeric, 0) AS "Markdown $",
        ROUND(b.sales_units::numeric, 0) AS "Units",
        ROUND(b.revenue::numeric, 0) AS "Revenue $",
        ROUND(b.margin::numeric, 0) AS "Margin $"
    FROM
        markdown_opt.tb_sum_bucketdisc_%1$s_%2$s_%3$s a
    LEFT JOIN
        markdown_opt.tb_sum_bucketmetrics_%1$s_%2$s_%3$s b
    ON
        a.discount_bucket = b.discount_bucket
        AND a.pcd_id = b.pcd_id
	    ;', _sid, _table_type, _temp_integer);

    RAISE NOTICE 'query- 5 A --%', vl_test_query;
    start_time := clock_timestamp();
    RETURN QUERY EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 5 A statement: %', end_time - start_time;

    -- Drop temporary tables
    EXECUTE format('DROP TABLE IF EXISTS markdown_opt.tb_sum_alldisc_%1$s_%2$s_%3$s', _sid, _table_type, _temp_integer);
    EXECUTE format('DROP TABLE IF EXISTS markdown_opt.tb_sum_metrics_%1$s_%2$s_%3$s', _sid, _table_type, _temp_integer);
    EXECUTE format('DROP TABLE IF EXISTS markdown_opt.tb_sum_bucketdisc_%1$s_%2$s_%3$s',_sid, _table_type, _temp_integer);
    EXECUTE format('DROP TABLE IF EXISTS markdown_opt.tb_sum_bucketmetrics_%1$s_%2$s_%3$s', _sid, _table_type, _temp_integer);
END;
$function$
;