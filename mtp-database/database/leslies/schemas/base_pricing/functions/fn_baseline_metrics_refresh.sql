--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_baseline_metrics_refresh_10 stripComments:false splitStatements:false runOnChange:true context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_baseline_metrics_refresh_10


DROP FUNCTION IF EXISTS base_pricing.fn_baseline_metrics_refresh;

CREATE OR REPLACE FUNCTION base_pricing.fn_baseline_metrics_refresh()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    sql_query text;
BEGIN
    -- DROP and CREATE TABLE bp_ps_filter_overall
    sql_query := '
        DROP TABLE IF EXISTS base_pricing.bp_ps_filter_overall;
        --
        CREATE UNLOGGED TABLE base_pricing.bp_ps_filter_overall AS
        WITH raw_data AS (
            SELECT 
                psam.product_id,
                psam.channel_id,
                psam.store_id,
                psam.segment_id,
                psam.attribute_3::NUMERIC AS segment_cost,
                psam.attribute_4::NUMERIC AS segment_price,
                psam.attribute_10 AS eligibility
            FROM
                base_pricing.bp_product_store_attributes_mapping_v4 psam
        )
        SELECT
            rd.product_id,
            rd.channel_id,
            rd.segment_id,
            ROUND(AVG(rd.segment_cost), 2) AS segment_cost,
            ROUND(AVG(rd.segment_price), 2) AS segment_price
        FROM
            raw_data rd
        WHERE
            COALESCE(rd.segment_cost, 0) > 0
            AND COALESCE(rd.segment_price, 0) > 0
            AND UPPER(rd.eligibility) = ''Y''
        GROUP BY
            rd.product_id,
            rd.channel_id,
            rd.segment_id;
    ';
    RAISE NOTICE '%', sql_query;
    EXECUTE sql_query;
    -- CREATING INDEX for TABLE bp_ps_filter_overall
    sql_query := '
        CREATE INDEX idx_bp_ps_filter_overall_idx1
            ON base_pricing.bp_ps_filter_overall USING btree (product_id, channel_id, segment_id);
    ';
    RAISE NOTICE '%', sql_query;
    EXECUTE sql_query;
    --
    -- DROP and CREATE TABLE baseline_sales_overall 
    sql_query := '
        DROP TABLE IF EXISTS base_pricing.bp_baseline_sales_overall;
        --
        CREATE UNLOGGED TABLE base_pricing.bp_baseline_sales_overall AS
        SELECT 
            bsw.product_id,
            bsw.channel_id,
            bsw.segment_id,
            bsw.week_start_date,
            bpfo.segment_price,
            bpfo.segment_cost,
            (bsw.sales_units *
                (1 + bsw.elasticity_bp * (((bpfo.segment_price - bsw.min_cost)/NULLIF(bsw.min_cost, 0))
                    - bsw.base_percentage))) AS segment_baseline_sales
        FROM
            base_pricing.bp_simulation_week bsw
            INNER JOIN base_pricing.bp_ps_filter_overall bpfo
                USING (product_id, channel_id, segment_id);
    ';
    RAISE NOTICE 'REFRESHING DATA for TABLE baseline_sales_overall : %', sql_query;
    EXECUTE sql_query;
    -- CREATING INDEX for TABLE baseline_sales_overall
    sql_query := '
        CREATE INDEX idx_bp_baseline_sales_overall_idx1
            ON base_pricing.bp_baseline_sales_overall USING btree (product_id, channel_id, week_start_date);
        CREATE INDEX idx_bp_baseline_sales_overall_idx2
            ON base_pricing.bp_baseline_sales_overall USING btree (product_id, segment_id);
        CREATE INDEX idx_bp_baseline_sales_overall_idx3
            ON base_pricing.bp_baseline_sales_overall USING btree (product_id, segment_id, week_start_date);
    ';
    RAISE NOTICE 'CREATING INDEX for TABLE baseline_sales_overall : %', sql_query;
    EXECUTE sql_query;
END;
$function$;