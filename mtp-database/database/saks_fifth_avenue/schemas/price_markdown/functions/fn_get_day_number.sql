--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_day_number runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_get_day_number
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_get_day_number;
CREATE OR REPLACE FUNCTION price_markdown.fn_get_day_number(day_name text)
 RETURNS integer
	LANGUAGE plpgsql
AS $function$
DECLARE
    day_number int;
BEGIN
	day_number = case
					when day_name = 'Sunday' then 0
					when day_name = 'Monday' then 1
					when day_name = 'Tuesday' then 2
					when day_name = 'Wednesday' then 3
					when day_name = 'Thursday' then 4
					when day_name = 'Friday' then 5
					when day_name = 'Saturday' then 6
				end;
	return day_number;
END;
$function$
;