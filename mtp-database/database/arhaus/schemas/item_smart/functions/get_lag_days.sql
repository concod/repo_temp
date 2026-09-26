--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:get_lag_days runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:get_lag_days
--comment: get_lag_days
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.get_lag_days(int4, date);

CREATE OR REPLACE FUNCTION item_smart.get_lag_days(week_no integer, calendar_date date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    lag_week INT4;
    dynamic_query TEXT;
BEGIN
    -- Construct the dynamic query using FORMAT to inject parameters
    dynamic_query := FORMAT(
        'select lag_week
        from (
            select calendar_date,
                   fiscal_year_week,
                   lag(fiscal_year_week, %s) over (order by calendar_date asc) as lag_week
            from global.fiscal_date_mapping
            group by calendar_date, fiscal_year_week
        ) a
        where calendar_date = %L',
        week_no, calendar_date
    );
    
    -- Print the dynamic query for debugging purposes
    RAISE NOTICE 'Executing query: %', dynamic_query;
    
    -- Execute the dynamic query
    EXECUTE dynamic_query INTO lag_week;
    
    -- Return the lagged fiscal year week
    RETURN lag_week;
END;
$function$
;
