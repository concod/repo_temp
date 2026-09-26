--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_exception_report_summary_cards_3 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_exception_report_summary_cards_3

DO $$
DECLARE
    proc_record RECORD;
BEGIN
    FOR proc_record IN 
        SELECT p.oid, pg_get_function_identity_arguments(p.oid) as signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'base_pricing'
        AND p.proname = 'sp_exception_report_summary_cards'
    LOOP
        EXECUTE format('DROP PROCEDURE IF EXISTS base_pricing.sp_exception_report_summary_cards(%s) CASCADE', 
                       proc_record.signature);
        RAISE NOTICE 'Dropped procedure with signature: (%)', proc_record.signature;
    END LOOP;
END $$;

CREATE OR REPLACE PROCEDURE base_pricing.sp_exception_report_summary_cards(INOUT result_mv_name text DEFAULT 'mv_exception_report_summary_cards'::text, INOUT fin_table_name text DEFAULT 'bp_price_reco_finalized_v2'::text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_final_sql TEXT;
    v_index_name TEXT;
BEGIN
    -- Drop existing materialized view if it exists
    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS base_pricing.%I CASCADE', result_mv_name);

    -- Build dynamic SQL for the summary cards
    v_final_sql := format($sql$
    CREATE MATERIALIZED VIEW base_pricing.%I AS
    WITH strategy_filter AS (
        SELECT 
            strategy_id, 
            strategy_name, 
            strategy_status_id
        FROM base_pricing.bp_strategy_master
        WHERE strategy_status_id IN (110, 200, 210, 220)
    ),
    finalized_with_rules_base AS (
        SELECT
            fin.strategy_id,
            fin.product_id,
            fin.store_ids,
            fin.segment_id,
            fin.opt_level_bins,
            fin.price_zone_name,
            fin.effective_price_zone,
            fin.channel_id,
            fin.line_group,
            pcr.rule_types_applied,
            pcr.rule_exceptions_finalized
        FROM base_pricing.%I fin
        INNER JOIN strategy_filter sf ON fin.strategy_id = sf.strategy_id
        LEFT JOIN base_pricing.bp_price_change_reason pcr
            ON pcr.strategy_id = fin.strategy_id
            AND pcr.opt_level_bins = fin.opt_level_bins
        WHERE pcr.rule_exceptions_finalized IS NOT NULL
    ),
    finalized_unnested AS (
        SELECT
            strategy_id,
            product_id,
            store_unnest AS store_id,
            segment_id,
            opt_level_bins,
            price_zone_name,
            effective_price_zone,
            channel_id,
            line_group,
            rule_types_applied,
            rule_exceptions_finalized
        FROM finalized_with_rules_base
        CROSS JOIN LATERAL unnest(store_ids) AS store_unnest
    ),
    aggregated_summary AS (
        SELECT
            fin_un.strategy_id,
            fin_un.product_id,
            fin_un.store_id,
            fin_un.segment_id,
            COALESCE(fin_un.effective_price_zone, CONCAT(fin_un.channel_id, ' | ', fin_un.store_id::text)) AS effective_price_zone,
            COALESCE(fin_un.price_zone_name, fin_un.store_id::text) AS price_zone_name,
            COALESCE(fin_un.line_group, fin_un.product_id::text) AS line_group,
            fin_un.opt_level_bins,
            MAX(fin_un.rule_types_applied) AS rule_types_applied,
            MAX(fin_un.rule_exceptions_finalized) AS rule_exceptions_finalized
        FROM finalized_unnested fin_un
        INNER JOIN base_pricing.bp_strategy_products_stores bsps
            ON bsps.strategy_id = fin_un.strategy_id
            AND bsps.product_id = fin_un.product_id
            AND bsps.store_id = fin_un.store_id
            AND bsps.segment_id = fin_un.segment_id
        GROUP BY 
            fin_un.strategy_id,
            fin_un.product_id,
            fin_un.store_id,
            fin_un.segment_id,
            fin_un.effective_price_zone,
			fin_un.channel_id,
            fin_un.price_zone_name,
            fin_un.line_group,
            fin_un.opt_level_bins
    )
    SELECT
        strategy_id,
        product_id::TEXT,
        store_id::TEXT,
        segment_id,
        effective_price_zone,
        price_zone_name,
        line_group,
        opt_level_bins,
        rule_types_applied,
        rule_exceptions_finalized
    FROM aggregated_summary
    ORDER BY strategy_id, product_id, store_id, segment_id
    $sql$,
        result_mv_name,
        fin_table_name  -- Add the table name parameter here
    );

    -- Execute the dynamic SQL
    EXECUTE v_final_sql;

    -- Create indexes for performance with IF NOT EXISTS
    v_index_name := format('idx_%I_strategy', REPLACE(result_mv_name, 'mv_', ''));
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON base_pricing.%I(strategy_id)', 
                   v_index_name, result_mv_name);
    
    v_index_name := format('idx_%I_strategy_product', REPLACE(result_mv_name, 'mv_', ''));
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON base_pricing.%I(product_id, store_id)', 
                   v_index_name, result_mv_name);
    
    v_index_name := format('idx_%I_opt_level_bins', REPLACE(result_mv_name, 'mv_', ''));
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON base_pricing.%I(opt_level_bins)', 
                   v_index_name, result_mv_name);

    RAISE NOTICE 'Summary cards table % created successfully', result_mv_name;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to create summary cards table %: % (SQLSTATE: %)', 
                        result_mv_name, SQLERRM, SQLSTATE;
END;
$procedure$
;
