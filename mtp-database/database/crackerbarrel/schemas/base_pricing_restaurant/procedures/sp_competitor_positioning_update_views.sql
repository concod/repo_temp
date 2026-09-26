--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:sp_competitor_positioning_update_views stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_competitor_positioning_update_views

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_competitor_positioning_update_views;


CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_competitor_positioning_update_views(IN cost_column text, IN price_column text)
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
            hierarchy_cols := hierarchy_cols || 'bucpcc.' || col_record.col;
        ELSE
            hierarchy_cols := hierarchy_cols || 'bucpcc.' || col_record.col;
        END IF;
    END LOOP;
    RAISE NOTICE 'STARTED creating MVs';
    -- MV 1
    IF EXISTS (
        SELECT 1
        FROM pg_matviews
        WHERE
            schemaname = 'base_pricing_restaurant'
            AND matviewname = 'mv_competitor_positioning_summary_cards'
    )
        THEN EXECUTE 'REFRESH MATERIALIZED VIEW base_pricing_restaurant.mv_competitor_positioning_summary_cards';
    ELSE
        sql_query := format(
            $query$
            -- CREATE VIEW
            CREATE MATERIALIZED VIEW base_pricing_restaurant.mv_competitor_positioning_summary_cards AS
            SELECT 
                bucpsc.product_id,
                bucpsc.store_id,
                bucpsc.%s,
                bucpsc.competitor_price,
                bucpsc.competitor_name,
                bucpsc.competitor_display_name,
                bucpsc.sales_units
            FROM
                base_pricing_restaurant.bp_unlogged_competitor_positioning_summary_cards bucpsc
            WITH DATA;
            -- CREATE INDEX
            CREATE INDEX idx_mv_competitor_positioning_summary_cards_id1
                ON base_pricing_restaurant.mv_competitor_positioning_summary_cards USING btree (product_id, store_id);
            $query$,
                price_column
        );
        RAISE NOTICE 'Creating mv_competitor_positioning_summary_cards MV: %', sql_query;
        EXECUTE sql_query;
    END IF;
    -- MV 2
    IF EXISTS (
        SELECT 1
        FROM pg_matviews
        WHERE
            schemaname = 'base_pricing_restaurant'
            AND matviewname = 'mv_competitor_positioning_heatmap'
    )
        THEN EXECUTE 'REFRESH MATERIALIZED VIEW base_pricing_restaurant.mv_competitor_positioning_heatmap';
    ELSE
        sql_query := format(
            $query$
                -- CREATE VIEW
                CREATE MATERIALIZED VIEW base_pricing_restaurant.mv_competitor_positioning_heatmap AS
                SELECT 
                    bucph.product_id,
                    bucph.store_id,
                    bucph.%s,
                    bucph.competitor_price,
                    bucph.competitor_name,
                    bucph.competitor_display_name,
                    bucph.price_bucket
                FROM base_pricing_restaurant.bp_unlogged_competitor_positioning_heatmap bucph
                WITH DATA;
                -- CREATE INDEX
                CREATE INDEX idx_mv_competitor_positioning_heatmap_id1
                    ON base_pricing_restaurant.mv_competitor_positioning_heatmap USING btree (product_id, store_id);
            $query$,
                price_column
        );
        RAISE NOTICE 'Creating bp_unlogged_competitor_positioning_heatmap MV: %', sql_query;
        EXECUTE sql_query;
        END IF;
    -- MV 3
    IF EXISTS (
        SELECT 1
        FROM pg_matviews
        WHERE
            schemaname = 'base_pricing_restaurant'
            AND matviewname = 'mv_competitor_positioning_heatmap_details'
    )
        THEN EXECUTE 'REFRESH MATERIALIZED VIEW base_pricing_restaurant.mv_competitor_positioning_heatmap_details';
    ELSE
        sql_query := format(
            $query$
            -- CREATE VIEW
            CREATE MATERIALIZED VIEW base_pricing_restaurant.mv_competitor_positioning_heatmap_details AS
            SELECT 
                bucphd.product_id,
                bucphd.store_id,
                bucphd.segment_id,
                bucphd.segment_name,
                bucphd.channel,
                bucphd.effective_price_zone,
                bucphd.%s,
                bucphd.%s,
                bucphd.competitor_display_name AS competitor,
                bucphd.competitor_price,
                bucphd.price_difference_percent,
                bucphd.price_difference,
                bucphd.price_bucket,
                bucphd.product_name,
                bucphd.strategy_id,
                bucphd.historical_price,
                bucphd.sales_units AS sales_volume,
                bucphd.date_range,
                bucphd.strategy_name,
                bucphd.line_group_computed,
                bucphd.price_zone_computed,
                bucphd.strategy_status
            FROM base_pricing_restaurant.bp_unlogged_competitor_positioning_heatmap_details bucphd
            WITH DATA;
            -- CREATE INDEX
            CREATE INDEX idx_mv_competitor_positioning_heatmap_details_id1
                ON base_pricing_restaurant.mv_competitor_positioning_heatmap_details USING btree (competitor);
            CREATE INDEX idx_mv_competitor_positioning_heatmap_details_id2
                ON base_pricing_restaurant.mv_competitor_positioning_heatmap_details USING btree (price_bucket);
            CREATE INDEX idx_mv_competitor_positioning_heatmap_details_id3
                ON base_pricing_restaurant.mv_competitor_positioning_heatmap_details USING btree (product_id, store_id);
            CREATE INDEX idx_mv_competitor_positioning_heatmap_details_id4
                ON base_pricing_restaurant.mv_competitor_positioning_heatmap_details USING btree (price_zone_computed, line_group_computed);
            $query$,
                cost_column,
                price_column
        );
        RAISE NOTICE 'Creating mv_competitor_positioning_heatmap_details MV: %', sql_query;
        EXECUTE sql_query;
    END IF;
    -- MV 4
    IF EXISTS (
        SELECT 1
        FROM pg_matviews
        WHERE
            schemaname = 'base_pricing_restaurant'
            AND matviewname = 'mv_competitor_positioning_current_cpi'
    ) THEN
        EXECUTE 'REFRESH MATERIALIZED VIEW base_pricing_restaurant.mv_competitor_positioning_current_cpi';
    ELSE
        sql_query := format(
            $query$
            -- CREATE VIEW
            CREATE MATERIALIZED VIEW base_pricing_restaurant.mv_competitor_positioning_current_cpi AS
            SELECT
                bucpcc.product_id,
                bucpcc.store_id,
                %s,
                bucpcc.channel,
                bucpcc.%s,
                bucpcc.competitor_name,
                bucpcc.competitor_display_name,
                bucpcc.competitor_price,
                bucpcc.sales_units
            FROM base_pricing_restaurant.bp_unlogged_competitor_positioning_current_cpi bucpcc
            WITH DATA;
            -- CREATE INDEX
            CREATE INDEX idx_mv_competitor_positioning_current_cpi_id1
                ON base_pricing_restaurant.mv_competitor_positioning_current_cpi USING btree (product_id, store_id);
            $query$,
                hierarchy_cols,
                price_column
        );
        RAISE NOTICE 'Creating MVs: %', sql_query;
        EXECUTE sql_query;
    END IF;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating MVs : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, 'sp_competitor_positioning_update_views', start_time, end_time, end_time - start_time);
END;
$procedure$
;