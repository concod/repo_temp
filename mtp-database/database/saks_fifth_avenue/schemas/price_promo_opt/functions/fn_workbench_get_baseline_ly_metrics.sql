--liquibase formatted sql
--changeset liquibase:fn_workbench_get_baseline_ly_metrics_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_workbench_get_baseline_ly_metrics

DROP FUNCTION IF EXISTS price_promo_opt.fn_workbench_get_baseline_ly_metrics(int4);

CREATE OR REPLACE FUNCTION price_promo_opt.fn_workbench_get_baseline_ly_metrics(_promo_id integer)
 RETURNS TABLE(baseline_revenue numeric, baseline_margin numeric, baseline_units numeric, baseline_gm_percent numeric, ly_revenue numeric, ly_margin numeric, ly_units numeric, ly_gm_percent numeric)
 LANGUAGE plpgsql
AS $function$
DECLARE
    where_condition TEXT := '';
    _start_date DATE;
    _end_date DATE;
    _store_selection_config INTEGER ;
BEGIN
    -- Fetch start and end dates from get_promo_details function
    SELECT start_date, end_date, store_selection_type
    INTO _start_date, _end_date, _store_selection_config
    FROM price_promo_opt.fn_get_promo_details(_promo_id);

    -- Define the WHERE condition based on _store_selection_config
    IF _store_selection_config = 2 THEN
        where_condition := 'AND a.s1_id = 1';
    ELSIF _store_selection_config = 3 THEN
        where_condition := 'AND a.s1_id = 2';
    END IF;

    -- Handle _store_selection_config <= 3
    IF _store_selection_config >= 0 THEN
        RETURN QUERY EXECUTE '
        WITH products_cte AS (
            SELECT * FROM
            price_promo.fn_fetch_products_for_promo($1)
        ),
        baseline_cte AS (
            SELECT
                SUM(a.revenue) AS baseline_revenue,
                SUM(a.margin) AS baseline_margin,
                SUM(a.units) AS baseline_units,
                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS baseline_gm_percent
            FROM price_promo_opt.tb_budget_master_baseline_agg a
            INNER JOIN products_cte b ON a.product_id = b.product_id
            WHERE a.dates BETWEEN $2 AND $3 ' || where_condition || '
        ),
        ly_cte AS (
            SELECT
                SUM(a.revenue) AS ly_revenue,
                SUM(a.margin) AS ly_margin,
                SUM(a.units) AS ly_units,
                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS ly_gm_percent
            FROM price_promo_opt.tb_budget_master_ly_agg a
            INNER JOIN products_cte b ON a.product_id = b.product_id
            WHERE a.dates BETWEEN $2  AND $3  ' || where_condition || '
			HAVING SUM(a.revenue) IS NOT NULL
        )
        SELECT
            COALESCE(ROUND(baseline_cte.baseline_revenue::numeric, 2), 0) baseline_revenue,
            COALESCE(ROUND(baseline_cte.baseline_margin::numeric, 2), 0) baseline_margin,
            COALESCE(ROUND(baseline_cte.baseline_units::numeric, 2), 0) baseline_units,
            COALESCE(ROUND(baseline_cte.baseline_gm_percent::numeric, 2), 0) baseline_gm_percent,
            COALESCE(ROUND(ly_cte.ly_revenue::numeric, 2), 0) ly_revenue,
            COALESCE(ROUND(ly_cte.ly_margin::numeric, 2), 0) ly_margin,
            COALESCE(ROUND(ly_cte.ly_units::numeric, 2), 0) ly_units,
            COALESCE(ROUND(ly_cte.ly_gm_percent::numeric, 2), 0) ly_gm_percent
        FROM
			baseline_cte
			cross join ly_cte
		'
        USING _promo_id, _start_date, _end_date;
    END IF;

    -- Handle _store_selection_config > 3
    IF _store_selection_config < 0 THEN
        RETURN QUERY EXECUTE '
        WITH products_cte AS (
            SELECT * FROM price_promo.fn_fetch_products_for_promo($1)
        ),
        stores_cte AS (
            SELECT * FROM price_promo.fn_fetch_stores_for_promo($1)
        ),
        baseline_cte AS (
            SELECT
                SUM(a.revenue) AS baseline_revenue,
                SUM(a.margin) AS baseline_margin,
                SUM(a.units) AS baseline_units,
                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS baseline_gm_percent
            FROM price_promo_opt.tb_budget_master_baseline a
            INNER JOIN products_cte b ON a.product_id = b.product_id
            INNER JOIN stores_cte c ON a.store_id = c.store_id
            WHERE a.dates BETWEEN $2 AND $3
        ),
        ly_cte AS (
            SELECT
                SUM(a.revenue) AS ly_revenue,
                SUM(a.margin) AS ly_margin,
                SUM(a.units) AS ly_units,
                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS ly_gm_percent
            FROM price_promo_opt.tb_budget_master_ly a
            INNER JOIN products_cte b ON a.product_id = b.product_id
            INNER JOIN stores_cte c ON a.store_id = c.store_id
            WHERE a.dates BETWEEN $2 AND $3
			HAVING SUM(a.revenue) IS NOT NULL
        )
        SELECT
            COALESCE(ROUND(baseline_cte.baseline_revenue::numeric, 2), 0) baseline_revenue,
            COALESCE(ROUND(baseline_cte.baseline_margin::numeric, 2), 0) baseline_margin,
            COALESCE(ROUND(baseline_cte.baseline_units::numeric, 2), 0) baseline_units,
            COALESCE(ROUND(baseline_cte.baseline_gm_percent::numeric, 2), 0) baseline_gm_percent,
            COALESCE(ROUND(ly_cte.ly_revenue::numeric, 2), 0) ly_revenue,
            COALESCE(ROUND(ly_cte.ly_margin::numeric, 2), 0) ly_margin,
            COALESCE(ROUND(ly_cte.ly_units::numeric, 2), 0) ly_units,
            COALESCE(ROUND(ly_cte.ly_gm_percent::numeric, 2), 0) ly_gm_percent
        FROM
			baseline_cte
			cross join ly_cte
			'
        USING _promo_id, _start_date, _end_date;
    END IF;

    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
       		0::numeric AS baseline_revenue,
       		0::numeric AS baseline_margin,
       		0::numeric AS baseline_units,
       		0::numeric AS baseline_gm_percent,
       		0::numeric AS ly_revenue,
       		0::numeric AS ly_margin,
       		0::numeric AS ly_units,
       		0::numeric AS ly_gm_percent;
    END IF;
END;
$function$
;
