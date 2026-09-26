--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_get_days_used_in_year runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_get_days_used_in_year

drop function if exists price_promo.fn_get_days_used_in_year;
CREATE OR REPLACE FUNCTION price_promo.fn_get_days_used_in_year(input_date date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN input_date - DATE_TRUNC('year', input_date)::date + 1;
END;
$function$
;