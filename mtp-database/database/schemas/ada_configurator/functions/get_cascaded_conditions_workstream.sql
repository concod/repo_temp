--liquibase formatted sql
--changeset priyansh.gautam@impactanalytics.co:get_cascaded_conditions_workstream1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-89055
--comment: initial changeset for get_cascaded_conditions_workstream
--rollback: SELECT 1

DROP FUNCTION IF EXISTS ada_configurator.get_cascaded_conditions_workstream(text, int4, int4);

CREATE OR REPLACE FUNCTION ada_configurator.get_cascaded_conditions_workstream(p_dimension text, p_grouping_id integer, p_lws_id integer DEFAULT 0)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_dimension_prefix TEXT;
    v_dimension_table TEXT;
    v_level_name_column TEXT;
    v_schema_table TEXT;
    v_query TEXT;
    v_result TEXT;
BEGIN
    -- Set dimension-specific values
    IF p_dimension = 'store' THEN
        v_dimension_prefix := 'saf';
        v_dimension_table := 'workstream_output_store_level_names';
        v_level_name_column := 'store_level_name';
        v_schema_table := 'store_generic_schema_mapping';
    ELSIF p_dimension = 'product' THEN
        v_dimension_prefix := 'paf';
        v_dimension_table := 'workstream_output_product_level_names';
        v_level_name_column := 'product_level_name';
        v_schema_table := 'product_generic_schema_mapping';
    ELSE
        RAISE EXCEPTION 'Invalid dimension: %. Must be "store" or "product"', p_dimension;
    END IF;

    -- Build the dynamic SQL query
    v_query := format($dq$
    WITH lws_mapping AS ( 
        SELECT lws_mapping_id 
        FROM ada_configurator.workstream_level
        WHERE grouping_id = %1$s
    ), 
    parent_lws AS ( 
        SELECT tlm.parent_lws_level_id 
        FROM ada_configurator.lws_mapping tlm
        INNER JOIN lws_mapping lm ON lm.lws_mapping_id = tlm.lws_mapping_mapping_id
        WHERE tlm.parent_lws_level_id IS NOT NULL
    ),
    grandparent_lws AS ( 
        SELECT tlm.parent_lws_level_id 
        FROM ada_configurator.lws_mapping tlm 
        INNER JOIN parent_lws pl ON pl.parent_lws_level_id = tlm.lws_level_id
        WHERE tlm.parent_lws_level_id IS NOT NULL
    ),
    grouped_lws AS (
        SELECT tlm.lws_level_id 
        FROM ada_configurator.lws_mapping tlm
        INNER JOIN lws_mapping lm ON lm.lws_mapping_id = tlm.lws_mapping_mapping_id
        WHERE (%6$s = 0 OR tlm.lws_level_id <> %6$s)  -- Exclude p_lws_id if not 0
    ),
    -- Get all level names with their hierarchy values for grouped LWS
    level_hierarchies AS (
        SELECT 
            twopl.lws_level_id,
            twopl.%4$I AS level_name,
            twopl.level_value,
            h.hierarchy_level
        FROM ada_configurator.%2$I twopl
        INNER JOIN grouped_lws gl ON gl.lws_level_id = twopl.lws_level_id
        -- Join with the hierarchy mapping table
        INNER JOIN global.%5$I h ON h.generic_column_name = twopl.%4$I
        WHERE twopl.level_value IS NOT NULL 
        AND array_length(twopl.level_value, 1) > 0
    ),
    -- Select only the highest hierarchy level for each LWS
    highest_level_per_lws AS (
        SELECT 
            lws_level_id,
            level_name,
            level_value
        FROM (
            SELECT 
                lws_level_id,
                level_name,
                level_value,
                hierarchy_level,
                ROW_NUMBER() OVER (PARTITION BY lws_level_id ORDER BY hierarchy_level DESC) as rn
            FROM level_hierarchies
        ) ranked
        WHERE rn = 1  -- Only keep the highest ranked level for each LWS
    ),
    -- Parent conditions (IN clauses)
    parent_conditions AS ( 
        SELECT 
            '%3$s.' || dimension_data.level_column || ' IN (' || 
            string_agg(quote_literal(val), ', ' ORDER BY val) || 
            ')' AS condition
        FROM (
            SELECT 
                twopl.%4$I AS level_column,
                unnest(twopl.level_value) AS val
            FROM ada_configurator.%2$I twopl
            INNER JOIN parent_lws pl ON pl.parent_lws_level_id = twopl.lws_level_id
            WHERE twopl.level_value IS NOT NULL 
            AND array_length(twopl.level_value, 1) > 0
        ) AS dimension_data
        WHERE val IS NOT NULL
        GROUP BY dimension_data.level_column
    ),
    -- Grandparent conditions (IN clauses)
    grandparent_conditions AS ( 
        SELECT 
            '%3$s.' || dimension_data.level_column || ' IN (' || 
            string_agg(quote_literal(val), ', ' ORDER BY val) || 
            ')' AS condition
        FROM (
            SELECT 
                twopl.%4$I AS level_column,
                unnest(twopl.level_value) AS val
            FROM ada_configurator.%2$I twopl
            INNER JOIN grandparent_lws pl ON pl.parent_lws_level_id = twopl.lws_level_id
            WHERE twopl.level_value IS NOT NULL 
            AND array_length(twopl.level_value, 1) > 0
        ) AS dimension_data
        WHERE val IS NOT NULL
        GROUP BY dimension_data.level_column
    ),
    -- Grouped conditions using only the highest hierarchy level for each LWS
    grouped_conditions AS ( 
        SELECT 
            '%3$s.' || level_name || ' NOT IN (' || 
            string_agg(quote_literal(val), ', ' ORDER BY val) || 
            ')' AS condition
        FROM (
            SELECT 
                hlpl.level_name,
                unnest(hlpl.level_value) AS val
            FROM highest_level_per_lws hlpl
        ) AS filtered_data
        WHERE val IS NOT NULL
        GROUP BY level_name
    ),
    -- Combine all conditions
    all_conditions AS (
        SELECT condition FROM parent_conditions
        UNION ALL
        SELECT condition FROM grandparent_conditions
        UNION ALL
        SELECT condition FROM grouped_conditions
    ),
    -- Create final WHERE clause
    final_where_clause AS (
        SELECT 
            CASE 
                WHEN COUNT(*) = 0 THEN '(true)'
                ELSE '(' || string_agg(condition, ' AND ') || ')'
            END AS complete_condition
        FROM all_conditions
    )
    -- Select the final result
    SELECT complete_condition FROM final_where_clause;
    $dq$, 
    p_grouping_id,                -- %1$s: grouping_id
    v_dimension_table,            -- %2$I: dimension table name
    v_dimension_prefix,           -- %3$s: dimension prefix (saf/paf)
    v_level_name_column,          -- %4$I: level name column
    v_schema_table,               -- %5$I: schema mapping table
    p_lws_id                      -- %6$s: lws_id to exclude
    );

    -- Execute the query and get the result
    EXECUTE v_query INTO v_result;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error generating conditions: % Query: %', SQLERRM, v_query;
END;
$function$
;