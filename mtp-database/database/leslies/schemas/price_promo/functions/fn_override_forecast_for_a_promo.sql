--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_override_forecast_for_a_promo-19110604 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_override_forecast_for_a_promo

DROP FUNCTION if exists price_promo.fn_override_forecast_for_a_promo;
CREATE OR REPLACE FUNCTION price_promo.fn_override_forecast_for_a_promo(p_promo_id integer, p_scenario_id integer, p_new_sales_units double precision, p_new_baseline_sales_units double precision, p_old_sales_units double precision, p_old_baseline_sales_units double precision, p_reason integer, p_user_id integer, p_comment text, p_override_method text, p_from_stacking_view boolean DEFAULT false)
 RETURNS integer[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
    _affected_stacked_promos int4[];
BEGIN

    p_scenario_id = coalesce(p_scenario_id,0);

    p_new_sales_units = coalesce(p_new_sales_units,p_old_sales_units);
    p_new_baseline_sales_units = coalesce(p_new_baseline_sales_units,p_old_baseline_sales_units);


    perform price_promo.fn_delete_promo_override_forecast(p_promo_id,p_scenario_id);

    insert into price_promo.tb_promo_override_forecast
    (promo_id,scenario_id,reason,overridden_by,"comment",new_sales_units,old_sales_units,new_baseline_sales_units,old_baseline_sales_units,from_stacking_view)
    values
    (p_promo_id,p_scenario_id,p_reason,p_user_id,p_comment,p_new_sales_units,p_old_sales_units,p_new_baseline_sales_units,p_old_baseline_sales_units,p_from_stacking_view);


    _affected_stacked_promos =  price_promo_opt.fn_scenario_override_stack_1(
        p_promo_id,
        p_scenario_id,
        (p_new_sales_units/p_old_sales_units)::numeric,
        (p_new_baseline_sales_units/p_old_baseline_sales_units)::numeric,
        p_user_id
    );

    return _affected_stacked_promos;

END;
$function$
;
