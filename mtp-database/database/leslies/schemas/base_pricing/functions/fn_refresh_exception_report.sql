--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_refresh_exception_report_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_refresh_exception_report_10

DROP FUNCTION IF EXISTS base_pricing.fn_refresh_exception_report;

CREATE OR REPLACE FUNCTION base_pricing.fn_refresh_exception_report()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    schema_name TEXT := 'base_pricing';
    mv_name_1 TEXT := 'mv_exception_report';
    mv_name_2 TEXT := 'exception_report_rule_list_mv';
    sql TEXT;
BEGIN
    -- Drop dependent materialized view first
    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I', schema_name, mv_name_2);

    -- Then drop main materialized view
    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I', schema_name, mv_name_1);

    -- Recreate mv_exception_report
    sql := $q$
        CREATE MATERIALIZED VIEW base_pricing.mv_exception_report AS
        WITH strategy_status AS (
            SELECT 
                b.strategy_status_display_name, 
                b.strategy_status_id, 
                m.strategy_id, 
                m.strategy_name
            FROM base_pricing.bp_strategy_master m
            JOIN base_pricing.bp_strategy_status_level b 
              ON m.strategy_status_id = b.strategy_status_id
        ),
        rule_id_to_name AS (
            SELECT rm.id AS rule_id, rt.name AS rule_name
            FROM base_pricing.bp_rule_master rm
            JOIN base_pricing.bp_rule_types rt ON rm.rule_type_id = rt.id
        ),
        finalized_prices AS (
            SELECT
                c.strategy_id,
                c.product_id::text AS product_id,
                c.store_id::text AS store_id,
                STRING_AGG(DISTINCT r.rule_name, ', ') AS exception_list,
                STRING_AGG(DISTINCT c.opt_level_bins::text, ', ') AS opt_level_bins,
                STRING_AGG(DISTINCT c.product_name, ', ') AS product_description,
                STRING_AGG(DISTINCT c.store_name, ', ') AS store_description,
                STRING_AGG(DISTINCT c.price_zone_name, ', ') AS price_zone_name,
                ROUND(AVG(c.base_price)::numeric, 2) AS finalized_price,
                SUM(c.sales_units) AS total_sales_units,
                ROUND(SUM(c.revenue)::numeric, 2) AS total_revenue,
                MAX(c.channel) AS channel,
                MAX(c.line_group) AS line_group,
                MAX(c.zone_structure_name) AS zone_structure_name,
                MAX(c.size_family) AS size_family,
                MAX(c.size_class) AS size_class,
                MAX(c.brand_family) AS brand_family,
                MAX(c.brand_class) AS brand_class,
                MAX(c.other_family_1) AS other_family_1,
                MAX(c.other_class_1) AS other_class_1,
                MAX(c.cost) AS cost,
                MAX(c.size) AS size,
                MAX(c.uom) AS uom,
                MAX(c.price_change_reason) AS price_change_reason,
                MAX(c.competitor_price) AS competitor_price,
                ROUND(CAST(AVG(c.price) AS NUMERIC), 2) AS price
            FROM base_pricing.bp_price_reco_finalized c
            JOIN LATERAL jsonb_array_elements(c.rules_exception) AS rule_data ON TRUE
            JOIN rule_id_to_name r ON (rule_data->>'rule_id')::int = r.rule_id
            WHERE c.rules_exception IS NOT NULL
              AND jsonb_typeof(c.rules_exception) = 'array'
              AND jsonb_array_length(c.rules_exception) > 0
              AND c.strategy_id IN (SELECT strategy_id FROM strategy_status)
            GROUP BY c.strategy_id, c.product_id, c.store_id
        )
        SELECT 
            fp.*,
            ss.strategy_status_display_name AS strategy_status,
            ss.strategy_name
        FROM finalized_prices fp
        INNER JOIN strategy_status ss ON ss.strategy_id = fp.strategy_id
        ORDER BY fp.strategy_id, fp.product_id, fp.store_id;
    $q$;

    EXECUTE sql;

    -- Recreate dependent materialized view
    sql := $q$
        CREATE MATERIALIZED VIEW base_pricing.exception_report_rule_list_mv
            AS
        SELECT DISTINCT TRIM(value) AS distinct_rules, strategy_id
        FROM (
            SELECT UNNEST(STRING_TO_ARRAY(exception_list, ',')) AS value, strategy_id
            FROM base_pricing.mv_exception_report
            GROUP BY exception_list, strategy_id
        ) t
        WHERE TRIM(value) != ''
        ORDER BY distinct_rules;
    $q$;

    EXECUTE sql;

END;
$function$
;