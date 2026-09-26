--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_workbench_get_baseline_ly_ty_metrics runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_workbench_get_baseline_ly_ty_metrics

DROP FUNCTION IF EXISTS price_promo_opt.fn_workbench_get_baseline_ly_ty_metrics ;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_workbench_get_baseline_ly_ty_metrics(_promo_id integer) RETURNS TABLE(baseline_revenue numeric, baseline_margin numeric, baseline_units numeric, baseline_gm_percent numeric, ly_revenue numeric, ly_margin numeric, ly_units numeric, ly_gm_percent numeric, ty_revenue numeric, ty_margin numeric, ty_units numeric, ty_gm_percent numeric)
 LANGUAGE plpgsql
AS $function$
DECLARE
    where_condition TEXT := '';
    _start_date DATE;
    _end_date DATE;
    _store_selection_config INTEGER ;
	ly_start_date DATE; 
	ly_end_date DATE; query text;
BEGIN

---------------------------------------------------------------------------------

RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
--PERFORM set_config('enable_nestloop', 'off', true);
SET LOCAL enable_nestloop to off;
RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);

---------------------------------------------------------------------------------

    -- Fetch start and end dates from get_promo_details function
    SELECT start_date, end_date, store_selection_type,     (start_date::date - INTERVAL '1 year'), (end_date::date - INTERVAL '1 year')
    INTO _start_date, _end_date, _store_selection_config, ly_start_date, ly_end_date
    FROM price_promo_opt.fn_get_promo_details(_promo_id);

