--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_refresh_promos_scenario_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_refresh_promos_scenario_data

DROP FUNCTION IF EXISTS price_promo.fn_refresh_promos_scenario_data;
CREATE OR REPLACE FUNCTION price_promo.fn_refresh_promos_scenario_data(p_promo_ids int[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_promo_id int;
	_eligible_promo_ids int[];
    _date_buffer_x int := price_promo.fn_get_configuration_value('promo','scenario_data_refresh_date_buffer_x')::bool;
    _date_buffer_y int := price_promo.fn_get_configuration_value('promo','scenario_data_refresh_date_buffer_y')::bool;
    _eligible_promo_status_for_promo_refresh jsonb := price_promo.fn_get_configuration_value('promo','eligible_promo_status_for_promo_refresh')::jsonb;
BEGIN

    _eligible_promo_ids = (
        select array_agg(promo_id) 
        from price_promo.promo_master pm
        inner join (select distinct promo_id from price_promo.scenario_master where promo_id = any(p_promo_ids)) sm 
        on sm.promo_id = pm.promo_id
        where promo_id = any(p_promo_ids)
        and status in (
            select jsonb_array_elements_text(_eligible_promo_status_for_promo_refresh)::int
        )
        and start_date > (date(timezone((select remarks from metaschema.tb_app_sub_master where name = 'client_timezone'), now())) + _date_buffer_x)
        and start_date < (date(timezone((select remarks from metaschema.tb_app_sub_master where name = 'client_timezone'), now())) + _date_buffer_y)
    );

    for _promo_id in select unnest(_eligible_promo_ids) loop
        perform price_promo.fn_refresh_promo_scenario_data(_promo_id);
    end loop;

    

END;
$procedure$
;
