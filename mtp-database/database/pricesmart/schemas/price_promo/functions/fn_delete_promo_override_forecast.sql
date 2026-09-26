--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_delete_promo_override_forecast runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_delete_promo_override_forecast

DROP FUNCTION if exists price_promo.fn_delete_promo_override_forecast;
CREATE OR REPLACE FUNCTION price_promo.fn_delete_promo_override_forecast(
    p_promo_id int,
    p_scenario_id int default null
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
    _query text;
    _scenario_condition text = '';
BEGIN

    if p_scenario_id is not null then
        _scenario_condition = format(' and scenario_id = %1$s ',p_scenario_id);
    end if;

    _query = format('
        insert into price_promo.tb_promo_override_forecast_history
        select 
            *
        from price_promo.tb_promo_override_forecast
        where promo_id = %1$s %2$s;

        -- delete from current table
        delete from price_promo.tb_promo_override_forecast
        where promo_id = %1$s %2$s;

    ',
    p_promo_id,
    _scenario_condition
    );

	execute _query;

END;
$function$
;
