--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_wrapped_get_baseline_ly_metrics runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_wrapped_get_baseline_ly_metrics

DROP FUNCTION if exists price_promo_opt.fn_wrapped_get_baseline_ly_metrics;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_wrapped_get_baseline_ly_metrics(_promo_id integer, refresh_data boolean DEFAULT true)
 RETURNS TABLE(baseline_revenue numeric, baseline_margin numeric, baseline_units numeric, baseline_gm_percent numeric, ly_revenue numeric, ly_margin numeric, ly_units numeric, ly_gm_percent numeric)
 LANGUAGE plpgsql
AS $function$
DECLARE
    is_revenue_target_null BOOLEAN;
BEGIN
    -- Check if the column value is NULL in ps._rules table for the promo_id
    SELECT ps.revenue_target IS NULL
    INTO is_revenue_target_null
    FROM price_promo.ps_rules ps
    WHERE ps.promo_id = _promo_id;

    -- If the column is NULL, call the original function
    IF is_revenue_target_null AND refresh_data THEN
        RETURN QUERY 
        SELECT * FROM price_promo_opt.fn_workbench_get_baseline_ly_metrics(_promo_id);
    ELSE
        -- Return default zero values if column is not NULL
        RETURN QUERY
        SELECT
            0::numeric, 0::numeric, 0::numeric, 0::numeric,
            0::numeric, 0::numeric, 0::numeric, 0::numeric;
    END IF;
END;
$function$
;

