-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:final_build_view_creation_query_modification_04  runOnChange:true stripComments:false splitStatements:false context:final_build_view_creation_query_modification_04 labels:final_build_view_creation_query_modification_04
-- comment: update changeset for final_build_view_creation_query_modification_04 with ly_value changes


-- PostgreSQL function to build materialized view creation query
-- This function creates the complex SQL for materialized view creation
-- that was previously built in Rust code, and returns the generated query
--
-- Usage: SELECT size_smart.build_view_creation_query(size_profile_id, view_name, rule_config_id, tag, levels);
-- Parameters:
--   - size_profile_id_param: INTEGER - The size profile ID
--   - view_name_param: TEXT - The name of the materialized view to create
--   - rule_config_id_param: INTEGER - The rule configuration ID
--   - tag_param: TEXT - The tag for the rule
--   - levels_param: JSONB - Optional JSON object for filtering levels
-- Returns: TEXT (the generated SQL query for creating the materialized view)
--
-- The levels_param should be a JSON object where keys are column names and values are arrays of strings
-- Example: '{"l0_name": ["Women"], "l1_name": ["Footwear", "Apparel"]}'
--
-- To deploy this function, run this SQL script in your PostgreSQL database
--
-- Note: This function returns the query but does not execute it

DROP FUNCTION IF EXISTS size_smart.build_view_creation_query(INTEGER, TEXT, INTEGER, TEXT, JSONB);

