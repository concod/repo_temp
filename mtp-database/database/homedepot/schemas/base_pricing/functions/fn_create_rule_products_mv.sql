--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:fn_create_rule_products_mv_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_create_rule_products_mv_v1

DROP FUNCTION IF EXISTS base_pricing.fn_create_rule_products_mv();

CREATE OR REPLACE FUNCTION base_pricing.fn_create_rule_products_mv()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    lvl RECORD;
    cols TEXT = '';
    mv_sql TEXT;
BEGIN
    -- Loop over all product hierarchy levels to build the dynamic columns
    FOR lvl IN
        SELECT product_hierarchy_level_id
        FROM base_pricing.bp_product_hierarchy_level
        ORDER BY product_hierarchy_level_id
    LOOP
        cols := cols || format(
            ', ARRAY_AGG(DISTINCT t.l%s_cid) AS l%s_ids',
            lvl.product_hierarchy_level_id,
            lvl.product_hierarchy_level_id
        );
    END LOOP;

    -- Drop the MV if it exists
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS base_pricing.mv_rule_products_hierarchy_agg_data';
    -- Compose the CREATE MATERIALIZED VIEW statement
    mv_sql := format($fmt$
        CREATE MATERIALIZED VIEW base_pricing.mv_rule_products_hierarchy_agg_data AS
        SELECT
            t.rule_id
            %s
        FROM
            base_pricing.bp_rule_products_mapping t
        GROUP BY
            t.rule_id
        ORDER BY
            t.rule_id;
    $fmt$, cols);

    -- Execute the dynamic SQL
    EXECUTE mv_sql;
END;
$function$
;