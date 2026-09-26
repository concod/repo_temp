--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:fn_get_forecast_cal_config_by_strategy_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_get_forecast_cal_config_by_strategy_2

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_get_forecast_cal_config_by_strategy;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_get_forecast_cal_config_by_strategy(p_strategy_id integer)
 RETURNS TABLE(forecast_type character varying, label character varying, fiscal_year integer, fiscal_months integer[])
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN QUERY
    WITH ref AS (
        SELECT
            GREATEST(sm.start_date::date, CURRENT_DATE) AS ref_date
        FROM base_pricing_restaurant.bp_strategy_master sm
        WHERE sm.strategy_id = p_strategy_id
    ),
    fiscal_ref AS (
        SELECT
            fdm.fiscal_year,
            fdm.fiscal_quarter,
            fdm.fiscal_month
        FROM global.tb_fiscal_date_mapping fdm
        JOIN ref ON fdm.date_id = ref.ref_date
    ),
    config AS (
        SELECT
            TRIM(c.forecast_type) AS forecast_type,
            c.label,
            c.cumulative_quarters
        FROM base_pricing_restaurant.bp_forecast_cal_config c
        WHERE c.is_active = true
    ),
    -- Logic for 12 months starting from Strategy Start Date
    rolling_12_months AS (
        SELECT DISTINCT
            fdm.fiscal_year,
            fdm.fiscal_month,
            fdm.date_id
        FROM global.tb_fiscal_date_mapping fdm
        CROSS JOIN ref
        WHERE fdm.date_id >= ref.ref_date
          AND fdm.date_id < (ref.ref_date + INTERVAL '1 year')
    ),
    fiscal_year_months AS (
        SELECT DISTINCT fym.fiscal_year, fym.fiscal_month
        FROM global.tb_fiscal_date_mapping fym
        WHERE fym.fiscal_year = (SELECT fr.fiscal_year FROM fiscal_ref fr)
    ),
    quarter_month_map AS (
        SELECT DISTINCT qmm.fiscal_quarter, qmm.fiscal_month
        FROM global.tb_fiscal_date_mapping qmm
        WHERE qmm.fiscal_year = (SELECT fr.fiscal_year FROM fiscal_ref fr)
    )

    -- FISCAL_YEAR and QUARTER-based types
    SELECT
        c.forecast_type::VARCHAR,
        c.label::VARCHAR,
        (SELECT fr.fiscal_year FROM fiscal_ref fr) AS fiscal_year,
        CASE
            WHEN c.forecast_type = 'FISCAL_YEAR' THEN
                ARRAY(SELECT fym.fiscal_month FROM fiscal_year_months fym ORDER BY fym.fiscal_month)
            ELSE
                ARRAY(
                    SELECT DISTINCT qmm.fiscal_month
                    FROM quarter_month_map qmm
                    WHERE c.cumulative_quarters IS NOT NULL
                      AND qmm.fiscal_quarter = ANY(c.cumulative_quarters)
                    ORDER BY qmm.fiscal_month
                )
        END AS fiscal_months
    FROM config c
    WHERE c.forecast_type != 'CALENDAR_YEAR'

    UNION ALL

    -- REVISED CALENDAR_YEAR: Rolling 12 Months from Start Date
    -- This groups the 12 months by their respective fiscal years
    SELECT
        c.forecast_type::VARCHAR,
        c.label::VARCHAR,
        r12.fiscal_year,
        ARRAY_AGG(DISTINCT r12.fiscal_month ORDER BY r12.fiscal_month) AS fiscal_months
    FROM config c
    CROSS JOIN rolling_12_months r12
    WHERE c.forecast_type = 'CALENDAR_YEAR'
    GROUP BY c.forecast_type, c.label, r12.fiscal_year;

END;
$function$
;
