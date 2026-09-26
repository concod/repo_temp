--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:fn_get_target_currency_id runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Added the multiple currency support
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_get_target_currency_id;

CREATE OR REPLACE FUNCTION price_markdown.fn_get_target_currency_id(p_source_currency_ids integer[], p_target_currency_id integer DEFAULT NULL::integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
	_target_currency_id integer;
BEGIN

    IF p_target_currency_id IS NOT NULL THEN
        RETURN  p_target_currency_id;
    END IF;

    SELECT target_currency_id into _target_currency_id FROM price_promo.fn_get_target_currency_ids(p_source_currency_ids) limit 1;
	return _target_currency_id;
END;
$function$
;
