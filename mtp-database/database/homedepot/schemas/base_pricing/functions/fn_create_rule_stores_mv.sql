--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:fn_create_rule_stores_mv_new_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_create_rule_stores_mv_new_v1

DROP FUNCTION IF EXISTS base_pricing.fn_create_rule_stores_mv();

CREATE OR REPLACE FUNCTION base_pricing.fn_create_rule_stores_mv()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    lvl RECORD;
    cols TEXT = '';
    mv_sql TEXT;
BEGIN
    -- Build the dynamic columns for each store hierarchy level
    FOR lvl IN
        SELECT store_hierarchy_level_id
        FROM base_pricing.bp_store_hierarchy_level
        ORDER BY store_hierarchy_level_id
    LOOP
        cols := cols || format(
            ', ARRAY_AGG(DISTINCT t.s%s_cid) AS s%s_ids',
            lvl.store_hierarchy_level_id,
            lvl.store_hierarchy_level_id
        );
    END LOOP;

    -- Drop the MV if it exists
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS base_pricing.mv_rule_stores_hierarchy_agg_data';
    -- Compose the CREATE MATERIALIZED VIEW statement
    mv_sql := format($fmt$
        CREATE MATERIALIZED VIEW base_pricing.mv_rule_stores_hierarchy_agg_data AS
        SELECT
            t.rule_id
            %s
        FROM
            base_pricing.bp_rule_stores_mapping t
        GROUP BY
            t.rule_id
        ORDER BY
            t.rule_id;
    $fmt$, cols);

    -- Execute the dynamic SQL to create the MV
    EXECUTE mv_sql;
END;
$function$
;
