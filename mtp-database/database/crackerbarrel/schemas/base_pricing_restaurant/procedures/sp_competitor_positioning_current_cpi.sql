--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_competitor_positioning_current_cpi stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_competitor_positioning_current_cpi

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_competitor_positioning_current_cpi;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_competitor_positioning_current_cpi(IN cost_column text, IN price_column text, IN channel_column text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    col_record RECORD;
    hierarchy_cols text;
    sql_query text;
BEGIN
    start_time := clock_timestamp();
    -- Build hierarchy columns for CTE
    hierarchy_cols := '';
    FOR col_record IN
        SELECT
            'l' || product_hierarchy_level_id || '_name' AS col,
            'product' AS type, product_hierarchy_level_id AS level_id
        FROM base_pricing_restaurant.bp_product_hierarchy_level
        WHERE
            COALESCE(report_hierarchy_dropdown, false) = true
        ORDER BY
            type,
            level_id
    LOOP
        IF hierarchy_cols != '' THEN
            hierarchy_cols := hierarchy_cols || ',';
        END IF;
        IF col_record.col LIKE 'l%' THEN
            hierarchy_cols := hierarchy_cols || 'pm.' || col_record.col;
        ELSE
            hierarchy_cols := hierarchy_cols || 'sm.' || col_record.col;
        END IF;
    END LOOP;
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing_restaurant.bp_unlogged_competitor_positioning_current_cpi;
CREATE UNLOGGED TABLE base_pricing_restaurant.bp_unlogged_competitor_positioning_current_cpi AS
WITH
    joined_data AS (
        SELECT
            %s,                     -- hierarchy_cols
            sm.%s as channel,       -- channel column
            uc.product_id,
            uc.store_id,
            %s,                     -- cost column
            %s,                     -- price column
            uc.competitor_price,
            uc.competitor_name,
            uc.competitor_display_name,
            uc.sales_units
        FROM
            base_pricing_restaurant.bp_unlogged_competitor_positioning_heatmap_details uc
            INNER JOIN base_pricing_restaurant.bp_product_master pm
                USING (product_id)
            INNER JOIN base_pricing_restaurant.bp_store_master sm
                USING (store_id)
    )
SELECT *
FROM joined_data jd;
-- INDEX creation
CREATE INDEX idx_bp_unlogged_competitor_positioning_current_cpi_id1
    ON base_pricing_restaurant.bp_unlogged_competitor_positioning_current_cpi USING btree (product_id, store_id);
$query$,
    hierarchy_cols,
    channel_column,
    cost_column,
    price_column
);
    RAISE NOTICE 'Creating bp_unlogged_competitor_positioning_current_cpi table: %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for bp_unlogged_competitor_positioning_current_cpi table : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, 'sp_competitor_positioning_current_cpi', start_time, end_time, end_time - start_time);
END;
$procedure$
;