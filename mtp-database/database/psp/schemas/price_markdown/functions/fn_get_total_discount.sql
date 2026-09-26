--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_total_discount runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_get_total_discount
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_get_total_discount;
CREATE OR REPLACE FUNCTION price_markdown.fn_get_total_discount(incremental_discount double precision, previous_discount double precision)
 RETURNS double precision
	LANGUAGE plpgsql
AS $function$
BEGIN
	return round(
		((
			(incremental_discount * (100 - previous_discount)) 
			/ 100
		) + previous_discount)::numeric, 2
	);
END;
$function$
;