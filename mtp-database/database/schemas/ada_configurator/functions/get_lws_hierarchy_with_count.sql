--liquibase formatted sql
--changeset priyansh.gautam@impactanalytics.co:get_lws_hierarchy_with_count1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-89055
--comment: initial changeset for get_lws_hierarchy_with_count
--rollback: SELECT 1

DROP FUNCTION IF EXISTS ada_configurator.get_lws_hierarchy_with_count(int4);

CREATE OR REPLACE FUNCTION ada_configurator.get_lws_hierarchy_with_count(p_lws_id integer)
 RETURNS TABLE(original_lws_id integer, original_lws_name text, parent_lws_id integer, parent_lws_name text, grandparent_lws_id integer, grandparent_lws_name text, condition_string text, product_count bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_count_query TEXT;
    v_condition TEXT;
    v_count BIGINT := 0;
BEGIN
    RETURN QUERY
    WITH hierarchy AS (
        -- Get hierarchy information efficiently with proper joins
        SELECT 
            lm1.lws_level_id AS h_original_lws_id,
            ll1.lws_level_name AS h_original_lws_name,
            lm1.parent_lws_level_id AS h_parent_lws_id,
            ll2.lws_level_name AS h_parent_lws_name,
            lm2.parent_lws_level_id AS h_grandparent_lws_id,
            ll3.lws_level_name AS h_grandparent_lws_name
        FROM ada_configurator.lws_mapping lm1
        LEFT JOIN ada_configurator.lws_level ll1 ON lm1.lws_level_id = ll1.lws_id
        LEFT JOIN ada_configurator.lws_level ll2 ON lm1.parent_lws_level_id = ll2.lws_id
        LEFT JOIN ada_configurator.lws_mapping lm2 ON lm1.parent_lws_level_id = lm2.lws_level_id
        LEFT JOIN ada_configurator.lws_level ll3 ON lm2.parent_lws_level_id = ll3.lws_id
        WHERE lm1.lws_level_id = p_lws_id
    ),
    lws_ids AS (
        -- Efficient deduplication using UNION
        SELECT h_original_lws_id AS lws_id FROM hierarchy WHERE h_original_lws_id IS NOT NULL
        UNION
        SELECT h_parent_lws_id FROM hierarchy WHERE h_parent_lws_id IS NOT NULL
        UNION
        SELECT h_grandparent_lws_id FROM hierarchy WHERE h_grandparent_lws_id IS NOT NULL
    ),
    product_conditions AS (
        -- Optimized product conditions with filtering before aggregation
        SELECT 
            'paf.' || twopl.product_level_name || ' IN (' || 
            string_agg(quote_literal(val), ', ' ORDER BY val) || 
            ')' AS condition
        FROM ada_configurator.workstream_output_product_level_names twopl
        JOIN lws_ids ON twopl.lws_level_id = lws_ids.lws_id
        CROSS JOIN LATERAL unnest(twopl.level_value) AS val
        WHERE twopl.level_value IS NOT NULL
          AND array_length(twopl.level_value, 1) > 0
          AND val IS NOT NULL
        GROUP BY twopl.product_level_name
    ),
    store_conditions AS (
        -- Optimized store conditions with filtering before aggregation
        SELECT 
            'saf.' || twosl.store_level_name || ' IN (' || 
            string_agg(quote_literal(val), ', ' ORDER BY val) || 
            ')' AS condition
        FROM ada_configurator.workstream_output_store_level_names twosl
        JOIN lws_ids ON twosl.lws_level_id = lws_ids.lws_id
        CROSS JOIN LATERAL unnest(twosl.level_value) AS val
        WHERE twosl.level_value IS NOT NULL
          AND array_length(twosl.level_value, 1) > 0
          AND val IS NOT NULL
        GROUP BY twosl.store_level_name
    ),
    all_conditions AS (
        -- Combine all conditions
        SELECT condition FROM product_conditions
        UNION ALL
        SELECT condition FROM store_conditions
    ),
    final_condition AS (
        -- Efficient single aggregation
        SELECT 
            CASE 
                WHEN COUNT(*) = 0 THEN '(true)'
                ELSE string_agg(condition, ' AND ')
            END AS final_conditions
        FROM all_conditions
    )
    SELECT 
        h.h_original_lws_id,
        h.h_original_lws_name::TEXT,
        h.h_parent_lws_id,
        h.h_parent_lws_name::TEXT,
        h.h_grandparent_lws_id,
        h.h_grandparent_lws_name::TEXT,
        fc.final_conditions::TEXT,
        v_count as product_count
    FROM hierarchy h
    CROSS JOIN final_condition fc;
END;
$function$;