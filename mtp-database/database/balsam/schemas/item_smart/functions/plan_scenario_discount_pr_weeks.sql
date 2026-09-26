--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:plan_scenario_discount_pr_months runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:plan_scenario_discount_pr_months
--comment: monthly aggregated version of plan_scenario_discount_pr_weeks for balsam
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.plan_scenario_discount_pr_weeks(
  p_channels text[],
  p_sub_channels text[],
  p_hierarchy_codes character varying[],
  p_start_week text,
  p_end_week text,
  p_dept text,
  p_plan text,
  p_brand text
);

CREATE OR REPLACE FUNCTION item_smart.plan_scenario_discount_pr_weeks(
    p_channels        text[],
    p_sub_channels    text[],
    p_hierarchy_codes character varying[],
    p_start_week      text,
    p_end_week        text,
    p_dept            text,
    p_plan            text,
    p_brand           text
)
RETURNS TABLE (
    written_dr_perc   double precision,
    fiscal_year       integer,
    fiscal_month_name text,
    fiscal_month_num  integer
)
LANGUAGE plpgsql
AS $function$
DECLARE
    dynamic_query text;
BEGIN
    dynamic_query := format($sql$
        WITH base AS (
            SELECT
                mt.channel,
                fd.fiscal_year,
                fd.fiscal_month_name_abb AS fiscal_month_name,
                fd.fiscal_month_in_year  AS fiscal_month_num,

                -- Aggregates for calculations
                SUM(COALESCE(mt.written_sales_units, 0))   AS sum_units,
                SUM(COALESCE(mt.written_sales_dollars, 0)) AS sum_dollars,
                SUM(COALESCE(mt.written_sales_units, 0) * COALESCE(mt.written_air, 0)) AS sum_retail_value,

                -- Averages for fallbacks (when units = 0)
                AVG(COALESCE(mt.written_dr_perc, 0))       AS avg_dr,
                AVG(COALESCE(mt.written_sales_dollars, 0)) AS avg_sales_dollars_fallback -- Used for AUR fallback per user instruction
            FROM
                item_smart.%I_master_%I mt
            JOIN
                "global".fiscal_date_mapping fd
                  ON fd.fiscal_year_week = mt.current_week
            WHERE 
                mt.channel      = ANY(%L)
                AND mt.sub_channel = ANY(%L)
                AND mt.current_week BETWEEN %L AND %L
                AND mt.hierarchy_code IN (
                    SELECT hierarchy_code 
                    FROM item_smart.mv_product_hierarchies_filter mphf 
                    WHERE mphf.item   = ANY(%L)
                      AND mphf.l0_name = %L
                    UNION ALL 
                    SELECT hierarchy_code 
                    FROM item_smart.placeholders_info phi
                    WHERE phi.item   = ANY(%L)
                      AND phi.l0_name = %L
                )
            GROUP BY
                mt.channel,
                fd.fiscal_year,
                fd.fiscal_month_name_abb,
                fd.fiscal_month_in_year
        ),
        channel_calcs AS (
            SELECT
                *,
                -- Calculate Channel DR based on 1 - (ASP/AIR) formula logic
                -- Note: ASP/AIR simplifies to Sales / RetailValue
                CASE 
                    WHEN sum_units = 0 THEN avg_dr
                    ELSE 
                        COALESCE(
                            1 - (sum_dollars / NULLIF(sum_retail_value, 0)), 
                            0
                        )
                END AS channel_dr
            FROM base
        ),
        monthly AS (
            SELECT
                fiscal_year,
                fiscal_month_name,
                fiscal_month_num,
                
                SUM(sum_units)        AS monthly_units,
                SUM(sum_dollars)      AS monthly_dollars,
                SUM(sum_retail_value) AS monthly_retail_value,
                
                AVG(channel_dr)       AS monthly_avg_of_channel_drs
            FROM channel_calcs
            GROUP BY
                fiscal_year,
                fiscal_month_name,
                fiscal_month_num
        )
        SELECT
            CASE 
                WHEN monthly_units = 0 THEN
                    -- If no units, use average of channel DRs
                    monthly_avg_of_channel_drs
                ELSE
                    -- If units exist, use 1 - (Monthly ASP / Monthly AIR)
                    -- which simplifies to 1 - (Total Sales / Total Retail Value)
                    COALESCE(
                        1 - (monthly_dollars / NULLIF(monthly_retail_value, 0)),
                        0
                    )
            END::double precision        AS written_dr_perc,
            fiscal_year::int             AS fiscal_year,
            fiscal_month_name::text      AS fiscal_month_name,
            fiscal_month_num::int        AS fiscal_month_num
        FROM monthly
        ORDER BY
            fiscal_year,
            fiscal_month_num
    $sql$,
        p_plan,             -- %I
        p_dept,             -- %I
        p_channels,         -- %L
        p_sub_channels,     -- %L
        p_start_week,       -- %L
        p_end_week,         -- %L
        p_hierarchy_codes,  -- %L
        p_brand,            -- %L
        p_hierarchy_codes,  -- %L
        p_brand             -- %L
    );

    -- Log query for debugging
    RAISE NOTICE 'Executing query: %', dynamic_query;

    RETURN QUERY EXECUTE dynamic_query;
END;
$function$;
