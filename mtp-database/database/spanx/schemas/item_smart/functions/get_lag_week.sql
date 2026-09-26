--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:get_lag_week runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:get_lag_week
--comment: get_lag_week
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.get_lag_week(int4, date);

CREATE OR REPLACE FUNCTION item_smart.get_lag_week(week_no integer, calendar_date date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    lead_week INT4;
    dynamic_query TEXT;
BEGIN
    -- Construct the dynamic query using FORMAT to inject parameters
    dynamic_query := FORMAT(
        'select lead_week
from 
(select fiscal_year_week , lag(fiscal_year_week, %s ) over (order by fiscal_year_week asc) as lead_week
from 
(select fiscal_year_week
from global.fiscal_date_mapping
group by 1) a) b
join 
(select fiscal_year_week from global.fiscal_date_mapping
where calendar_date = %L group by 1) inp
using(fiscal_year_week)',
        week_no, calendar_date
    );
    
    -- Print the dynamic query for debugging purposes
    RAISE NOTICE 'Executing query: %', dynamic_query;
    
    -- Execute the dynamic query
    EXECUTE dynamic_query INTO lead_week;
    
    -- Return the calculated lead_week value
    RETURN lead_week;
END;
$function$
;