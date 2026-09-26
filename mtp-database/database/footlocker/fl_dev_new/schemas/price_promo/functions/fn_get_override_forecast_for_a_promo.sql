--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_get_override_forecast_for_a_promo-19110605 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_get_override_forecast_for_a_promo

DROP FUNCTION if exists price_promo.fn_get_override_forecast_for_a_promo;
CREATE OR REPLACE FUNCTION price_promo.fn_get_override_forecast_for_a_promo(
    p_promo_id int,
    p_scenario_id int,
    p_new_sales_units float8,
    p_new_baseline_sales_units float8,
    p_old_sales_units float8,
    p_old_baseline_sales_units float8,
    p_override_method text,
    p_from_stacking_view boolean DEFAULT false,
    p_target_currency_id int DEFAULT null
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
BEGIN

    p_scenario_id = coalesce(p_scenario_id,0);

    if p_override_method = 'multiplier' then
        return price_promo.fn_get_promo_forecast_using_multiplier_method(
            p_promo_id,
            p_scenario_id,
            p_new_sales_units,
            p_new_baseline_sales_units,
            p_old_sales_units, 
            p_old_baseline_sales_units,
            p_from_stacking_view,
            p_target_currency_id
        ); 
    end if;

END;
$function$
;
