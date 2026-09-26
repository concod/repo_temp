--liquibase formatted sql
--changeset liquibase:pc_insert_stg_metric_06042026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_insert_stg_metric

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_insert_stg_metric(int4);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_insert_stg_metric(IN _strategy_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _is_there integer;
    delete_query text;
    insert_query text;
BEGIN
    SELECT ia_value_exists::integer
    INTO _is_there
    FROM price_markdown_opt.fn_check_metric_table_data_exists(_strategy_id);

    delete_query := 'DELETE FROM price_markdown.tb_stg_metric WHERE strategy_id = $1;';
    EXECUTE delete_query USING _strategy_id;
    RAISE NOTICE 'Deleted the data from stg_metric table';

    IF _is_there = 1 THEN
        insert_query := '
        INSERT INTO price_markdown.tb_stg_metric (
            strategy_id, sales_units_ia, sales_units_fin, revenue_ia, revenue_fin,
            margin_ia, margin_fin, spend_ia, spend_fin, currency_id,
            revenue_ia_with_vat, revenue_fin_with_vat, margin_ia_with_vat, margin_fin_with_vat,
            spend_ia_with_vat, spend_fin_with_vat,
        baseline_sales_units_ia, baseline_sales_units_fin, baseline_revenue_ia, baseline_revenue_fin,
        baseline_margin_ia, baseline_margin_fin, baseline_spend_ia, baseline_spend_fin,
        baseline_revenue_ia_with_vat, baseline_revenue_fin_with_vat, baseline_margin_ia_with_vat, baseline_margin_fin_with_vat,
        baseline_spend_ia_with_vat, baseline_spend_fin_with_vat,
        incremental_sales_units_ia, incremental_sales_units_fin, incremental_revenue_ia, incremental_revenue_fin,
        incremental_margin_ia, incremental_margin_fin, incremental_spend_ia, incremental_spend_fin,
        incremental_revenue_ia_with_vat, incremental_revenue_fin_with_vat, incremental_margin_ia_with_vat, incremental_margin_fin_with_vat,
        incremental_spend_ia_with_vat, incremental_spend_fin_with_vat)
        SELECT
            a.strategy_id,
            a.sales_units_ia, b.sales_units_fin,
            a.revenue_ia, b.revenue_fin,
            a.margin_ia, b.margin_fin,
            a.spend_ia, b.spend_fin,
            a.currency_id,
            a.revenue_ia_with_vat, b.revenue_fin_with_vat,
            a.margin_ia_with_vat, b.margin_fin_with_vat,
            a.spend_ia_with_vat, b.spend_fin_with_vat,
            a.baseline_sales_units_ia, b.baseline_sales_units_fin,
            a.baseline_revenue_ia, b.baseline_revenue_fin,
            a.baseline_margin_ia, b.baseline_margin_fin,
            a.baseline_spend_ia, b.baseline_spend_fin,
            a.baseline_revenue_ia_with_vat, b.baseline_revenue_fin_with_vat,
            a.baseline_margin_ia_with_vat, b.baseline_margin_fin_with_vat,
            a.baseline_spend_ia_with_vat, b.baseline_spend_fin_with_vat,
            a.incremental_sales_units_ia, b.incremental_sales_units_fin,
            a.incremental_revenue_ia, b.incremental_revenue_fin,
            a.incremental_margin_ia, b.incremental_margin_fin,
            a.incremental_spend_ia, b.incremental_spend_fin,
            a.incremental_revenue_ia_with_vat, b.incremental_revenue_fin_with_vat,
            a.incremental_margin_ia_with_vat, b.incremental_margin_fin_with_vat,
            a.incremental_spend_ia_with_vat, b.incremental_spend_fin_with_vat
        FROM
        (
            SELECT
                strategy_id,
                currency_id,
                SUM(sales_units) AS sales_units_ia,
                SUM(revenue) AS revenue_ia,
                SUM(margin) AS margin_ia,
                SUM(spend) AS spend_ia,
                SUM(revenue_with_vat) AS revenue_ia_with_vat,
                SUM(margin_with_vat) AS margin_ia_with_vat,
                SUM(spend_with_vat) AS spend_ia_with_vat,
                SUM(COALESCE(baseline_sales_units, 0)) AS baseline_sales_units_ia,
                SUM(COALESCE(baseline_revenue, 0)) AS baseline_revenue_ia,
                SUM(COALESCE(baseline_margin, 0)) AS baseline_margin_ia,
                SUM(COALESCE(baseline_spend, 0)) AS baseline_spend_ia,
                SUM(COALESCE(baseline_revenue_with_vat, 0)) AS baseline_revenue_ia_with_vat,
                SUM(COALESCE(baseline_margin_with_vat, 0)) AS baseline_margin_ia_with_vat,
                SUM(COALESCE(baseline_spend_with_vat, 0)) AS baseline_spend_ia_with_vat,
                SUM(sales_units) - SUM(COALESCE(baseline_sales_units, 0)) AS incremental_sales_units_ia,
                SUM(revenue) - SUM(COALESCE(baseline_revenue, 0)) AS incremental_revenue_ia,
                SUM(margin) - SUM(COALESCE(baseline_margin, 0)) AS incremental_margin_ia,
                SUM(spend) - SUM(COALESCE(baseline_spend, 0)) AS incremental_spend_ia,
                SUM(revenue_with_vat) - SUM(COALESCE(baseline_revenue_with_vat, 0)) AS incremental_revenue_ia_with_vat,
                SUM(margin_with_vat) - SUM(COALESCE(baseline_margin_with_vat, 0)) AS incremental_margin_ia_with_vat,
                SUM(spend_with_vat) - SUM(COALESCE(baseline_spend_with_vat, 0)) AS incremental_spend_ia_with_vat
            FROM price_markdown.tb_agg_ia
            WHERE strategy_id = $1
            GROUP BY strategy_id, currency_id
        ) a
        JOIN
        (
            SELECT
                strategy_id,
                currency_id,
                SUM(sales_units) AS sales_units_fin,
                SUM(revenue) AS revenue_fin,
                SUM(margin) AS margin_fin,
                SUM(spend) AS spend_fin,
                SUM(revenue_with_vat) AS revenue_fin_with_vat,
                SUM(margin_with_vat) AS margin_fin_with_vat,
                SUM(spend_with_vat) AS spend_fin_with_vat,
                SUM(COALESCE(baseline_sales_units, 0)) AS baseline_sales_units_fin,
                SUM(COALESCE(baseline_revenue, 0)) AS baseline_revenue_fin,
                SUM(COALESCE(baseline_margin, 0)) AS baseline_margin_fin,
                SUM(COALESCE(baseline_spend, 0)) AS baseline_spend_fin,
                SUM(COALESCE(baseline_revenue_with_vat, 0)) AS baseline_revenue_fin_with_vat,
                SUM(COALESCE(baseline_margin_with_vat, 0)) AS baseline_margin_fin_with_vat,
                SUM(COALESCE(baseline_spend_with_vat, 0)) AS baseline_spend_fin_with_vat,
                SUM(sales_units) - SUM(COALESCE(baseline_sales_units, 0)) AS incremental_sales_units_fin,
                SUM(revenue) - SUM(COALESCE(baseline_revenue, 0)) AS incremental_revenue_fin,
                SUM(margin) - SUM(COALESCE(baseline_margin, 0)) AS incremental_margin_fin,
                SUM(spend) - SUM(COALESCE(baseline_spend, 0)) AS incremental_spend_fin,
                SUM(revenue_with_vat) - SUM(COALESCE(baseline_revenue_with_vat, 0)) AS incremental_revenue_fin_with_vat,
                SUM(margin_with_vat) - SUM(COALESCE(baseline_margin_with_vat, 0)) AS incremental_margin_fin_with_vat,
                SUM(spend_with_vat) - SUM(COALESCE(baseline_spend_with_vat, 0)) AS incremental_spend_fin_with_vat
            FROM price_markdown.tb_agg_fin
            WHERE strategy_id = $1
            GROUP BY strategy_id, currency_id
        ) b
        USING (strategy_id, currency_id);';

    ELSE
        insert_query := '
        INSERT INTO price_markdown.tb_stg_metric (
            strategy_id, sales_units_ia, sales_units_fin, revenue_ia, revenue_fin,
            margin_ia, margin_fin, spend_ia, spend_fin,
            currency_id, revenue_ia_with_vat, revenue_fin_with_vat, margin_ia_with_vat, margin_fin_with_vat,
            spend_ia_with_vat, spend_fin_with_vat,
            baseline_sales_units_ia, baseline_sales_units_fin, baseline_revenue_ia, baseline_revenue_fin,
            baseline_margin_ia, baseline_margin_fin, baseline_spend_ia, baseline_spend_fin,
            baseline_revenue_ia_with_vat, baseline_revenue_fin_with_vat, baseline_margin_ia_with_vat, baseline_margin_fin_with_vat,
            baseline_spend_ia_with_vat, baseline_spend_fin_with_vat,
            incremental_sales_units_ia, incremental_sales_units_fin, incremental_revenue_ia, incremental_revenue_fin,
            incremental_margin_ia, incremental_margin_fin, incremental_spend_ia, incremental_spend_fin,
            incremental_revenue_ia_with_vat, incremental_revenue_fin_with_vat, incremental_margin_ia_with_vat, incremental_margin_fin_with_vat,
            incremental_spend_ia_with_vat, incremental_spend_fin_with_vat)
        SELECT
            strategy_id,
            0 AS sales_units_ia, SUM(sales_units) AS sales_units_fin,
            0 AS revenue_ia, SUM(revenue) AS revenue_fin,
            0 AS margin_ia, SUM(margin) AS margin_fin,
            0 AS spend_ia, SUM(spend) AS spend_fin,
            currency_id,
            0 AS revenue_ia_with_vat, SUM(revenue_with_vat) AS revenue_fin_with_vat,
            0 AS margin_ia_with_vat, SUM(margin_with_vat) AS margin_fin_with_vat,
            0 AS spend_ia_with_vat, SUM(spend_with_vat) AS spend_fin_with_vat,
            0::float8 AS baseline_sales_units_ia, SUM(COALESCE(baseline_sales_units, 0)) AS baseline_sales_units_fin,
            0::float8 AS baseline_revenue_ia, SUM(COALESCE(baseline_revenue, 0)) AS baseline_revenue_fin,
            0::float8 AS baseline_margin_ia, SUM(COALESCE(baseline_margin, 0)) AS baseline_margin_fin,
            0::float8 AS baseline_spend_ia, SUM(COALESCE(baseline_spend, 0)) AS baseline_spend_fin,
            0::float8 AS baseline_revenue_ia_with_vat, SUM(COALESCE(baseline_revenue_with_vat, 0)) AS baseline_revenue_fin_with_vat,
            0::float8 AS baseline_margin_ia_with_vat, SUM(COALESCE(baseline_margin_with_vat, 0)) AS baseline_margin_fin_with_vat,
            0::float8 AS baseline_spend_ia_with_vat, SUM(COALESCE(baseline_spend_with_vat, 0)) AS baseline_spend_fin_with_vat,
            0::float8 AS incremental_sales_units_ia,
            SUM(sales_units) - SUM(COALESCE(baseline_sales_units, 0)) AS incremental_sales_units_fin,
            0::float8 AS incremental_revenue_ia,
            SUM(revenue) - SUM(COALESCE(baseline_revenue, 0)) AS incremental_revenue_fin,
            0::float8 AS incremental_margin_ia,
            SUM(margin) - SUM(COALESCE(baseline_margin, 0)) AS incremental_margin_fin,
            0::float8 AS incremental_spend_ia,
            SUM(spend) - SUM(COALESCE(baseline_spend, 0)) AS incremental_spend_fin,
            0::float8 AS incremental_revenue_ia_with_vat,
            SUM(revenue_with_vat) - SUM(COALESCE(baseline_revenue_with_vat, 0)) AS incremental_revenue_fin_with_vat,
            0::float8 AS incremental_margin_ia_with_vat,
            SUM(margin_with_vat) - SUM(COALESCE(baseline_margin_with_vat, 0)) AS incremental_margin_fin_with_vat,
            0::float8 AS incremental_spend_ia_with_vat,
            SUM(spend_with_vat) - SUM(COALESCE(baseline_spend_with_vat, 0)) AS incremental_spend_fin_with_vat
        FROM price_markdown.tb_agg_fin
        WHERE strategy_id = $1
        GROUP BY strategy_id, currency_id;';
    END IF;

    RAISE NOTICE 'Insert query: %', insert_query;
    EXECUTE insert_query USING _strategy_id;
    RAISE NOTICE 'Inserted data into stg metric table';
END;
$procedure$
;
