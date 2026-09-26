--liquibase formatted sql
--changeset liquibase:fn_get_week_start_dates runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_get_week_start_dates

DROP FUNCTION IF EXISTS price_markdown_opt.fn_get_week_start_dates(int4);

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_get_week_start_dates(_strategy_id integer)
 RETURNS TABLE(start_date date, end_date date)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT min(f.weeks_start_date) as start_date,  max(weeks_start_date)+9 as end_date
    FROM pricesmart.tb_fiscal_date_mapping f
    INNER JOIN price_markdown.tb_strategy_master tsm ON f.date BETWEEN tsm.start_date AND tsm.end_date
    AND f.date > date(timezone('EST', now())) - 9
    WHERE tsm.strategy_id = _strategy_id;
END;
$function$
;
