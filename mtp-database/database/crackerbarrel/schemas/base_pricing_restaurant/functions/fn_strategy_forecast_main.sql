--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:fn_strategy_forecast_main_new stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_strategy_forecast_main_new

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_strategy_forecast_main;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_strategy_forecast_main(var_strategy_id integer, var_product_hierarchy_string text)
 RETURNS TABLE(opt_level_bins text, predicted numeric, min_cost numeric, price_point numeric, base_percentage numeric, elasticity_bp numeric, promo_source numeric, effective_reference_price numeric, weighted_promo_percent numeric, promo_elasticity numeric, cost numeric, confidence text, cluster text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    sql_query text;
    var_strategy_start_date date;
    var_strategy_end_date date;
    var_non_kvi_count integer;
    var_kvi_count integer;
    kvi_types text[] := ARRAY['false', 'true'];
    counts integer[];
    union_query text := '';
    first_query boolean := true;
    i int;
BEGIN
   RAISE NOTICE 'STARTING Actuals data fetch';
    -- Get strategy start & end date
    SELECT start_date, end_date
    INTO var_strategy_start_date, var_strategy_end_date
    FROM base_pricing_restaurant.bp_strategy_master
    WHERE strategy_id = var_strategy_id;
    -- Count non-KVI and KVI rows for this strategy
    -- NON KVI
    SELECT COUNT(*)
    INTO var_non_kvi_count
    FROM base_pricing_restaurant.bp_unlogged_combinations
    WHERE
        strategy_id = var_strategy_id
        AND is_kvi IS FALSE;
    -- KVI
    SELECT COUNT(*)
    INTO var_kvi_count
    FROM base_pricing_restaurant.bp_unlogged_combinations
    WHERE
        strategy_id = var_strategy_id
        AND is_kvi IS TRUE;
    -- Initialize counts array after getting the actual counts
    counts := ARRAY[var_non_kvi_count, var_kvi_count];
    -- PROCEDURE CALLS
    -- If there are NON-KVI rows, execute all NON-KVI steps
    IF var_non_kvi_count > 0 THEN
        -- Step 1: Extract Product-Channel-Segment data for NON-KVI
        CALL base_pricing_restaurant.sp_strategy_forecast_pcs_filter(var_strategy_id, var_product_hierarchy_string, 'false');
        -- Step 2: Extract OPT_LEVEL_BINS Data for NON-KVI
        CALL base_pricing_restaurant.sp_strategy_forecast_bins_data(var_strategy_id, var_product_hierarchy_string, 'false');
        -- Step 3: Extract Forecast Data for NON-KVI
        CALL base_pricing_restaurant.sp_strategy_forecast_simulation_data(var_strategy_id, var_strategy_start_date, var_strategy_end_date, 'false');
        -- Step 4: Extract Day Split Data for NON-KVI forecast
        CALL base_pricing_restaurant.sp_strategy_forecast_day_split(var_strategy_id, var_product_hierarchy_string, var_strategy_start_date, var_strategy_end_date, 'false');
        -- Step 5: Extract Store Split Data aggregated by OPT_LEVEL_BINS for NON-KVI forecast
        CALL base_pricing_restaurant.sp_strategy_forecast_store_split(var_strategy_id, var_product_hierarchy_string, var_strategy_start_date, var_strategy_end_date, 'false');
    END IF;
    -- If there are KVI rows, execute all KVI steps
    IF var_kvi_count > 0 THEN
        -- Step 1: Extract Product-Channel-Segment data for KVI
        CALL base_pricing_restaurant.sp_strategy_forecast_pcs_filter(var_strategy_id, var_product_hierarchy_string, 'true');
        -- Step 2: Extract OPT_LEVEL_BINS Data for KVI
        CALL base_pricing_restaurant.sp_strategy_forecast_bins_data(var_strategy_id, var_product_hierarchy_string, 'true');
        -- Step 3: Extract Forecast Data for KVI
        CALL base_pricing_restaurant.sp_strategy_forecast_simulation_data(var_strategy_id, var_strategy_start_date, var_strategy_end_date, 'true');
        -- Step 4: Extract Day Split Data for KVI forecast
        CALL base_pricing_restaurant.sp_strategy_forecast_day_split(var_strategy_id, 'product_id', var_strategy_start_date, var_strategy_end_date, 'true');
        -- Step 5: Extract Store Split Data aggregated by OPT_LEVEL_BINS for KVI forecast
        CALL base_pricing_restaurant.sp_strategy_forecast_store_split(var_strategy_id, 'product_id', var_strategy_start_date, var_strategy_end_date, 'true');
    END IF;
    -- Return the final joined result
    FOR i IN 1..2 LOOP
        IF counts[i] > 0 THEN
            IF NOT first_query THEN
                union_query := union_query || ' UNION ALL ';
            END IF;
            union_query := union_query || format(
$query$
SELECT
    opt_level_bins::text AS opt_level_bins,
    ROUND(SUM(COALESCE((sfsd.sales_units * sfds.week_split_ratio * sfss.bin_split_ratio), 0)::numeric), 4) AS predicted,
    AVG(sfsd.min_cost)::numeric AS min_cost,
    AVG(sfsd.price_point)::numeric AS price_point,
    AVG(sfsd.base_percentage)::numeric AS base_percentage,
    AVG(sfsd.elasticity_bp)::numeric AS elasticity_bp,
    MIN(COALESCE(sfsd.promo_source, sfss.promo_source, 0.0)::numeric) AS promo_source,
    AVG(COALESCE(sfsd.effective_reference_price, sfss.effective_reference_price, 0.0)::numeric) AS effective_reference_price,
    AVG(COALESCE(sfsd.weighted_promo_percent, sfss.weighted_promo_percent, 0.0)::numeric) AS weighted_promo_percent,
    AVG(sfsd.promo_elasticity::NUMERIC) AS promo_elasticity,
    0::numeric as cost,
    MAX(sfsd.confidence::text) AS confidence,
    MAX(sfss.cluster::text) AS cluster
FROM
    temp_strategy_forecast_simulation_data_%s_%s sfsd
    INNER JOIN temp_strategy_forecast_day_split_%s_%s sfds
        USING (product_id, channel_id, segment_id, week_start_date)
    INNER JOIN temp_strategy_forecast_store_split_%s_%s sfss
        USING (product_id, channel_id, segment_id, week_start_date)
GROUP BY
    opt_level_bins
$query$,
    var_strategy_id,
    kvi_types[i],
    var_strategy_id,
    kvi_types[i],
    var_strategy_id,
    kvi_types[i]
);
            first_query := false;
        END IF;
    END LOOP;
    IF union_query <> '' THEN
        RAISE NOTICE 'Executing : %', union_query;
        RETURN QUERY EXECUTE union_query;
    END IF; 
END;
$function$
;