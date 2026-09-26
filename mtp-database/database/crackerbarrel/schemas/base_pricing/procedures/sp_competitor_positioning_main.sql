--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:sp_competitor_positioning_main stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_competitor_positioning_main
DROP PROCEDURE IF EXISTS base_pricing.sp_competitor_positioning_main;

CREATE OR REPLACE PROCEDURE base_pricing.sp_competitor_positioning_main(IN segment_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    cost_column text;
    price_column text;
    eligibility_column text;
    zone_exception_column text;
    channel_lvl_id integer;
    channel_column text;
    sql_query text;
BEGIN
    start_time := clock_timestamp();
    -- Get dynamic cost, price, eligibility and zone_exception column names
    -- cost
    SELECT MAX(database_column) AS cost_column_name
    INTO cost_column
    FROM base_pricing.bp_product_store_attributes_metadata
    WHERE
        is_active = true
        AND attribute_name IN ('total_cost');
    -- price
    SELECT MAX(database_column) AS cost_column_name
    INTO price_column
    FROM base_pricing.bp_product_store_attributes_metadata
    WHERE
        is_active = true
        AND attribute_name IN ('price');
    -- eligibility
    SELECT MAX(database_column) AS cost_column_name
    INTO eligibility_column
    FROM base_pricing.bp_product_store_attributes_metadata
    WHERE
        is_active = true
        AND attribute_name IN ('eligibility');
    -- zone exception
    SELECT MAX(database_column) AS cost_column_name
    INTO zone_exception_column
    FROM base_pricing.bp_product_store_attributes_metadata
    WHERE
        is_active = true
        AND attribute_name IN ('zone_exception');
    -- Find the Channel store level id
    SELECT store_hierarchy_level_id
    INTO channel_lvl_id
    FROM base_pricing.bp_store_hierarchy_level
    WHERE store_hierarchy_level_value = 'Channel'
    LIMIT 1;
    -- Fallback to s0_name if not found or null
    IF channel_lvl_id IS NULL THEN
        channel_column := 's0_name';
        RAISE NOTICE 'Channel hierarchy level not found. Falling back to %', channel_column;
    ELSE
        channel_column := format('s%s_name', channel_lvl_id);
        RAISE NOTICE 'Using column % for channel', channel_column;
    END IF;
    RAISE NOTICE 'STARTING Competitor Positioning Refresh';
    -- DROP EXISTING VIEWS
    RAISE NOTICE 'DROPPING existing views';
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS base_pricing.mv_competitor_positioning_current_cpi;';
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS base_pricing.mv_competitor_positioning_heatmap;';
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS base_pricing.mv_competitor_positioning_heatmap_details;';
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS base_pricing.mv_competitor_positioning_summary_cards;';
    -- PROCEDURE CALLS
    -- STEP 1: Extract Competitor Data for Positioning
    CALL base_pricing.sp_competitor_positioning_competitor_data(cost_column, price_column, eligibility_column, zone_exception_column, segment_id);
    -- STEP 2: Generate Competitor Heatmap
    CALL base_pricing.sp_competitor_positioning_heatmap(cost_column, price_column);
    -- STEP 3: Extract Active Product Data by Segment
    CALL base_pricing.sp_competitor_positioning_active_data(segment_id);
    -- STEP 4: Generate Heatmap Details by Channel and Segment
    CALL base_pricing.sp_competitor_positioning_heatmap_details(cost_column, price_column, channel_column, segment_id);
    -- STEP 5: Compute Summary Cards for Positioning
    CALL base_pricing.sp_competitor_positioning_summary_cards(cost_column, price_column);
    -- STEP 6: Calculate Current CPI by Channel
    CALL base_pricing.sp_competitor_positioning_current_cpi(cost_column, price_column, channel_column);
    -- STEP 7: Create MVs
    CALL base_pricing.sp_competitor_positioning_update_views(cost_column, price_column);
    --
    RAISE NOTICE 'FINISHED Competitor Positioning Refresh';
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, 'sp_competitor_positioning_main', start_time, end_time, end_time - start_time);
END;
$procedure$
;