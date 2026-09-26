--liquibase formatted sql
--changeset saran.srirama@impactanalytics.co:get_max_fiscal_year_week runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-39192
--comment: Fetches the max week in fiscal week mapping which is less than the week provided
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_max_fiscal_year_week(p_refcursor refcursor, min_week integer);
CREATE OR REPLACE FUNCTION plan_smart.get_max_fiscal_year_week(p_refcursor refcursor, min_week integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
BEGIN
    OPEN p_refcursor FOR SELECT max(fiscal_year_week) FROM global.fiscal_date_mapping WHERE fiscal_year_week < min_week;
    RETURN p_refcursor;
END;
$function$
;

