--liquibase formatted sql
--changeset liquibase:get_workstream_store_hierarchy4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for get_workstream_store_hierarchy
--rollback: SELECT 1

DROP FUNCTION IF EXISTS ada_configurator.get_workstream_store_hierarchy(int4);

CREATE OR REPLACE FUNCTION ada_configurator.get_workstream_store_hierarchy(workstream_id_param integer)
 RETURNS TABLE(level_id text, hierarchy_value integer, level_name text, level_datatype text, store_skip_level_flag boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH HierarchyFilter AS (
    SELECT
        pgsm.generic_column_name::TEXT AS level_id,
        pgsm.generic_column_datatype::TEXT AS level_datatype,
        pgsm.hierarchy_level AS hierarchy,
        pal.source_display_name::TEXT AS level_name
    FROM
        "global".store_generic_schema_mapping AS pgsm
    INNER JOIN
        "global".store_attributes_list AS pal ON pgsm.generic_column_name = pal.attribute_name
    WHERE
        pgsm.is_hierarchy = true
    ORDER BY
        pgsm.hierarchy_level ASC
),
WorkstreamFilter AS (
    SELECT
        wpl1.store_level_name::TEXT AS store_level_name,
        wpl1.hierarchy_level AS store_hierarchy_level,
        wpl1.level_value::TEXT AS store_level_value,
        wpl1.skip_level_flag AS store_skip_level_flag
    FROM
        ada_configurator.workstream ws
    LEFT JOIN
        ada_configurator.workstream_level_mapping wlm ON ws.workstream_mapping_id = wlm.workstream_mapping_id
    LEFT JOIN
        ada_configurator.workstream_level wl1 ON wlm.workstream_level1_id = wl1.workstream_level_id
    LEFT JOIN
        ada_configurator.lws_mapping lm1 ON wl1.lws_mapping_id = lm1.lws_mapping_mapping_id
    LEFT JOIN
        ada_configurator.lws_level ll1 ON lm1.lws_level_id = ll1.lws_id
    LEFT JOIN
        ada_configurator.workstream_output_store_level_names wpl1 ON ll1.lws_id = wpl1.lws_level_id
    LEFT JOIN
        ada_configurator.workstream_level wl2 ON wlm.workstream_level2_id = wl2.workstream_level_id
    LEFT JOIN
        ada_configurator.lws_mapping lm2 ON wl2.lws_mapping_id = lm2.lws_mapping_mapping_id
    LEFT JOIN
        ada_configurator.lws_level ll2 ON lm2.lws_level_id = ll2.lws_id
    LEFT JOIN
        ada_configurator.workstream_output_store_level_names wpl2 ON ll2.lws_id = wpl2.lws_level_id
    LEFT JOIN
        ada_configurator.workstream_level wl3 ON wlm.workstream_level3_id = wl3.workstream_level_id
    LEFT JOIN
        ada_configurator.lws_mapping lm3 ON wl3.lws_mapping_id = lm3.lws_mapping_mapping_id
    LEFT JOIN
        ada_configurator.lws_level ll3 ON lm3.lws_level_id = ll3.lws_id
    LEFT JOIN
        ada_configurator.workstream_output_store_level_names wpl3 ON ll3.lws_id = wpl3.lws_level_id
    WHERE
        ws.workstream_id = workstream_id_param
        AND wpl1.store_level_name IS NOT NULL
    
    UNION ALL
    
    SELECT
        wpl2.store_level_name::TEXT AS store_level_name,
        wpl2.hierarchy_level AS store_hierarchy_level,
        wpl2.level_value::TEXT AS store_level_value,
        wpl2.skip_level_flag AS store_skip_level_flag
    FROM
        ada_configurator.workstream ws
    LEFT JOIN
        ada_configurator.workstream_level_mapping wlm ON ws.workstream_mapping_id = wlm.workstream_mapping_id
    LEFT JOIN
        ada_configurator.workstream_level wl1 ON wlm.workstream_level1_id = wl1.workstream_level_id
    LEFT JOIN
        ada_configurator.lws_mapping lm1 ON wl1.lws_mapping_id = lm1.lws_mapping_mapping_id
    LEFT JOIN
        ada_configurator.lws_level ll1 ON lm1.lws_level_id = ll1.lws_id
    LEFT JOIN
        ada_configurator.workstream_output_store_level_names wpl1 ON ll1.lws_id = wpl1.lws_level_id
    LEFT JOIN
        ada_configurator.workstream_level wl2 ON wlm.workstream_level2_id = wl2.workstream_level_id
    LEFT JOIN
        ada_configurator.lws_mapping lm2 ON wl2.lws_mapping_id = lm2.lws_mapping_mapping_id
    LEFT JOIN
        ada_configurator.lws_level ll2 ON lm2.lws_level_id = ll2.lws_id
    LEFT JOIN
        ada_configurator.workstream_output_store_level_names wpl2 ON ll2.lws_id = wpl2.lws_level_id
    LEFT JOIN
        ada_configurator.workstream_level wl3 ON wlm.workstream_level3_id = wl3.workstream_level_id
    LEFT JOIN
        ada_configurator.lws_mapping lm3 ON wl3.lws_mapping_id = lm3.lws_mapping_mapping_id
    LEFT JOIN
        ada_configurator.lws_level ll3 ON lm3.lws_level_id = ll3.lws_id
    LEFT JOIN
        ada_configurator.workstream_output_store_level_names wpl3 ON ll3.lws_id = wpl3.lws_level_id
    WHERE
        ws.workstream_id = workstream_id_param
        AND wpl2.store_level_name IS NOT NULL
    
    UNION ALL
    
    SELECT
        wpl3.store_level_name::TEXT AS store_level_name,
        wpl3.hierarchy_level AS store_hierarchy_level,
        wpl3.level_value::TEXT AS store_level_value,
        wpl3.skip_level_flag AS store_skip_level_flag
    FROM
        ada_configurator.workstream ws
    LEFT JOIN
        ada_configurator.workstream_level_mapping wlm ON ws.workstream_mapping_id = wlm.workstream_mapping_id
    LEFT JOIN
        ada_configurator.workstream_level wl1 ON wlm.workstream_level1_id = wl1.workstream_level_id
    LEFT JOIN
        ada_configurator.lws_mapping lm1 ON wl1.lws_mapping_id = lm1.lws_mapping_mapping_id
    LEFT JOIN
        ada_configurator.lws_level ll1 ON lm1.lws_level_id = ll1.lws_id
    LEFT JOIN
        ada_configurator.workstream_output_store_level_names wpl1 ON ll1.lws_id = wpl1.lws_level_id
    LEFT JOIN
        ada_configurator.workstream_level wl2 ON wlm.workstream_level2_id = wl2.workstream_level_id
    LEFT JOIN
        ada_configurator.lws_mapping lm2 ON wl2.lws_mapping_id = lm2.lws_mapping_mapping_id
    LEFT JOIN
        ada_configurator.lws_level ll2 ON lm2.lws_level_id = ll2.lws_id
    LEFT JOIN
        ada_configurator.workstream_output_store_level_names wpl2 ON ll2.lws_id = wpl2.lws_level_id
    LEFT JOIN
        ada_configurator.workstream_level wl3 ON wlm.workstream_level3_id = wl3.workstream_level_id
    LEFT JOIN
        ada_configurator.lws_mapping lm3 ON wl3.lws_mapping_id = lm3.lws_mapping_mapping_id
    LEFT JOIN
        ada_configurator.lws_level ll3 ON lm3.lws_level_id = ll3.lws_id
    LEFT JOIN
        ada_configurator.workstream_output_store_level_names wpl3 ON ll3.lws_id = wpl3.lws_level_id
    WHERE
        ws.workstream_id = workstream_id_param
        AND wpl3.store_level_name IS NOT NULL
),
storeFilter AS (
    SELECT
        DISTINCT COALESCE(hf.hierarchy, 0) as hierarchy,
        wf.store_skip_level_flag
    FROM
        HierarchyFilter hf
    INNER JOIN
        WorkstreamFilter wf
        ON
            (wf.store_skip_level_flag = true AND hf.hierarchy = wf.store_hierarchy_level)
            OR (wf.store_skip_level_flag = false AND hf.hierarchy >= wf.store_hierarchy_level)
            OR (wf.store_skip_level_flag = false AND hf.hierarchy >= wf.store_hierarchy_level)
    GROUP BY
        hf.hierarchy, wf.store_skip_level_flag
),
MaxHierarchyFilter AS (
    SELECT
        MAX(hierarchy) AS max_hierarchy
    FROM
        storeFilter
),
MainQuery AS (
    SELECT
        DISTINCT hf.level_id,
        hf.hierarchy as hierarchy_value,
        hf.level_name,
        hf.level_datatype,
        pf.store_skip_level_flag
    FROM
        HierarchyFilter hf
    RIGHT JOIN
        storeFilter pf
        ON hf.hierarchy = pf.hierarchy
        OR hf.hierarchy > (SELECT COALESCE(max_hierarchy, 0) FROM MaxHierarchyFilter)
    ORDER BY
        hf.hierarchy ASC
)
SELECT
    *
FROM
    MainQuery
UNION ALL
SELECT
    hf.level_id,
    hf.hierarchy as hierarchy_value,
    hf.level_name,
    hf.level_datatype,
    NULL as store_skip_level_flag
FROM
    HierarchyFilter hf
WHERE
    NOT EXISTS (SELECT 1 FROM MainQuery)
ORDER BY
    hierarchy_value ASC;
END;
$function$
;
