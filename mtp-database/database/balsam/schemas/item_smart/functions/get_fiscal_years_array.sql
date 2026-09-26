--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:get_fiscal_years_array stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:get_fiscal_years_array
--comment: initial changeset for get_fiscal_years_array
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.get_fiscal_years_array(int4, int4);

CREATE OR REPLACE FUNCTION item_smart.get_fiscal_years_array(p_start_current_week integer, p_end_current_week integer)
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$
DECLARE
    fiscal_years INTEGER[];
BEGIN
    -- Get distinct fiscal years from the mapping table for all weeks between start and end
    SELECT ARRAY_AGG(DISTINCT fiscal_year ORDER BY fiscal_year)
    INTO fiscal_years
    FROM global.fiscal_date_mapping
    WHERE fiscal_year_week >= p_start_current_week
      AND fiscal_year_week <= p_end_current_week;
    
    RETURN fiscal_years;
END;
$function$
;
