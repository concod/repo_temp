
--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_price_change_driver_data_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_price_change_driver_data_1

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_price_change_driver_data;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_price_change_driver_data()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
	mv_full_name text;
	mv_name text;
    sql_query text;
    level_id integer;
    store_hierarchy_dynamic_select_clause text;
    product_hierarchy_dynamic_select_clause text;
    final_select_clause text;
BEGIN
    start_time := clock_timestamp();

    store_hierarchy_dynamic_select_clause := '';
    product_hierarchy_dynamic_select_clause := '';
	mv_name := 'mv_price_change_driver_data';

    -- Create Dynamic Select Clause for active store hierarchy levels
    FOREACH level_id IN ARRAY (
        SELECT COALESCE(ARRAY_AGG(store_hierarchy_level_id ORDER BY store_hierarchy_level_id), ARRAY[]::INTEGER[])
        FROM base_pricing_restaurant.bp_store_hierarchy_level
        WHERE report_hierarchy_dropdown = true
    ) LOOP
        IF store_hierarchy_dynamic_select_clause != '' THEN
            store_hierarchy_dynamic_select_clause := store_hierarchy_dynamic_select_clause || ', ';
        END IF;
        
        store_hierarchy_dynamic_select_clause := store_hierarchy_dynamic_select_clause || 's' || level_id || '_name';
    END LOOP;

    -- Create Dynamic Select Clause for active product hierarchy levels
    FOREACH level_id IN ARRAY (
        SELECT COALESCE(ARRAY_AGG(product_hierarchy_level_id ORDER BY product_hierarchy_level_id), ARRAY[]::INTEGER[])
        FROM base_pricing_restaurant.bp_product_hierarchy_level
        WHERE report_hierarchy_dropdown = true
    ) LOOP
        IF product_hierarchy_dynamic_select_clause != '' THEN
            product_hierarchy_dynamic_select_clause := product_hierarchy_dynamic_select_clause || ', ';
        END IF;
        
        product_hierarchy_dynamic_select_clause := product_hierarchy_dynamic_select_clause || 'l' || level_id || '_name';
    END LOOP;

    -- Combine both hierarchy clauses
    final_select_clause := '';
    IF product_hierarchy_dynamic_select_clause != '' THEN
        final_select_clause := product_hierarchy_dynamic_select_clause;
    END IF;
    IF store_hierarchy_dynamic_select_clause != '' THEN
        IF final_select_clause != '' THEN
            final_select_clause := final_select_clause || ', ';
        END IF;
        final_select_clause := final_select_clause || store_hierarchy_dynamic_select_clause;
    END IF;
	
	mv_full_name := 'base_pricing_restaurant.' || mv_name;

    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %s CASCADE', mv_full_name);

    sql_query := format(
    $query$   
    CREATE MATERIALIZED VIEW %s AS
    WITH bp_price_reco_fin_raw AS (
        SELECT
            fin.product_id,
            fin.store_ids,
            fin.strategy_id,
            fin.segment_id,
            fin.segment_name,
            fin.channel_id,
            fin.price_change_reason,
			fin.source,
            sd.strategy_name,
            sd.strategy_status_display_name
        FROM base_pricing_restaurant.bp_price_reco_finalized_v2 fin
        INNER JOIN (
            SELECT
                bsm.strategy_id,
                bsm.strategy_name,
                ssl.strategy_status_display_name
            FROM base_pricing_restaurant.bp_strategy_master bsm
            INNER JOIN base_pricing_restaurant.bp_strategy_status_level ssl
                USING (strategy_status_id)
            WHERE visible_on_screen @> ARRAY['PRICE_CHANGE_DRIVERS']::varchar[]
        ) sd
            USING (strategy_id)
    ),
    unnested_data AS (
        SELECT
            finr.product_id,
            store_unnest::INTEGER AS store_id,
            finr.strategy_id,
            finr.segment_id,
            finr.segment_name,
            finr.channel_id,
            finr.price_change_reason,
			finr.source,
            finr.strategy_name,
            finr.strategy_status_display_name
        FROM
            bp_price_reco_fin_raw finr,
            LATERAL UNNEST(store_ids) AS store_unnest
    ),
    merged_data AS (
        SELECT
            ud.product_id,
            ud.store_id,
            ud.strategy_id,
            ud.segment_id,
            ud.segment_name,
            ud.channel_id,
            ud.price_change_reason,
			ud.source,
            ud.strategy_name,
            ud.strategy_status_display_name%s
        FROM unnested_data ud
        JOIN base_pricing_restaurant.bp_product_master pm ON ud.product_id = pm.product_id
        JOIN base_pricing_restaurant.bp_store_master sm ON ud.store_id = sm.store_id
    )
    SELECT * FROM merged_data;

    CREATE INDEX idx_temp_price_change_driver_strategy_id
        ON %s USING btree(strategy_id);

    CREATE INDEX idx_temp_price_change_driver_product_id
        ON %s USING btree(product_id);

    CREATE INDEX idx_temp_price_change_driver_store_id
        ON %s USING btree(store_id);

    CREATE INDEX idx_temp_price_change_driver_segment_id
        ON %s USING btree(segment_id);
    $query$,
	mv_full_name,
    CASE WHEN final_select_clause != '' THEN ', ' || final_select_clause ELSE '' END,
	mv_full_name,
	mv_full_name,
	mv_full_name,
	mv_full_name
    );
    
    RAISE NOTICE 'Creating Materialized View: %', sql_query;
    EXECUTE sql_query;

    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating the MV: %', end_time - start_time;
    
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, mv_full_name, start_time, end_time, end_time - start_time);
    
END;
$procedure$
;
