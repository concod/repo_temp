--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:fetch_plan_data_1_replace_kpi_formula runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-70175
--comment: Function to replace inventory aggregation formula with cirrect columns of time dim attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.fetch_plan_data_1_replace_kpi_formula(text, text);
CREATE OR REPLACE FUNCTION plan_smart.fetch_plan_data_1_replace_kpi_formula(p_formula text, p_fiscal text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_result text := p_formula;
    v_suffix text;
BEGIN
    -- Determine suffix based on fiscal parameter
    v_suffix := CASE p_fiscal
        WHEN 'fiscal_year_month' THEN '_month'
        WHEN 'fiscal_year' THEN '_year'
        WHEN 'fiscal_season_name' THEN '_season'
        WHEN 'fiscal_quarter_in_year' THEN '_quarter'
        WHEN 'current_year' THEN ''
        ELSE ''
    END;

    -- Only replace if a suffix applies
    IF v_suffix <> '' THEN
        -- Replace only for the KPI set
        -- Replace sum(kpiXX) with sum(kpiXX_suffix)
        v_result := regexp_replace(
            v_result,
            'sum\((kpi(30|37|38|64|65|68|69|70|71|72|73))\)',
            'sum(\1' || v_suffix || ')',
            'gi'
        );
    END IF;

    RETURN v_result;
END;
$function$
;
 