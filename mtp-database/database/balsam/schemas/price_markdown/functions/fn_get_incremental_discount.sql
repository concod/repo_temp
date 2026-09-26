--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_incremental_discount-3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: using coalesce for previous discount in fn_get_incremental_discount-3
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_get_incremental_discount;


CREATE OR REPLACE FUNCTION price_markdown.fn_get_incremental_discount(current_discount double precision, previous_discount double precision)
 RETURNS double precision
 LANGUAGE plpgsql
AS $function$
begin
	previous_discount = coalesce(previous_discount,0);
	if previous_discount = 100 or current_discount = previous_discount then
		return 0;
	end if;
	return round((((current_discount-previous_discount)/(100-previous_discount))*100)::numeric,2);
END;
$function$
;

