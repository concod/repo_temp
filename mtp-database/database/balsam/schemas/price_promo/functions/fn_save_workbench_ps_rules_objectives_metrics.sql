--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co@:fn_save_workbench_ps_rules_objectives_metrics runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_save_workbench_ps_rules_objectives_metrics

DROP FUNCTION IF EXISTS price_promo.fn_save_workbench_ps_rules_objectives_metrics;

CREATE OR REPLACE FUNCTION price_promo.fn_save_workbench_ps_rules_objectives_metrics(_promo_id integer, refresh_data boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    is_target_null BOOLEAN;
    baseline_rec RECORD;
BEGIN
    -- Check if the column value is NULL in ps._rules table for the promo_id
    SELECT 
	(ps.revenue_target IS NULL AND ps.units_target IS NULL 
	AND ps.gross_margin_target IS NULL AND ps.gross_margin_percent_target IS NULL)
    INTO is_target_null
    FROM price_promo.ps_rules ps
    WHERE ps.promo_id = _promo_id;

    -- If the column is NULL, or refresh_data is true, update the metrics
    IF is_target_null OR refresh_data THEN
        SELECT * 
        INTO baseline_rec
        FROM price_promo_opt.fn_workbench_get_baseline_ly_ty_metrics(_promo_id);

        -- Update ps_rules table with the fetched metrics
        UPDATE price_promo.ps_rules
        SET 
            baseline_revenue = baseline_rec.baseline_revenue,
            baseline_margin = baseline_rec.baseline_margin,
            baseline_units = baseline_rec.baseline_units,
            baseline_gm_percent = baseline_rec.baseline_gm_percent,
            ly_revenue = baseline_rec.ly_revenue,
            ly_margin = baseline_rec.ly_margin,
            ly_units = baseline_rec.ly_units,
            ly_gm_percent = baseline_rec.ly_gm_percent,
			revenue_target = baseline_rec.ty_revenue,
			gross_margin_target = baseline_rec.ty_margin,
			units_target = baseline_rec.ty_units,
			gross_margin_percent_target = baseline_rec.ty_gm_percent
        WHERE promo_id = _promo_id;
    END IF;
END;
$function$
;