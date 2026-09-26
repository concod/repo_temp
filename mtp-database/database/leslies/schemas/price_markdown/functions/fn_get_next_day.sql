--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_next_day_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_get_next_day_2
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_get_next_day;
CREATE OR REPLACE FUNCTION price_markdown.fn_get_next_day(week_day_number integer, from_date date DEFAULT date(timezone('US/Eastern'::text, now())))
 RETURNS date
	LANGUAGE plpgsql
AS $function$
DECLARE
   	day_of_from_date int;
   	day_of_next_date int;
begin
    -- Calculate the date of the next occurrence of the specified day
	day_of_from_date = extract('dow' from from_date);
	day_of_next_date = week_day_number;

	if day_of_next_date > day_of_from_date then
		return from_date + (day_of_next_date - day_of_from_date);
	end if;

	return from_date + (7 - (day_of_from_date - day_of_next_date));

END;
$function$
;