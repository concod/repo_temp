--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_workbench_get_baseline_ly_ty_metrics runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_workbench_get_baseline_ly_ty_metrics

DROP FUNCTION if exists price_promo_opt.fn_workbench_get_baseline_ly_ty_metrics;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_workbench_get_baseline_ly_ty_metrics(_promo_id integer)
 RETURNS TABLE(baseline_revenue numeric, baseline_margin numeric, baseline_units numeric, baseline_gm_percent numeric, ly_revenue numeric, ly_margin numeric, ly_units numeric, ly_gm_percent numeric, ty_revenue numeric, ty_margin numeric, ty_units numeric, ty_aur numeric, ty_aum numeric, ty_gm_percent numeric, baseline_promo_spend numeric, ly_promo_spend numeric, ty_promo_spend numeric)
 LANGUAGE plpgsql
AS $function$
-- Purpose – Retrieves baseline, last year (LY), and this year (TY) metrics for a given promotion, including revenue, margin, units, and gross margin percentage.
-- 
-- Example – SELECT * FROM price_promo_opt.fn_workbench_get_baseline_ly_ty_metrics(123);
-- 
-- Other Functions Used:
-- * fn_get_promo_details - Retrieves promotion details including start date, end date, and store selection type
-- * fn_fetch_products_for_promo - Gets the list of products associated with the promotion
-- * fn_fetch_stores_for_promo - Gets the list of stores associated with the promotion (for store_selection_config > 3)
-- 
-- Tables Used:
-- * price_promo_opt.tb_budget_master_baseline - Baseline metrics for all store selection types
-- * price_promo_opt.tb_budget_master_ly - Last year metrics for all store selection types
-- * price_promo_opt.tb_budget_master_ty - This year metrics for all store selection types
-- 
-- Returns – A table with 12 columns containing baseline, LY, and TY metrics (revenue, margin, units, and GM%) for the specified promotion
DECLARE
    where_condition TEXT := '';
    _start_date DATE;
    _end_date DATE;
    _store_selection_config INTEGER;
    _specific_store_id INTEGER;
    _store_upload_id INTEGER;
    _ly_start_date DATE;
    _ly_end_date DATE;
    _sql_query TEXT; -- Variable to hold the dynamic query