if _store_selection_config = 1 then 
        query := format( $q$
        WITH products_cte AS materialized (
            SELECT * FROM price_promo.fn_fetch_products_for_promo(%s)
        ),

        customers_cte as materialized(
        	select distinct cm.c0_id from price_promo.tb_promo_customers tpc  
        	inner join global.customer_master cm on tpc.customer_id = cm.c2_id
        	where tpc.promo_id = %s
        ), 

        baseline_cte AS materialized(  
            SELECT
                SUM(a.revenue) AS baseline_revenue,
                SUM(a.margin) AS baseline_margin,
                SUM(a.sales_units) AS baseline_units,
                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS baseline_gm_percent
            FROM price_promo_opt.tb_budget_master_baseline_agg a
            INNER JOIN products_cte b ON a.product_id = b.product_id
--            INNER JOIN stores_cte c ON a.s0_id = c.s0_id and a.s3_id = c.s3_id 
			inner join customers_cte cust on a.c0_id = cust.c0_id 
            WHERE a.dates BETWEEN '%s' AND '%s'
        ),

        ly_cte AS materialized(
            SELECT
                SUM(a.revenue) AS ly_revenue,
                SUM(a.margin) AS ly_margin,
                SUM(a.sales_units) AS ly_units,
                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS ly_gm_percent
            FROM price_promo_opt.tb_budget_master_ly_agg a
            INNER JOIN products_cte b ON a.product_id = b.product_id
--            INNER JOIN stores_cte c ON a.s0_id = c.s0_id and a.s3_id = c.s3_id 
			inner join customers_cte cust on a.c0_id = cust.c0_id 
            WHERE a.dates BETWEEN '%s' AND '%s'
			HAVING SUM(a.revenue) IS NOT NULL
        ),

        ty_cte AS materialized(
            SELECT
                SUM(a.revenue) AS ty_revenue,
                SUM(a.margin) AS ty_margin,
                SUM(a.sales_units) AS ty_units,
                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS ty_gm_percent
            FROM price_promo_opt.tb_budget_master_ty_agg a
            INNER JOIN products_cte b ON a.product_id = b.product_id
--            INNER JOIN stores_cte c ON a.s0_id = c.s0_id and a.s3_id = c.s3_id 
			inner join customers_cte cust on a.c0_id = cust.c0_id 
            WHERE a.dates BETWEEN '%s' AND '%s'
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
            COALESCE(ROUND(ly_cte.ly_gm_percent::numeric, 2), 0) ly_gm_percent, 

			COALESCE(ROUND(ty_cte.ty_revenue::numeric, 2), 0) ty_revenue,
            COALESCE(ROUND(ty_cte.ty_margin::numeric, 2), 0) ty_margin,
            COALESCE(ROUND(ty_cte.ty_units::numeric, 2), 0) ty_units,
            COALESCE(ROUND(ty_cte.ty_gm_percent::numeric, 2), 0) ty_gm_percent
        FROM
			baseline_cte
			FULL outer join ly_cte ON TRUE = TRUE
			FULL outer join ty_cte ON TRUE = TRUE
			$q$,
         _promo_id,_promo_id, 
		_start_date, _end_date, 
		ly_start_date, ly_end_date, 
		_start_date, _end_date);

    RAISE NOTICE 'Executing query: %', query;
--    EXECUTE query;
	Return query execute query; 

else
        query := format( $q$
        WITH products_cte AS materialized (
            SELECT * FROM price_promo.fn_fetch_products_for_promo(%s)
        ),

        stores_cte AS materialized (
            SELECT distinct tsm.s0_id, tsm.s3_id 
            FROM price_promo.fn_fetch_stores_for_promo(%s) ffs 
            inner join global.tb_store_master tsm on ffs.store_id = tsm.store_id
        ),

        customers_cte as materialized(
        	select distinct cm.c0_id from price_promo.tb_promo_customers tpc  
        	inner join global.customer_master cm on tpc.customer_id = cm.c2_id
        	where tpc.promo_id = %s
        ), 

        baseline_cte AS materialized(  
            SELECT
                SUM(a.revenue) AS baseline_revenue,
                SUM(a.margin) AS baseline_margin,
                SUM(a.sales_units) AS baseline_units,
                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS baseline_gm_percent
            FROM price_promo_opt.tb_budget_master_baseline a
            INNER JOIN products_cte b ON a.product_id = b.product_id
            INNER JOIN stores_cte c ON a.s0_id = c.s0_id and a.s3_id = c.s3_id 
			inner join customers_cte cust on a.c0_id = cust.c0_id 
            WHERE a.dates BETWEEN '%s' AND '%s'
        ),

        ly_cte AS materialized(
            SELECT
                SUM(a.revenue) AS ly_revenue,
                SUM(a.margin) AS ly_margin,
                SUM(a.sales_units) AS ly_units,
                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS ly_gm_percent
            FROM price_promo_opt.tb_budget_master_ly a
            INNER JOIN products_cte b ON a.product_id = b.product_id
            INNER JOIN stores_cte c ON a.s0_id = c.s0_id and a.s3_id = c.s3_id 
			inner join customers_cte cust on a.c0_id = cust.c0_id 
            WHERE a.dates BETWEEN '%s' AND '%s'
			HAVING SUM(a.revenue) IS NOT NULL
        ),

        ty_cte AS materialized(
            SELECT
                SUM(a.revenue) AS ty_revenue,
                SUM(a.margin) AS ty_margin,
                SUM(a.sales_units) AS ty_units,
                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS ty_gm_percent
            FROM price_promo_opt.tb_budget_master_ty a
            INNER JOIN products_cte b ON a.product_id = b.product_id
            INNER JOIN stores_cte c ON a.s0_id = c.s0_id and a.s3_id = c.s3_id 
			inner join customers_cte cust on a.c0_id = cust.c0_id 
            WHERE a.dates BETWEEN '%s' AND '%s'
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
            COALESCE(ROUND(ly_cte.ly_gm_percent::numeric, 2), 0) ly_gm_percent, 

			COALESCE(ROUND(ty_cte.ty_revenue::numeric, 2), 0) ty_revenue,
            COALESCE(ROUND(ty_cte.ty_margin::numeric, 2), 0) ty_margin,
            COALESCE(ROUND(ty_cte.ty_units::numeric, 2), 0) ty_units,
            COALESCE(ROUND(ty_cte.ty_gm_percent::numeric, 2), 0) ty_gm_percent
        FROM
			baseline_cte
			FULL outer join ly_cte ON TRUE = TRUE
			FULL outer join ty_cte ON TRUE = TRUE
			$q$,
         _promo_id,_promo_id, _promo_id, 
		_start_date, _end_date, 
		ly_start_date, ly_end_date, 
		_start_date, _end_date);

    RAISE NOTICE 'Executing query: %', query;
--    EXECUTE query;
	Return query execute query; 

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
       		0::numeric AS ly_gm_percent,
       		0::numeric AS ty_revenue,
       		0::numeric AS ty_margin,
       		0::numeric AS ty_units,
       		0::numeric AS ty_gm_percent;
    END IF;
END;
$function$
;
