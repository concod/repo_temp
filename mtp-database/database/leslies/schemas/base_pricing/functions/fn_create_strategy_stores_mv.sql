--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_create_strategy_stores_mv_12 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_create_strategy_stores_mv_12

DROP FUNCTION IF EXISTS base_pricing.fn_create_strategy_stores_mv;

CREATE OR REPLACE FUNCTION base_pricing.fn_create_strategy_stores_mv()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    lvl RECORD;
    cols TEXT := '';
    mv_sql TEXT;
BEGIN
    -- Loop over all store hierarchy levels to build the dynamic columns
    FOR lvl IN
        SELECT store_hierarchy_level_id
        FROM base_pricing.bp_store_hierarchy_level
        ORDER BY store_hierarchy_level_id
    LOOP
        cols := cols || format(
            ', ARRAY_AGG(DISTINCT st.s%s_cid) FILTER (WHERE st.s%s_cid IS NOT NULL) AS s%s_ids',
            lvl.store_hierarchy_level_id,
            lvl.store_hierarchy_level_id,
            lvl.store_hierarchy_level_id
        );
    END LOOP;

    -- Drop the MV if it exists
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS base_pricing.mv_strategy_stores_hierarchy_agg_data';
    
    -- Compose the CREATE MATERIALIZED VIEW statement
    mv_sql := format($fmt$
        CREATE MATERIALIZED VIEW base_pricing.mv_strategy_stores_hierarchy_agg_data AS
        SELECT
            s.strategy_id
            %s
        FROM
            (
                SELECT strategy_id, store_id
                FROM base_pricing.bp_strategy_products_stores
                GROUP BY strategy_id, store_id
            ) s
        JOIN
            base_pricing.bp_store_master st
            ON s.store_id = st.store_id
        GROUP BY
            s.strategy_id
        WITH DATA
    $fmt$, cols);

    -- Execute the dynamic SQL
    EXECUTE mv_sql;
    
    -- Create index on strategy_id
    EXECUTE 'CREATE INDEX idx_mv_strategy_stores_hierarchy_agg_data_strategy_id ON base_pricing.mv_strategy_stores_hierarchy_agg_data (strategy_id)';
END;
$function$
;