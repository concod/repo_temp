--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:sp_competitor_positioning_summary_cards stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_competitor_positioning_summary_cards

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_competitor_positioning_summary_cards;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_competitor_positioning_summary_cards(IN cost_column text, IN price_column text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
BEGIN
    start_time := clock_timestamp();
    sql_query := format(
$query$
-- Table creation
DROP TABLE IF EXISTS base_pricing_restaurant.bp_unlogged_competitor_positioning_summary_cards;
CREATE UNLOGGED TABLE base_pricing_restaurant.bp_unlogged_competitor_positioning_summary_cards AS
SELECT
    bucphd.product_id,
    bucphd.store_id,
    %s,     -- cost column
    %s,     -- price column
    bucphd.competitor_name,
    bucphd.competitor_display_name,
    bucphd.competitor_price,
    bucphd.sales_units
FROM
    base_pricing_restaurant.bp_unlogged_competitor_positioning_heatmap_details bucphd;
-- INDEX creation
CREATE INDEX idx_bp_unlogged_competitor_positioning_summary_cards_id1
    ON base_pricing_restaurant.bp_unlogged_competitor_positioning_summary_cards USING btree (product_id, store_id);
$query$,
    cost_column,
    price_column
);
    RAISE NOTICE 'Creating bp_unlogged_competitor_positioning_summary_cards table: %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for bp_unlogged_competitor_positioning_summary_cards table : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, 'sp_competitor_positioning_summary_cards', start_time, end_time, end_time - start_time);
END;
$procedure$
;