CREATE OR REPLACE FUNCTION size_smart.build_view_creation_query(
    size_profile_id_param INTEGER,
    view_name_param TEXT,
    rule_config_id_param INTEGER,
    tag_param TEXT,
    levels_param JSONB DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
security definer 
AS $$
DECLARE
    where_clause TEXT := '';
    conditions TEXT[] := ARRAY[]::TEXT[];
    key TEXT;
    value_array JSONB;
    condition_part TEXT;
    escaped_values TEXT[] := ARRAY[]::TEXT[];
    array_element JSONB;
    string_value TEXT;
    final_query TEXT;
BEGIN
    -- Build WHERE clause from levels JSON (equivalent to build_where_clause in Rust)
    IF levels_param IS NOT NULL AND jsonb_typeof(levels_param) = 'object' THEN
        FOR key, value_array IN SELECT * FROM jsonb_each(levels_param)
        LOOP
            IF jsonb_typeof(value_array) = 'array' THEN
                escaped_values := ARRAY[]::TEXT[];
                
                -- Extract string values from the array and escape them
                FOR array_element IN SELECT jsonb_array_elements(value_array)
                LOOP
                    IF jsonb_typeof(array_element) = 'string' THEN
                        string_value := array_element #>> '{}';  -- Extract string value
                        -- Escape single quotes by doubling them
                        string_value := REPLACE(string_value, '''', '''''');
                        escaped_values := array_append(escaped_values, '''' || string_value || '''');
                    END IF;
                END LOOP;
                
                -- If we have values, create the condition
                IF array_length(escaped_values, 1) > 0 THEN
                    condition_part := format('%I = ANY(ARRAY[%s])', key, array_to_string(escaped_values, ', '));
                    conditions := array_append(conditions, condition_part);
                END IF;
            END IF;
        END LOOP;
        
        -- Build final WHERE clause
        IF array_length(conditions, 1) > 0 THEN
            where_clause := 'WHERE ' || array_to_string(conditions, ' AND ');
        END IF;
    END IF;
    
    -- Build the complete materialized view query
    
    final_query := format('CREATE MATERIALIZED VIEW %s AS 
            WITH base_data AS (
                SELECT * FROM size_smart.mv_hierarchy_size_ranges %s
            ),
            active_ruleset_size_ranges AS (
                SELECT 
                    rc.id as ruleset_id,
                    rcsr.size_config_mst_id as size_range_id,
                    rcfg.id as rule_config_id,
                    rcfg.tag as rule_tag
                FROM size_smart.tb_ruleset_config rc
                JOIN size_smart.tb_rule_config rcfg ON rcfg.id = rc.rule_config_id
                JOIN size_smart.tb_ruleset_config_size_range rcsr ON rcsr.ruleset_config_id = rc.id
                WHERE rc.status = ''Active''
                    AND rcfg.status = ''Active''
                    AND rc.rule_config_id = %s
            ),
            master_fallback_ruleset_size_ranges AS (
                SELECT 
                    rc.id as ruleset_id,
                    rcsr.size_config_mst_id as size_range_id,
                    rcfg.id as rule_config_id,
                    rcfg.tag as rule_tag
                FROM size_smart.tb_ruleset_config rc
                JOIN size_smart.tb_rule_config rcfg ON rcfg.id = rc.rule_config_id
                JOIN size_smart.tb_ruleset_config_size_range rcsr ON rcsr.ruleset_config_id = rc.id
                WHERE rc.status = ''Active''
                    AND rcfg.status = ''Active''
                    AND rcfg.tag = ''master''
                    AND NOT EXISTS (SELECT 1 FROM active_ruleset_size_ranges)
            ),
            ruleset_size_ranges AS (
                SELECT ruleset_id, size_range_id, rule_config_id, rule_tag FROM active_ruleset_size_ranges
                UNION ALL
                SELECT ruleset_id, size_range_id, rule_config_id, rule_tag FROM master_fallback_ruleset_size_ranges
            ),
            escalation_level_data AS (
                SELECT 
                    rcel.ruleset_config_id,
                    rcel."order",
                    ph."values" || jsonb_build_array(COALESCE(sh.name, ''''::character varying)) AS escalation_level
                FROM size_smart.tb_ruleset_config_escalation_level rcel
                JOIN size_smart.tb_escalation_level el_1 ON el_1.id = rcel.escalation_level_id
                JOIN size_smart.tb_product_hierarchy ph ON ph.id = el_1.product_hierarchy_id
                LEFT JOIN size_smart.tb_store_hierarchy sh ON sh.id = el_1.store_hierarchy_id
                WHERE rcel.ruleset_config_id IN (SELECT DISTINCT ruleset_id FROM ruleset_size_ranges WHERE ruleset_id IS NOT NULL)
            ),
            escalation_levels AS (
                SELECT 
                    escalation_level_data.ruleset_config_id AS ruleset_id,
                    COALESCE(jsonb_agg(escalation_level_data.escalation_level ORDER BY escalation_level_data."order"), ''[]''::jsonb) AS escalation_levels
                FROM escalation_level_data
                GROUP BY escalation_level_data.ruleset_config_id
            ),
            size_ranges AS (
                SELECT 
                    rs.ruleset_id,
                    rs.size_range_id,
                    CASE
                        WHEN rs.rule_tag = ''master'' THEN ''[]''::jsonb
                        ELSE jsonb_agg(DISTINCT COALESCE(s.name, ''''::character varying)) FILTER (WHERE s.name IS NOT NULL)
                    END AS size_ranges
                FROM ruleset_size_ranges rs
                LEFT JOIN size_smart.tb_size_config sc ON sc.size_master_id = rs.size_range_id
                LEFT JOIN size_smart.tb_size s ON s.id = sc.size_id
                GROUP BY rs.ruleset_id, rs.size_range_id, rs.rule_tag
            ),
            product_attribute_counts AS (
                SELECT 
                    rcpa.ruleset_config_id,
                    COUNT(*) AS attribute_count
                FROM size_smart.tb_ruleset_config_product_attribute rcpa
                WHERE rcpa.ruleset_config_id IN (SELECT DISTINCT ruleset_id FROM ruleset_size_ranges WHERE ruleset_id IS NOT NULL)
                GROUP BY rcpa.ruleset_config_id
            ),
            ruleset_hierarchy AS (
                SELECT DISTINCT 
                    rs.ruleset_id,
                    b.l0_name, b.l1_name, b.l2_name, b.l3_name, b.l4_name, 
                    b.l5_name, b.l6_name, b.l7_name, b.l8_name
                FROM ruleset_size_ranges rs
                JOIN base_data b ON b.size_range_id = rs.size_range_id
                WHERE rs.ruleset_id IS NOT NULL
            ),
            product_attribute_hierarchy_matches AS (
                SELECT 
                    rcpa.ruleset_config_id,
                    rcpa.id AS attribute_row_id,
                    rcpa.product_attribute_level,
                    rcpa.product_attribute_values,
                    rh.l0_name, rh.l1_name, rh.l2_name, rh.l3_name, rh.l4_name,
                    rh.l5_name, rh.l6_name, rh.l7_name, rh.l8_name,
                    CASE 
                        WHEN rcpa.product_attribute_level IS NULL THEN 0
                        ELSE (
                            CASE WHEN rcpa.product_attribute_level->''l0_name'' IS NULL OR rcpa.product_attribute_level ->> ''l0_name'' = COALESCE(rh.l0_name, '''''''') THEN 1 ELSE 0 END +
                            CASE WHEN rcpa.product_attribute_level->''l1_name'' IS NULL OR rcpa.product_attribute_level ->> ''l1_name'' = COALESCE(rh.l1_name, '''''''') THEN 1 ELSE 0 END +
                            CASE WHEN rcpa.product_attribute_level->''l2_name'' IS NULL OR rcpa.product_attribute_level ->> ''l2_name'' = COALESCE(rh.l2_name, '''''''') THEN 1 ELSE 0 END +
                            CASE WHEN rcpa.product_attribute_level->''l3_name'' IS NULL OR rcpa.product_attribute_level ->> ''l3_name'' = COALESCE(rh.l3_name, '''''''') THEN 1 ELSE 0 END +
                            CASE WHEN rcpa.product_attribute_level->''l4_name'' IS NULL OR rcpa.product_attribute_level ->> ''l4_name'' = COALESCE(rh.l4_name, '''''''') THEN 1 ELSE 0 END +
                            CASE WHEN rcpa.product_attribute_level->''l5_name'' IS NULL OR rcpa.product_attribute_level ->> ''l5_name'' = COALESCE(rh.l5_name, '''''''') THEN 1 ELSE 0 END +
                            CASE WHEN rcpa.product_attribute_level->''l6_name'' IS NULL OR rcpa.product_attribute_level ->> ''l6_name'' = COALESCE(rh.l6_name, '''''''') THEN 1 ELSE 0 END +
                            CASE WHEN rcpa.product_attribute_level->''l7_name'' IS NULL OR rcpa.product_attribute_level ->> ''l7_name'' = COALESCE(rh.l7_name, '''''''') THEN 1 ELSE 0 END +
                            CASE WHEN rcpa.product_attribute_level->''l8_name'' IS NULL OR rcpa.product_attribute_level ->> ''l8_name'' = COALESCE(rh.l8_name, '''''''') THEN 1 ELSE 0 END
                        )
                    END AS hierarchy_match_score
                FROM size_smart.tb_ruleset_config_product_attribute rcpa
                JOIN ruleset_hierarchy rh ON rh.ruleset_id = rcpa.ruleset_config_id
                JOIN product_attribute_counts pac ON pac.ruleset_config_id = rcpa.ruleset_config_id
                WHERE pac.attribute_count > 1
            ),
            best_product_attributes AS (
                SELECT DISTINCT 
                    pahm.ruleset_config_id,
                    FIRST_VALUE(pahm.attribute_row_id) OVER (
                        PARTITION BY pahm.ruleset_config_id, pahm.l0_name, pahm.l1_name, pahm.l2_name, pahm.l3_name, pahm.l4_name, pahm.l5_name, pahm.l6_name, pahm.l7_name, pahm.l8_name
                        ORDER BY pahm.hierarchy_match_score DESC, pahm.attribute_row_id DESC
                    ) AS best_attribute_row_id,
                    FIRST_VALUE(pahm.product_attribute_values) OVER (
                        PARTITION BY pahm.ruleset_config_id, pahm.l0_name, pahm.l1_name, pahm.l2_name, pahm.l3_name, pahm.l4_name, pahm.l5_name, pahm.l6_name, pahm.l7_name, pahm.l8_name
                        ORDER BY pahm.hierarchy_match_score DESC, pahm.attribute_row_id DESC
                    ) AS best_product_attribute_values
                FROM product_attribute_hierarchy_matches pahm
            ),
            product_attributes AS (
                SELECT 
                    rcpa.ruleset_config_id,
                    COALESCE(rcpa.product_attribute_values, ''{}''::jsonb) AS attrs
                FROM size_smart.tb_ruleset_config_product_attribute rcpa
                JOIN product_attribute_counts pac ON pac.ruleset_config_id = rcpa.ruleset_config_id
                WHERE pac.attribute_count = 1
                AND rcpa.ruleset_config_id IN (SELECT DISTINCT ruleset_id FROM ruleset_size_ranges WHERE ruleset_id IS NOT NULL)
                
                UNION ALL
                
                SELECT 
                    bpa.ruleset_config_id,
                    COALESCE(bpa.best_product_attribute_values, ''{}''::jsonb) AS attrs
                FROM best_product_attributes bpa
            ),
            final_attributes AS (
                SELECT 
                    rs.ruleset_id,
                    CASE
                        WHEN rs.rule_tag = ''master'' THEN ''{}''::jsonb
                        ELSE COALESCE(pa.attrs, ''{}''::jsonb)
                    END AS attributes
                FROM ruleset_size_ranges rs
                LEFT JOIN product_attributes pa ON pa.ruleset_config_id = rs.ruleset_id
                GROUP BY rs.ruleset_id, pa.attrs, rs.rule_tag
            ),
            ly_values AS (
                SELECT 
                    rs.ruleset_id,
                    COALESCE((
                        SELECT SUM(t.weightage)
                        FROM size_smart.tb_ruleset_timeline rt2
                        JOIN size_smart.tb_timeline t ON t.id = rt2.timeline_id
                        WHERE rt2.ruleset_config_id = rs.ruleset_id
                        AND t.time_value IN (''LY'', ''LLY'')
                    ), 0) AS ly_value
                FROM ruleset_size_ranges rs
                GROUP BY rs.ruleset_id
            ),
            timelines AS (
                SELECT DISTINCT 
                    rs.ruleset_id,
                    jsonb_build_object(
                        ''TY'', 
                        COALESCE((
                            SELECT jsonb_agg(
                                jsonb_build_array(
                                    to_char(
                                        CASE 
                                            -- When time_value contains the word "dynamic", use current date as start_date
                                            WHEN LOWER(COALESCE(t.time_value, '''')) LIKE ''%%dynamic%%'' 
                                                 AND COALESCE(t.time_value, '''') NOT IN (''LY'', ''LLY'') 
                                            THEN CURRENT_DATE
                                            ELSE COALESCE(t.start_date, CURRENT_DATE)
                                        END::timestamp with time zone, 
                                        ''YYYY-MM-DD''::text
                                    ),
                                    to_char(
                                        CASE 
                                            -- When time_value contains the word "dynamic", calculate end_date dynamically
                                            -- by adding the original duration to current date
                                            WHEN LOWER(COALESCE(t.time_value, '''')) LIKE ''%%dynamic%%'' 
                                                 AND COALESCE(t.time_value, '''') NOT IN (''LY'', ''LLY'') 
                                            THEN CURRENT_DATE + (COALESCE(t.end_date, CURRENT_DATE) - COALESCE(t.start_date, CURRENT_DATE))
                                            ELSE COALESCE(t.end_date, CURRENT_DATE)
                                        END::timestamp with time zone, 
                                        ''YYYY-MM-DD''::text
                                    ),
                                    COALESCE(t.weightage, 0::real)
                                )
                            )
                            FROM size_smart.tb_ruleset_timeline rt2
                            JOIN size_smart.tb_timeline t ON t.id = rt2.timeline_id
                            WHERE rt2.ruleset_config_id = rs.ruleset_id
                            AND COALESCE(t.time_value, '''') NOT IN (''LY'', ''LLY'')
                        ), jsonb_build_array(
                            jsonb_build_array(
                                to_char(CURRENT_DATE, ''YYYY-MM-DD''),
                                to_char(CURRENT_DATE, ''YYYY-MM-DD''),
                                1 - COALESCE(ly.ly_value, 0)
                            )
                        )),
                        ''LY'', COALESCE(ly.ly_value, 0)
                    ) AS timelines
                FROM ruleset_size_ranges rs
                JOIN ly_values ly ON ly.ruleset_id = rs.ruleset_id
                GROUP BY rs.ruleset_id, ly.ly_value
            )
            SELECT 
                b.l0_name AS l0_name,
                b.l1_name AS l6_name,
                b.l2_name AS l1_name,
                b.l4_name AS global_fit_platform,
                b.l3_name,
                b.l5_name AS l4_name,
                b.l6_name AS l5_name,
                b.l7_name AS l7_code,
                b.l8_name AS display_article,
                b.size_range_id,
                COALESCE(rs.rule_config_id, %s) AS rule_id,
                COALESCE(rs.rule_tag, %L) AS rule_tag,
                %s AS size_profile_id,
                COALESCE(rs.ruleset_id, -1) as ruleset_id,
                CASE 
                    WHEN el.escalation_levels IS NOT NULL AND el.escalation_levels != ''[]''::jsonb THEN el.escalation_levels
                    ELSE COALESCE(be.best_escalation::jsonb, ''[]''::jsonb)
                END AS escalation_level,
                COALESCE(sr.size_ranges, ''[]''::jsonb) as size_range,
                COALESCE(fa.attributes, ''{}''::jsonb) as attributes,
                COALESCE(t.timelines, ''{}''::jsonb) as timeline
            FROM base_data b
            LEFT JOIN ruleset_size_ranges rs ON rs.size_range_id = b.size_range_id
            LEFT JOIN escalation_levels el ON el.ruleset_id = rs.ruleset_id
            LEFT JOIN size_smart.tb_best_escalation be ON (
                be.l0_name = b.l0_name 
                AND be.l2_name = b.l2_name 
                AND be.l3_name = b.l3_name
            )
            LEFT JOIN size_ranges sr ON sr.ruleset_id = rs.ruleset_id AND sr.size_range_id = rs.size_range_id
            LEFT JOIN final_attributes fa ON fa.ruleset_id = rs.ruleset_id
            LEFT JOIN timelines t ON t.ruleset_id = rs.ruleset_id
            WHERE COALESCE(rs.ruleset_id, -1) != -1',
        view_name_param,
        where_clause,
        rule_config_id_param,
        rule_config_id_param,
        tag_param,
        size_profile_id_param
    );
    
    -- Return the generated query instead of executing it
    RETURN final_query;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error building query for view %: %', view_name_param, SQLERRM;
END;
$$;

-- Grant execute permission to the application role (adjust as needed for your setup)
-- GRANT EXECUTE ON FUNCTION size_smart.build_view_creation_query(INTEGER, TEXT, INTEGER, TEXT, JSONB) TO your_app_role;