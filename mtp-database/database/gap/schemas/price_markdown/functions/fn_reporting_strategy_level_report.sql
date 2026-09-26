--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_reporting_strategy_level_report runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_reporting_strategy_level_report
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_reporting_strategy_level_report;
CREATE OR REPLACE FUNCTION price_markdown.fn_reporting_strategy_level_report(_sid integer[], _start_date date, _end_date date)
 RETURNS TABLE("Strategy ID" integer, "Strategy Name" character varying, "Status" character varying, "Start Date" date, "End Date" date, "Actual Units on Markdown" numeric, "Actual Revenue ($)" numeric, "Actual Margin ($)" numeric, "Actual Margin %" numeric, "Actual Markdown Spend ($)" numeric, "Actual Sellthrough (%)" numeric, "Target Units for Markdown" numeric, "Target Revenue ($)" numeric, "Target Margin ($)" numeric, "Target Sellthrough (%)" numeric, "Finalised Units on Markdown" numeric, "Finalised Revenue ($)" numeric, "Finalised Margin ($)" numeric, "Finalised Margin %" numeric, "Finalised Markdown Spend ($)" numeric, "Finalised Sellthrough (%)" numeric)
	LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH
        strategy_filter AS (
            SELECT
                strategy_name,
                strategy_id,
                start_date,
                end_date,
                CASE WHEN start_date > current_date THEN 'Finalized'
                     WHEN (current_date >= start_date and current_date <= end_date) THEN 'Active'
                     WHEN current_date > end_date then 'Completed'
                     ELSE 'NA'
                END as Status
            FROM price_markdown.tb_strategy_master x
            WHERE strategy_id = ANY(_sid)
        ),
        perm_strategy AS (
            SELECT
                strategy_id,
                unnest(applicable_value) AS end_rule
            FROM price_markdown.tb_strategy_rule t1
            INNER JOIN (
                SELECT
                    rule_id,
                    rule_type
                FROM price_markdown.tb_rule_master trm
            ) t2 ON t1.constraint_id = t2.rule_id
            WHERE strategy_id = ANY(_sid)
            AND constraint_type  = 0
            AND status = 0
            AND rule_type = 44 -- Ending_Rule
        ),
        objective_base AS
        (
            SELECT
                strategy_id,
                MAX(CASE WHEN c.objective_type_id = 38 THEN c.objective_value END) AS sales_units_target,
                MAX(CASE WHEN c.objective_type_id = 41 THEN c.objective_value END) AS sales_dollar_target,
                MAX(CASE WHEN c.objective_type_id = 39 THEN c.objective_value END) AS margin_dollar_target,
                --MAX(CASE WHEN c.objective_type_id = 4 THEN c.objective_value END) AS mkd_budget_dollar_target,
                MAX(CASE WHEN c.objective_type_id = 48 THEN c.objective_value END) AS st_target
            FROM  price_markdown.tb_strategy_objective c
            WHERE strategy_id = ANY(_sid)
            GROUP BY 1
        )

        SELECT
            a.strategy_id,
            strategy_name::varchar strategy_name,
            b.Status::varchar Status,
            start_date,
            end_date,
            ROUND(till_date_sales_units::numeric, 0) AS "Actual Units on Markdown",
            ROUND(till_date_revenue::numeric, 2) AS "Actual Revenue ($)",
            ROUND(till_date_gm_dollar::numeric, 2) AS "Actual Margin ($)",
            ROUND(till_date_gm_percent::numeric, 2) AS "Actual Margin %",
            ROUND(till_date_markdown_dollar::numeric, 2) AS "Actual Markdown Spend ($)",
            ROUND(till_date_st_percent::numeric, 2) AS "Actual Sellthrough (%)",
            ROUND(sales_units_target::numeric, 0) AS "Target Units for Markdown",
            ROUND(sales_dollar_target::numeric, 2) AS "Target Revenue ($)",
            ROUND(margin_dollar_target::numeric, 2) AS "Target Margin ($)",
            ROUND(st_target::numeric, 2) AS "Target Sellthrough (%)",
            ROUND(SUM(sales_units)::numeric, 0) AS "Finalised Units on Markdown",
            ROUND(SUM(revenue)::numeric, 2) AS "Finalised Revenue ($)",
            ROUND(SUM(margin)::numeric, 2) AS "Finalised Markdown Spend ($)",
            ROUND((100 * SUM(margin) / NULLIF(SUM(revenue), 0))::numeric, 2) AS "Finalised Margin %",
            ROUND(SUM(spend)::numeric, 0) AS "Finalised Markdown Spend ($)",
            ROUND((100*sum(sales_units)  /
            nullif((sum(sales_units) + SUM(case when recommendation_date = b.end_date then rem_inv else 0 END)),0))::numeric,2) as "Finalised Sellthrough (%)"
        FROM
            price_markdown.fn_create_strategies_union_query_from_agg_tables(_sid, 'finalized') a
        JOIN
            strategy_filter b USING(strategy_id)
        LEFT JOIN
            perm_strategy c ON a.strategy_id = c.strategy_id
        LEFT JOIN
            price_markdown.tb_strategy_actuals d ON a.strategy_id = d.strategy_id
        LEFT JOIN
            objective_base e ON a.strategy_id = e.strategy_id

        GROUP BY
            1,2,3,4,5,6,7,8,9,10,11,12,13,14,15;

END;
$function$
;