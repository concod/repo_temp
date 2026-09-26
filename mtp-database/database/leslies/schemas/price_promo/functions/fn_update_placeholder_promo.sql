--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_update_placeholder_promo runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_update_placeholder_promo

DROP FUNCTION if exists price_promo.fn_update_placeholder_promo;
CREATE OR REPLACE FUNCTION price_promo.fn_update_placeholder_promo(p_promo_id integer, p_promo_name character varying, p_start_date date, p_end_date date, p_metrics jsonb, p_user_id integer, p_event_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE

begin

    update price_promo.promo_master
    set 
        name = p_promo_name,
        start_date = p_start_date,
        end_date = p_end_date,
		event_id = p_event_id,
        status = -1,
        last_approved_scenario_id = null,
        recommendation_type_id = null,
        updated_by = p_user_id
    where promo_id = p_promo_id;

    perform price_promo.fn_insert_metrics_for_placeholder_promo(
        p_promo_id,
        p_start_date,
        p_end_date,
        p_metrics
    );


    return p_promo_id;

end;
$function$
;
