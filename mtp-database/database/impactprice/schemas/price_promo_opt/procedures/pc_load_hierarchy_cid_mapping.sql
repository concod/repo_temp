--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:pc_load_hierarchy_cid_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: loading hierarchy cid mapping

DROP PROCEDURE IF EXISTS price_promo_opt.pc_load_hierarchy_cid_mapping;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_load_hierarchy_cid_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_version_code int;
BEGIN

    -- Get latest version_code
    SELECT COALESCE(
		global.get_table_version('global.tb_hierarchy_cid_mapping_version'), 
		(SELECT MAX(version_code)
       	FROM "global".tb_hierarchy_cid_mapping_version)
	) INTO v_version_code;

    RAISE NOTICE 'Loading data for version_code = %', v_version_code;

    -- Delete existing data for that version
    DELETE FROM "global".tb_hierarchy_cid_mapping_version
    WHERE version_code = v_version_code;

    -- Insert fresh data (fully config-driven)
    INSERT INTO "global".tb_hierarchy_cid_mapping_version
    (
        hierarchy_level,
        hierarchy_value,
        hierarchy_name,
        version_code,
        hierarchy_level_name,
        id
    )
    WITH config AS (
        SELECT 
            (value->>'id')::int AS h_level,
            value->>'label' AS h_label,
            value->>'value_column' AS col_value,
            value->>'name_column' AS col_name
        FROM jsonb_each(
            (
                SELECT config_value::jsonb
                FROM price_promo.tb_tool_configurations
                WHERE "module" = 'product'
                  AND config_name = 'hierarchy_filters'
                LIMIT 1
            )
        )
    ),
    data AS (
        SELECT DISTINCT
            c.h_level,
            c.h_label,
            (to_jsonb(pm) ->> c.col_value) AS hierarchy_value,
            (to_jsonb(pm) ->> c.col_name)  AS hierarchy_name
        FROM config c
        JOIN price_promo.product_master pm
          ON pm.is_active = 1
        WHERE 
            (to_jsonb(pm) ->> c.col_value) IS NOT NULL
            AND (to_jsonb(pm) ->> c.col_name) IS NOT NULL
    )
    SELECT 
        h_level AS hierarchy_level,
        hierarchy_value,
        hierarchy_name,
        v_version_code,
        h_label AS hierarchy_level_name,
        ROW_NUMBER() OVER (
            PARTITION BY h_level
            ORDER BY 
                hierarchy_value NULLS LAST,
                hierarchy_name NULLS LAST
        ) AS id
    FROM data;

    RAISE NOTICE 'Data load complete for version_code = %', v_version_code;

END;
$procedure$
;
