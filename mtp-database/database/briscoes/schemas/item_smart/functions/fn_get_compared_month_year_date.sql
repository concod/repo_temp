--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:fn_get_compared_month_year_date runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_monthly_view_updates
--comment: monthly view update
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.fn_get_compared_month_year_date(date, date);

CREATE OR REPLACE FUNCTION item_smart.fn_get_compared_month_year_date(sdate date, edate date)
 RETURNS TABLE(fiscal_month integer, fiscal_month_name_abb text, fiscal_year text, fiscal_month_begin_date date, fiscal_quarter_name text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_combine text;
BEGIN
    _query_combine := 
        'SELECT DISTINCT 
            fiscal_month::int,
            fiscal_month_name_abb::text,
            ''FY'' || RIGHT(fiscal_year::text, 2) AS fiscal_year,
            fiscal_month_begin_date::date,
            fiscal_quarter_name_abb::text AS fiscal_quarter_name
         FROM "global".fiscal_date_mapping
         WHERE calendar_date BETWEEN ''' || $1 || ''' AND ''' || $2 || '''
         ORDER BY fiscal_year, fiscal_month, fiscal_month_begin_date';
         
    RAISE NOTICE '%', _query_combine;
    RETURN QUERY EXECUTE _query_combine;
END
$function$
;