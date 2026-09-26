--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_refresh_promos_scenario_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_refresh_promos_scenario_data

DROP FUNCTION IF EXISTS price_promo.fn_refresh_promos_scenario_data;
CREATE OR REPLACE FUNCTION price_promo.fn_refresh_promos_scenario_data(p_promo_ids int[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	_promo_id int;
BEGIN

    for _promo_id in select unnest(p_promo_ids) loop
        perform price_promo.fn_refresh_promo_scenario_data(_promo_id);
    end loop;

END;
$function$
;