BEGIN
    RAISE NOTICE 'Starting fn_workbench_get_baseline_ly_ty_metrics for promo_id: %', _promo_id;
    
    -- Fetch start and end dates from get_promo_details function
    SELECT start_date, end_date, store_selection_type
    INTO _start_date, _end_date, _store_selection_config
    FROM price_promo_opt.fn_get_promo_details(_promo_id);
    
    RAISE NOTICE 'Promo %: Start Date=%, End Date=%, Store Selection Config=%', 
        _promo_id, _start_date, _end_date, _store_selection_config;

    -- Fetch last year start date from pricesmart.tb_fiscal_date_mapping
    SELECT ly_date
    INTO _ly_start_date
    FROM pricesmart.tb_fiscal_date_mapping
    WHERE date_id = _start_date;

    -- Fetch last year end date from pricesmart.tb_fiscal_date_mapping
    SELECT ly_date
    INTO _ly_end_date
    FROM pricesmart.tb_fiscal_date_mapping
    WHERE date_id = _end_date;

    -- If all stores are selected
    IF _store_selection_config = 1 THEN
        _sql_query := '
            WITH 
            products_cte AS (
            SELECT DISTINCT $1 as promo_id, unnest(price_promo.fn_get_promo_final_products($1, 1)) AS product_id
            UNION
            SELECT DISTINCT $1 as promo_id, unnest(price_promo.fn_get_promo_final_products($1, 0)) AS product_id
        ),
        baseline_cte AS (
            SELECT
                SUM(a.revenue) AS baseline_revenue,
                SUM(a.margin) AS baseline_margin,
                SUM(a.units) AS baseline_units,
                SUM(a.promo_spend) AS baseline_promo_spend,

                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS baseline_gm_percent
            FROM price_promo_opt.tb_budget_master_baseline_agg a 
            
            INNER JOIN products_cte b ON 
            a.product_id = b.product_id 
        
            WHERE a.dates BETWEEN $2 AND $3
        ),
        ly_cte AS (
            SELECT
                SUM(a.revenue) AS ly_revenue,
                SUM(a.margin) AS ly_margin,
                SUM(a.quantity) AS ly_units,
                SUM(a.promo_spend) AS ly_promo_spend,

                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS ly_gm_percent
            FROM price_promo_opt.promo_txn_agg a

            INNER JOIN products_cte b ON 
            a.product_id = b.product_id

            WHERE a.date_id BETWEEN COALESCE($4, $2 - INTERVAL ''1 year'') AND COALESCE($5, $3 - INTERVAL ''1 year'')

            HAVING SUM(a.revenue) IS NOT NULL 
        ),
        ty_cte AS (
            SELECT
                SUM(a.revenue) AS ty_revenue,
                SUM(a.margin) AS ty_margin,
                SUM(a.units) AS ty_units,
                SUM(a.promo_spend) AS ty_promo_spend,
                CASE WHEN SUM(a.units) = 0 THEN 0 ELSE (SUM(a.revenue) / SUM(a.units)) END AS ty_aur,
                CASE WHEN SUM(a.units) = 0 THEN 0 ELSE (SUM(a.margin) / SUM(a.units)) END AS ty_aum,

                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS ty_gm_percent
            FROM price_promo_opt.tb_budget_master_ty_agg a
            
            INNER JOIN products_cte b ON 
            a.product_id = b.product_id
            
            WHERE a.dates BETWEEN $2 AND $3
            HAVING SUM(a.revenue) IS NOT NULL
        )
        SELECT
            COALESCE(ROUND(baseline_cte.baseline_revenue::numeric), 0)   baseline_revenue,
            COALESCE(ROUND(baseline_cte.baseline_margin::numeric), 0) baseline_margin,
            COALESCE(ROUND(baseline_cte.baseline_units::numeric), 0) baseline_units,
            COALESCE(ROUND(baseline_cte.baseline_gm_percent::numeric), 0) baseline_gm_percent,
            COALESCE(ROUND(ly_cte.ly_revenue::numeric), 0) ly_revenue,
            COALESCE(ROUND(ly_cte.ly_margin::numeric), 0) ly_margin,
            COALESCE(ROUND(ly_cte.ly_units::numeric), 0) ly_units,
            COALESCE(ROUND(ly_cte.ly_gm_percent::numeric), 0) ly_gm_percent,
            COALESCE(ROUND(ty_cte.ty_revenue::numeric), 0) ty_revenue,
            COALESCE(ROUND(ty_cte.ty_margin::numeric), 0) ty_margin,
            COALESCE(ROUND(ty_cte.ty_units::numeric), 0) ty_units,
            COALESCE(ROUND(ty_cte.ty_aur::numeric, 2), 0) ty_aur,
            COALESCE(ROUND(ty_cte.ty_aum::numeric, 2), 0) ty_aum,

            COALESCE(ROUND(ty_cte.ty_gm_percent::numeric), 0) ty_gm_percent,

            COALESCE(ROUND(baseline_cte.baseline_promo_spend::numeric), 0) baseline_promo_spend,
            COALESCE(ROUND(ly_cte.ly_promo_spend::numeric), 0) ly_promo_spend,
            COALESCE(ROUND(ty_cte.ty_promo_spend::numeric), 0) ty_promo_spend
        FROM
            baseline_cte
            FULL outer join ly_cte ON TRUE = TRUE
            FULL outer join ty_cte ON TRUE = TRUE
        ';

        RAISE NOTICE 'Executing Query for Config 1: %', _sql_query;
        RETURN QUERY EXECUTE _sql_query USING _promo_id, _start_date, _end_date, _ly_start_date, _ly_end_date;
    END IF;
    
