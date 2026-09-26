--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_set_default_for_a_scenario-19111034 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_set_default_for_a_scenario

DROP FUNCTION if exists price_promo.fn_set_default_for_a_scenario;
CREATE OR REPLACE FUNCTION price_promo.fn_set_default_for_a_scenario(
    p_promo_id int,
    p_scenario_id int,
    p_default text,
    p_user_id int,
    p_from_stacking_view boolean DEFAULT false
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _promo_object price_promo.promo_master%ROWTYPE;
BEGIN

    p_scenario_id = coalesce(p_scenario_id,0);

    select * into _promo_object from price_promo.promo_master
    where promo_id = p_promo_id;

    insert into price_promo.tb_promo_override_forecast_history
    select
        *
    from 
        price_promo.tb_promo_override_forecast
    where promo_id = p_promo_id and scenario_id = p_scenario_id;
    
    update price_promo.tb_promo_override_forecast
    set is_default = case 
                    when p_default = 'overridden' then true
                    else false
                    end,
        from_stacking_view = p_from_stacking_view 
    where promo_id = p_promo_id and scenario_id = p_scenario_id;

END;
$function$
;
