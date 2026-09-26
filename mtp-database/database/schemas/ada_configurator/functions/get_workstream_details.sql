--liquibase formatted sql
--changeset priyansh.gautam@impactanalytics.co:get_workstream_details1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-89055
--comment: initial changeset for get_workstream_details
--rollback: SELECT 1

DROP FUNCTION IF EXISTS ada_configurator.get_workstream_details(int4);

CREATE OR REPLACE FUNCTION ada_configurator.get_workstream_details(p_workstream_id integer)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_workstream_mapping_id INTEGER;
    v_result JSON;
BEGIN
    -- Step 1: Get workstream mapping ID
    SELECT workstream_mapping_id INTO v_workstream_mapping_id
    FROM ada_configurator.workstream
    WHERE workstream_id = p_workstream_id;
    
    IF v_workstream_mapping_id IS NULL THEN
        RAISE EXCEPTION 'Workstream ID % not found', p_workstream_id;
    END IF;
    
    -- Step 2: Build the complete result using CTEs
    WITH level_mapping AS (
        -- Get level IDs for this workstream mapping
        SELECT 
            workstream_mapping_id,
            workstream_level1_id,
            workstream_level2_id,
            workstream_level3_id
        FROM ada_configurator.workstream_level_mapping
        WHERE workstream_mapping_id = v_workstream_mapping_id
    ),
    level_data AS (
        -- Generate a row for each level with its position
        SELECT 1 AS level_num, workstream_level1_id AS level_id, workstream_mapping_id
        FROM level_mapping
        WHERE workstream_level1_id IS NOT NULL
        UNION ALL
        SELECT 2, workstream_level2_id, workstream_mapping_id
        FROM level_mapping
        WHERE workstream_level2_id IS NOT NULL
        UNION ALL
        SELECT 3, workstream_level3_id, workstream_mapping_id
        FROM level_mapping
        WHERE workstream_level3_id IS NOT NULL
    ),
    level_details AS (
        -- Get grouping ID and LWS mapping ID for each level
        SELECT 
            ld.level_num,
            ld.level_id AS workstream_level_id,
            wl.grouping_id,
            wl.lws_mapping_id,
            ld.workstream_mapping_id
        FROM level_data ld
        JOIN ada_configurator.workstream_level wl ON ld.level_id = wl.workstream_level_id
    ),
    -- Get the exact workstream_level_ids that should be selected
    selected_level_ids AS (
        SELECT workstream_level1_id, workstream_level2_id, workstream_level3_id
        FROM ada_configurator.workstream_level_mapping
        WHERE workstream_mapping_id = v_workstream_mapping_id
    ),
    other_levels AS (
        -- Get other levels in the same grouping with their workstream_mapping_id
        -- Ensure we're only including levels that are not selected at the same level
        SELECT 
            ld.level_num,
            ld.grouping_id,
            wl.workstream_level_id,
            wl.lws_mapping_id,
            COALESCE(
                (SELECT workstream_mapping_id 
                 FROM ada_configurator.workstream_level_mapping twlm 
                 WHERE (twlm.workstream_level1_id = wl.workstream_level_id OR
                        twlm.workstream_level2_id = wl.workstream_level_id OR
                        twlm.workstream_level3_id = wl.workstream_level_id)
                 LIMIT 1),
                ld.workstream_mapping_id
            ) AS workstream_mapping_id
        FROM level_details ld
        JOIN ada_configurator.workstream_level wl 
            ON ld.grouping_id = wl.grouping_id 
            AND ld.lws_mapping_id <> wl.lws_mapping_id
        WHERE ld.grouping_id IS NOT NULL
        AND wl.workstream_level_id NOT IN (
            SELECT workstream_level1_id FROM selected_level_ids WHERE workstream_level1_id IS NOT NULL
            UNION ALL
            SELECT workstream_level2_id FROM selected_level_ids WHERE workstream_level2_id IS NOT NULL
            UNION ALL
            SELECT workstream_level3_id FROM selected_level_ids WHERE workstream_level3_id IS NOT NULL
        )
    ),
    all_lws_mappings AS (
        -- Combine selected and other LWS mappings
        SELECT DISTINCT  -- Added DISTINCT to avoid duplicates
            level_num,
            'selected' AS selection_type,
            workstream_level_id,
            lws_mapping_id,
            workstream_mapping_id,
            grouping_id
        FROM level_details
        
        UNION ALL
        
        SELECT DISTINCT  -- Added DISTINCT to avoid duplicates
            level_num,
            'other' AS selection_type,
            workstream_level_id,
            lws_mapping_id,
            workstream_mapping_id,
            grouping_id
        FROM other_levels
    ),
    lws_ids AS (
        -- Get LWS IDs and parent IDs for all mappings
        SELECT 
            alm.level_num,
            alm.selection_type,
            alm.workstream_level_id,
            alm.lws_mapping_id,
            alm.workstream_mapping_id,
            alm.grouping_id,
            tlm.lws_level_id,
            tlm.parent_lws_level_id
        FROM all_lws_mappings alm
        JOIN ada_configurator.lws_mapping tlm ON alm.lws_mapping_id = tlm.lws_mapping_mapping_id
    ),
    -- Validate LWS exists to avoid including non-existent entries
    lws_names AS (
        -- Get LWS names
        SELECT 
            li.*,
            tll.lws_level_name
        FROM lws_ids li
        JOIN ada_configurator.lws_level tll ON li.lws_level_id = tll.lws_id
    ),
    sublevel_counts AS (
        -- Get counts of sublevels for each LWS
        SELECT 
            ln.lws_level_id,
            COUNT(tlm.lws_level_id) AS sublevel_count
        FROM lws_names ln
        LEFT JOIN ada_configurator.lws_mapping tlm ON tlm.parent_lws_level_id = ln.lws_level_id
        GROUP BY ln.lws_level_id
    ),
    dimension_data AS (
        -- Get dimension data for product and store levels
        SELECT 
            ln.lws_level_id,
            ln.level_num,
            ln.selection_type,
            ln.workstream_level_id,
            ln.lws_mapping_id,
            ln.workstream_mapping_id,
            ln.grouping_id,
            ln.parent_lws_level_id,
            ln.lws_level_name,
            sc.sublevel_count,
            COALESCE(
                (SELECT jsonb_object_agg(tpl.product_level_name, tpl.level_value)
                 FROM ada_configurator.workstream_output_product_level_names tpl
                 WHERE tpl.lws_level_id = ln.lws_level_id), 
                '{}'::jsonb
            ) AS product_level,
            COALESCE(
                (SELECT jsonb_object_agg(tsl.store_level_name, tsl.level_value)
                 FROM ada_configurator.workstream_output_store_level_names tsl
                 WHERE tsl.lws_level_id = ln.lws_level_id), 
                '{}'::jsonb
            ) AS store_level,
            (SELECT tw.workstream_id
             FROM ada_configurator.workstream tw
             WHERE tw.workstream_name = ln.lws_level_name
             LIMIT 1) AS workstream_id,
			(SELECT COALESCE(
                (SELECT COUNT(*) = 0
                FROM jsonb_each_text(
                    COALESCE((SELECT jsonb_object_agg(tpl.product_level_name, tpl.level_value)
                     FROM ada_configurator.workstream_output_product_level_names tpl
                     WHERE tpl.lws_level_id = ln.lws_level_id), '{}'::jsonb) || 
                    COALESCE((SELECT jsonb_object_agg(tsl.store_level_name, tsl.level_value)
                     FROM ada_configurator.workstream_output_store_level_names tsl
                     WHERE tsl.lws_level_id = ln.lws_level_id), '{}'::jsonb)
                ) AS t(k, v)
                WHERE v::jsonb <> '[]'::jsonb AND v::jsonb <> 'null'::jsonb),
                TRUE
            )) AS is_wx
        FROM lws_names ln
        JOIN sublevel_counts sc ON ln.lws_level_id = sc.lws_level_id
    ),
    final_result AS (
        -- Assemble the final result structure
        SELECT 
            jsonb_build_object(
                'level_1', (
                    SELECT jsonb_build_object(
                        'selected', COALESCE(
                            (SELECT jsonb_agg(
                                jsonb_build_object(
                                    dd.lws_level_id::text, 
                                    jsonb_build_object(
                                        'lws_name', CASE WHEN dd.is_wx THEN 'Workstream X ' || dd.lws_level_name ELSE dd.lws_level_name END,
                                        'lws_mapping_id', dd.lws_mapping_id,
                                        'workstream_level_id', dd.workstream_level_id,
                                        'workstream_mapping_id', dd.workstream_mapping_id,
                                        'parent_lws_id', dd.parent_lws_level_id,
                                        'grouping_id', dd.grouping_id,
                                        'product_level', dd.product_level,
                                        'store_level', dd.store_level,
                                        'category', (
                                            SELECT 
                                                CASE
                                                    WHEN (
                                                        jsonb_typeof(dd.product_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.product_level)) > 0 AND
                                                        jsonb_typeof(dd.store_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.store_level)) > 0
                                                    ) THEN 'product_level & store_level'
                                                    WHEN (
                                                        jsonb_typeof(dd.product_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.product_level)) > 0
                                                    ) THEN 'product_level'
                                                    WHEN (
                                                        jsonb_typeof(dd.store_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.store_level)) > 0
                                                    ) THEN 'store_level'
                                                    ELSE 'product_level & store_level'
                                                END
                                        ),
                                        'is_wx', dd.is_wx,
                                        'sublevels', dd.sublevel_count,
                                        'workstream_id', dd.workstream_id
                                    )
                                )
                            )
                            FROM dimension_data dd
                            WHERE dd.level_num = 1 AND dd.selection_type = 'selected'),
                            '[]'::jsonb
                        ),
                        'other', COALESCE(
                            (SELECT jsonb_agg(
                                jsonb_build_object(
                                    dd.lws_level_id::text, 
                                    jsonb_build_object(
                                        'lws_name', CASE WHEN dd.is_wx THEN 'Workstream X ' || dd.lws_level_name ELSE dd.lws_level_name END,
                                        'lws_mapping_id', dd.lws_mapping_id,
                                        'workstream_level_id', dd.workstream_level_id,
                                        'workstream_mapping_id', dd.workstream_mapping_id,
                                        'parent_lws_id', dd.parent_lws_level_id,
                                        'grouping_id', dd.grouping_id,
                                        'product_level', dd.product_level,
                                        'store_level', dd.store_level,
                                        'category', (
                                            SELECT 
                                                CASE
                                                    WHEN (
                                                        jsonb_typeof(dd.product_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.product_level)) > 0 AND
                                                        jsonb_typeof(dd.store_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.store_level)) > 0
                                                    ) THEN 'product_level & store_level'
                                                    WHEN (
                                                        jsonb_typeof(dd.product_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.product_level)) > 0
                                                    ) THEN 'product_level'
                                                    WHEN (
                                                        jsonb_typeof(dd.store_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.store_level)) > 0
                                                    ) THEN 'store_level'
                                                    ELSE 'product_level & store_level'
                                                END
                                        ),
                                        'is_wx', dd.is_wx,
                                        'sublevels', dd.sublevel_count,
                                        'workstream_id', dd.workstream_id
                                    )
                                )
                            )
                            FROM dimension_data dd
                            WHERE dd.level_num = 1 AND dd.selection_type = 'other'),
                            '[]'::jsonb
                        )
                    )
                ),
                'level_2', (
                    SELECT jsonb_build_object(
                        'selected', COALESCE(
                            (SELECT jsonb_agg(
                                jsonb_build_object(
                                    dd.lws_level_id::text, 
                                    jsonb_build_object(
                                        'lws_name', CASE WHEN dd.is_wx THEN 'Workstream X ' || dd.lws_level_name ELSE dd.lws_level_name END,
                                        'lws_mapping_id', dd.lws_mapping_id,
                                        'workstream_level_id', dd.workstream_level_id,
                                        'workstream_mapping_id', dd.workstream_mapping_id,
                                        'parent_lws_id', dd.parent_lws_level_id,
                                        'grouping_id', dd.grouping_id,
                                        'product_level', dd.product_level,
                                        'store_level', dd.store_level,
                                        'category', (
                                            SELECT 
                                                CASE
                                                    WHEN (
                                                        jsonb_typeof(dd.product_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.product_level)) > 0 AND
                                                        jsonb_typeof(dd.store_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.store_level)) > 0
                                                    ) THEN 'product_level & store_level'
                                                    WHEN (
                                                        jsonb_typeof(dd.product_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.product_level)) > 0
                                                    ) THEN 'product_level'
                                                    WHEN (
                                                        jsonb_typeof(dd.store_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.store_level)) > 0
                                                    ) THEN 'store_level'
                                                    ELSE 'product_level & store_level'
                                                END
                                        ),
                                        'is_wx', dd.is_wx,
                                        'sublevels', dd.sublevel_count,
                                        'workstream_id', dd.workstream_id
                                    )
                                )
                            )
                            FROM dimension_data dd
                            WHERE dd.level_num = 2 AND dd.selection_type = 'selected'),
                            '[]'::jsonb
                        ),
                        'other', COALESCE(
                            (SELECT jsonb_agg(
                                jsonb_build_object(
                                    dd.lws_level_id::text, 
                                    jsonb_build_object(
                                        'lws_name', CASE WHEN dd.is_wx THEN 'Workstream X ' || dd.lws_level_name ELSE dd.lws_level_name END,
                                        'lws_mapping_id', dd.lws_mapping_id,
                                        'workstream_level_id', dd.workstream_level_id,
                                        'workstream_mapping_id', dd.workstream_mapping_id,
                                        'parent_lws_id', dd.parent_lws_level_id,
                                        'grouping_id', dd.grouping_id,
                                        'product_level', dd.product_level,
                                        'store_level', dd.store_level,
                                        'category', (
                                            SELECT 
                                                CASE
                                                    WHEN (
                                                        jsonb_typeof(dd.product_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.product_level)) > 0 AND
                                                        jsonb_typeof(dd.store_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.store_level)) > 0
                                                    ) THEN 'product_level & store_level'
                                                    WHEN (
                                                        jsonb_typeof(dd.product_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.product_level)) > 0
                                                    ) THEN 'product_level'
                                                    WHEN (
                                                        jsonb_typeof(dd.store_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.store_level)) > 0
                                                    ) THEN 'store_level'
                                                    ELSE 'product_level & store_level'
                                                END
                                        ),
                                        'is_wx', dd.is_wx,
                                        'sublevels', dd.sublevel_count,
                                        'workstream_id', dd.workstream_id
                                    )
                                )
                            )
                            FROM dimension_data dd
                            WHERE dd.level_num = 2 AND dd.selection_type = 'other'),
                            '[]'::jsonb
                        )
                    )
                ),
                'level_3', (
                    SELECT jsonb_build_object(
                        'selected', COALESCE(
                            (SELECT jsonb_agg(
                                jsonb_build_object(
                                    dd.lws_level_id::text, 
                                    jsonb_build_object(
                                        'lws_name', CASE WHEN dd.is_wx THEN 'Workstream X ' || dd.lws_level_name ELSE dd.lws_level_name END,
                                        'lws_mapping_id', dd.lws_mapping_id,
                                        'workstream_level_id', dd.workstream_level_id,
                                        'workstream_mapping_id', dd.workstream_mapping_id,
                                        'parent_lws_id', dd.parent_lws_level_id,
                                        'grouping_id', dd.grouping_id,
                                        'product_level', dd.product_level,
                                        'store_level', dd.store_level,
                                        'category', (
                                            SELECT 
                                                CASE
                                                    WHEN (
                                                        jsonb_typeof(dd.product_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.product_level)) > 0 AND
                                                        jsonb_typeof(dd.store_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.store_level)) > 0
                                                    ) THEN 'product_level & store_level'
                                                    WHEN (
                                                        jsonb_typeof(dd.product_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.product_level)) > 0
                                                    ) THEN 'product_level'
                                                    WHEN (
                                                        jsonb_typeof(dd.store_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.store_level)) > 0
                                                    ) THEN 'store_level'
                                                    ELSE 'product_level & store_level'
                                                END
                                        ),
                                        'is_wx', dd.is_wx,
                                        'sublevels', dd.sublevel_count,
                                        'workstream_id', dd.workstream_id
                                    )
                                )
                            )
                            FROM dimension_data dd
                            WHERE dd.level_num = 3 AND dd.selection_type = 'selected'),
                            '[]'::jsonb
                        ),
                        'other', COALESCE(
                            (SELECT jsonb_agg(
                                jsonb_build_object(
                                    dd.lws_level_id::text, 
                                    jsonb_build_object(
                                        'lws_name', CASE WHEN dd.is_wx THEN 'Workstream X ' || dd.lws_level_name ELSE dd.lws_level_name END,
                                        'lws_mapping_id', dd.lws_mapping_id,
                                        'workstream_level_id', dd.workstream_level_id,
                                        'workstream_mapping_id', dd.workstream_mapping_id,
                                        'parent_lws_id', dd.parent_lws_level_id,
                                        'grouping_id', dd.grouping_id,
                                        'product_level', dd.product_level,
                                        'store_level', dd.store_level,
                                        'category', (
                                            SELECT 
                                                CASE
                                                    WHEN (
                                                        jsonb_typeof(dd.product_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.product_level)) > 0 AND
                                                        jsonb_typeof(dd.store_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.store_level)) > 0
                                                    ) THEN 'product_level & store_level'
                                                    WHEN (
                                                        jsonb_typeof(dd.product_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.product_level)) > 0
                                                    ) THEN 'product_level'
                                                    WHEN (
                                                        jsonb_typeof(dd.store_level) = 'object' AND 
                                                        (SELECT COUNT(*) FROM jsonb_object_keys(dd.store_level)) > 0
                                                    ) THEN 'store_level'
                                                    ELSE 'product_level & store_level'
                                                END
                                        ),
                                        'is_wx', dd.is_wx,
                                        'sublevels', dd.sublevel_count,
                                        'workstream_id', dd.workstream_id
                                    )
                                )
                            )
                            FROM dimension_data dd
                            WHERE dd.level_num = 3 AND dd.selection_type = 'other'),
                            '[]'::jsonb
                        )
                    )
                )
            ) AS result
    )
    
    -- Get the final result
    SELECT result INTO v_result FROM final_result;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error while fetching workstream details: %', SQLERRM;
END;
$function$
;