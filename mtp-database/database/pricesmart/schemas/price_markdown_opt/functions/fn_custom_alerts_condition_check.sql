--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_custom_alerts_condition_check_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_custom_alerts_condition_check_2

drop function if exists price_markdown_opt.fn_custom_alerts_condition_check;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_custom_alerts_condition_check(_logical_chk text, _value double precision DEFAULT NULL::double precision, _operator text DEFAULT NULL::text, _threshold double precision DEFAULT NULL::double precision)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
	_result boolean;
begin
if _logical_chk is not null
then execute format('select %s;',_logical_chk) into _result;
	return _result;
else
  RETURN CASE
    WHEN _operator = '<' THEN _value < _threshold
    WHEN _operator = '>' THEN _value > _threshold
    WHEN _operator = '<=' THEN _value <= _threshold
    WHEN _operator = '>=' THEN _value >= _threshold
    when _operator = '=' THEN _value = _threshold
    ELSE FALSE  -- Handle unrecognized operators
  END;
 end if;
END;
$function$
;