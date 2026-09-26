--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_create_placeholder_promo runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_create_placeholder_promo

DROP FUNCTION if exists price_promo.fn_create_placeholder_promo;
-- DROP FUNCTION price_promo.fn_create_placeholder_promo(varchar, date, date, jsonb, int4, int4);

CREATE OR REPLACE FUNCTION price_promo.fn_create_placeholder_promo(p_promo_name character varying, p_start_date date, p_end_date date, p_metrics jsonb, p_user_id integer, p_event_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE

    _promo_id int;

begin

    _promo_id = price_promo.fn_create_promotion(
        p_promo_name,
        p_start_date,
        p_end_date,
        -1,
        0,
        p_user_id,
		p_event_id
    );

    perform price_promo.fn_insert_metrics_for_placeholder_promo(
        _promo_id,
        p_start_date,
        p_end_date,
        p_metrics
    );


    return _promo_id;

end;
$function$
;