-- If whole category stores are selected
    IF _store_selection_config = 2 THEN
        _sql_query := '
        WITH 
        products_cte AS (
            SELECT DISTINCT $1 as promo_id, unnest(price_promo.fn_get_promo_final_products($1, 1)) AS product_id
            UNION
            SELECT DISTINCT $1 as promo_id, unnest(price_promo.fn_get_promo_final_products($1, 0)) AS product_id
        ),

        whole_cat_stores as (
            SELECT distinct a.store_reco_level
            FROM pricesmart.tb_store_master a 
            
            inner join price_promo.promo_store b 
            on a.store_id = b.store_id
            
            inner join products_cte c 
            on b.promo_id = c.promo_id
        ),

        baseline_cte AS (
            SELECT
                SUM(a.revenue) AS baseline_revenue,
                SUM(a.margin) AS baseline_margin,
                SUM(a.units) AS baseline_units,
                SUM(a.promo_spend) AS baseline_promo_spend,

                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS baseline_gm_percent
            FROM price_promo_opt.tb_budget_master_baseline_agg a 
            
            INNER JOIN products_cte b ON 
            a.product_id = b.product_id
        
            inner join whole_cat_stores c on 
            a.store_reco_level = c.store_reco_level

            WHERE a.dates BETWEEN $2 AND $3
        ),

        ly_cte AS (
            SELECT
                SUM(a.revenue) AS ly_revenue,
                SUM(a.margin) AS ly_margin,
                SUM(a.quantity) AS ly_units,
                SUM(a.promo_spend) AS ly_promo_spend,

                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS ly_gm_percent
            FROM price_promo_opt.promo_txn_agg a

            INNER JOIN products_cte b ON 
            a.product_id = b.product_id

            inner join whole_cat_stores c on 
            a.store_reco_level = c.store_reco_level

            WHERE a.date_id BETWEEN COALESCE($4, $2 - INTERVAL ''1 year'') AND COALESCE($5, $3 - INTERVAL ''1 year'')

            HAVING SUM(a.revenue) IS NOT NULL 
        ),

        ty_cte AS (
            SELECT
                SUM(a.revenue) AS ty_revenue,
                SUM(a.margin) AS ty_margin,
                SUM(a.units) AS ty_units,
                SUM(a.promo_spend) AS ty_promo_spend,
                CASE WHEN SUM(a.units) = 0 THEN 0 ELSE (SUM(a.revenue) / SUM(a.units)) END AS ty_aur,
                CASE WHEN SUM(a.units) = 0 THEN 0 ELSE (SUM(a.margin) / SUM(a.units)) END AS ty_aum,

                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS ty_gm_percent
            FROM price_promo_opt.tb_budget_master_ty_agg a
            
            INNER JOIN products_cte b ON 
            a.product_id = b.product_id

            inner join whole_cat_stores c on 
            a.store_reco_level = c.store_reco_level
            
            WHERE a.dates BETWEEN $2  AND $3

            HAVING SUM(a.revenue) IS NOT NULL
        )
        SELECT
            COALESCE(ROUND(baseline_cte.baseline_revenue::numeric), 0) baseline_revenue,
            COALESCE(ROUND(baseline_cte.baseline_margin::numeric), 0) baseline_margin,
            COALESCE(ROUND(baseline_cte.baseline_units::numeric), 0) baseline_units,
            COALESCE(ROUND(baseline_cte.baseline_gm_percent::numeric), 0) baseline_gm_percent,
            COALESCE(ROUND(ly_cte.ly_revenue::numeric), 0) ly_revenue,
            COALESCE(ROUND(ly_cte.ly_margin::numeric), 0) ly_margin,
            COALESCE(ROUND(ly_cte.ly_units::numeric), 0) ly_units,
            COALESCE(ROUND(ly_cte.ly_gm_percent::numeric), 0) ly_gm_percent,
            COALESCE(ROUND(ty_cte.ty_revenue::numeric), 0) ty_revenue,
            COALESCE(ROUND(ty_cte.ty_margin::numeric), 0) ty_margin,
            COALESCE(ROUND(ty_cte.ty_units::numeric), 0) ty_units,
            COALESCE(ROUND(ty_cte.ty_aur::numeric, 2), 0) ty_aur,
            COALESCE(ROUND(ty_cte.ty_aum::numeric, 2), 0) ty_aum,

            COALESCE(ROUND(ty_cte.ty_gm_percent::numeric), 0) ty_gm_percent,
            COALESCE(ROUND(baseline_cte.baseline_promo_spend::numeric), 0) baseline_promo_spend,
            COALESCE(ROUND(ly_cte.ly_promo_spend::numeric), 0) ly_promo_spend,
            COALESCE(ROUND(ty_cte.ty_promo_spend::numeric), 0) ty_promo_spend
        FROM
            baseline_cte
            FULL outer join ly_cte ON TRUE = TRUE
            FULL outer join ty_cte ON TRUE = TRUE
        ';
        
        RAISE NOTICE 'Executing Query for Config 2: %', _sql_query;
        RETURN QUERY EXECUTE _sql_query USING _promo_id, _start_date, _end_date, _ly_start_date, _ly_end_date;
    END IF;
    
    
    -- If specific stores are selected
    IF _store_selection_config > 2 THEN
        _sql_query := '
            WITH 
            products_cte AS (
            SELECT * FROM
            price_promo.fn_fetch_products_for_promo($1)
        ),

        specific_cat_stores as (
            SELECT a.promo_id, store_id
            FROM price_promo.promo_store a 
            where promo_id = $1
        ),

        baseline_cte AS (
            SELECT
                SUM(a.revenue) AS baseline_revenue,
                SUM(a.margin) AS baseline_margin,
                SUM(a.units) AS baseline_units,
                SUM(a.promo_spend) AS baseline_promo_spend,

                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS baseline_gm_percent
            FROM price_promo_opt.tb_budget_master_baseline a 
            
            INNER JOIN products_cte b ON 
            a.product_id = b.product_id

            Inner join specific_cat_stores c on 
            a.store_id = c.store_id
        
            WHERE a.dates BETWEEN $2 AND $3 
        ),

        ly_cte AS (
            SELECT
                SUM(a.revenue) AS ly_revenue,
                SUM(a.margin) AS ly_margin,
                SUM(a.quantity) AS ly_units,
                SUM(a.promo_spend) AS ly_promo_spend,

                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS ly_gm_percent
            FROM price_promo_opt.promo_txn a

            INNER JOIN products_cte b ON 
            a.product_id = b.product_id

            Inner join specific_cat_stores c on 
            a.store_id = c.store_id

            WHERE a.date_id BETWEEN COALESCE($4, $2 - INTERVAL ''1 year'') AND COALESCE($5, $3 - INTERVAL ''1 year'')

            HAVING SUM(a.revenue) IS NOT NULL 
        ),

        ty_cte AS (
            SELECT
                SUM(a.revenue) AS ty_revenue,
                SUM(a.margin) AS ty_margin,
                SUM(a.units) AS ty_units,
                SUM(a.promo_spend) AS ty_promo_spend,
                CASE WHEN SUM(a.units) = 0 THEN 0 ELSE (SUM(a.revenue) / SUM(a.units)) END AS ty_aur,
                CASE WHEN SUM(a.units) = 0 THEN 0 ELSE (SUM(a.margin) / SUM(a.units)) END AS ty_aum,

                CASE WHEN SUM(a.revenue) = 0 THEN 0 ELSE (SUM(a.margin) * 100 / SUM(a.revenue)) END AS ty_gm_percent
            FROM price_promo_opt.tb_budget_master_ty a
            
            INNER JOIN products_cte b ON 
            a.product_id = b.product_id

            Inner join specific_cat_stores c on 
            a.store_id = c.store_id
            
            WHERE a.dates BETWEEN $2  AND $3

            HAVING SUM(a.revenue) IS NOT NULL
        )
        SELECT
            COALESCE(ROUND(baseline_cte.baseline_revenue::numeric), 0) baseline_revenue,
            COALESCE(ROUND(baseline_cte.baseline_margin::numeric), 0) baseline_margin,
            COALESCE(ROUND(baseline_cte.baseline_units::numeric), 0) baseline_units,
            COALESCE(ROUND(baseline_cte.baseline_gm_percent::numeric), 0) baseline_gm_percent,
            COALESCE(ROUND(ly_cte.ly_revenue::numeric), 0) ly_revenue,
            COALESCE(ROUND(ly_cte.ly_margin::numeric), 0) ly_margin,
            COALESCE(ROUND(ly_cte.ly_units::numeric), 0) ly_units,
            COALESCE(ROUND(ly_cte.ly_gm_percent::numeric), 0) ly_gm_percent,
            COALESCE(ROUND(ty_cte.ty_revenue::numeric), 0) ty_revenue,
            COALESCE(ROUND(ty_cte.ty_margin::numeric), 0) ty_margin,
            COALESCE(ROUND(ty_cte.ty_units::numeric), 0) ty_units,
            COALESCE(ROUND(ty_cte.ty_aur::numeric, 2), 0) ty_aur,
            COALESCE(ROUND(ty_cte.ty_aum::numeric, 2), 0) ty_aum,
            COALESCE(ROUND(ty_cte.ty_gm_percent::numeric), 0) ty_gm_percent,
            
            COALESCE(ROUND(baseline_cte.baseline_promo_spend::numeric), 0) baseline_promo_spend,
            COALESCE(ROUND(ly_cte.ly_promo_spend::numeric), 0) ly_promo_spend,
            COALESCE(ROUND(ty_cte.ty_promo_spend::numeric), 0) ty_promo_spend
        FROM
            baseline_cte
            FULL outer join ly_cte ON TRUE = TRUE
            FULL outer join ty_cte ON TRUE = TRUE
        ';
        
        RAISE NOTICE 'Executing Query for Config >2: %', _sql_query;
        RETURN QUERY EXECUTE _sql_query USING _promo_id, _start_date, _end_date, _ly_start_date, _ly_end_date;
    END IF;
   

    IF NOT FOUND THEN
        RAISE WARNING 'No data found for promo_id: %', _promo_id;
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
            0::numeric AS ty_aur,
            0::numeric AS ty_aum,
            0::numeric AS ty_gm_percent,
            0::numeric AS baseline_promo_spend,
            0::numeric AS ly_promo_spend,
            0::numeric AS ty_promo_spend;
    END IF;
    
    RAISE NOTICE 'Completed processing for promo_id: %', _promo_id;
END;
$function$
;