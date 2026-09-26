--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:MTP-104197_adding_sp runOnChange:true stripComments:false splitStatements:false context:MTP-104197_adding_sp labels:liquibase_project_start
--comment: MTP-75696_adding_sp
--rollback: SELECT 1


DROP FUNCTION IF Exists space_smart.bulk_update_space_constraints_age_store(jsonb);

CREATE OR REPLACE FUNCTION space_smart.bulk_update_space_constraints_age_store(json_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Bulk update based on (l0_name, l4_name, season_code, store_code)
    UPDATE space_smart.space_constraints_age AS sca
    SET
        parent_block_min = record.parent_block_min,
        parent_block_max = record.parent_block_max,
        update_at = record.update_at,
        update_by = record.update_by
    FROM (
        SELECT
            record->>'l0_name' AS l0_name,
            record->>'l4_name' AS l4_name,
            (record->>'season_code')::INT AS season_code,
            record->>'store_code' AS store_code,
            record->>'parent_block_min' AS parent_block_min,
            record->>'parent_block_max' AS parent_block_max,
            (record->>'update_at')::TIMESTAMP AS update_at,
            record->>'update_by' AS update_by
        FROM jsonb_array_elements(json_data) AS record
    ) AS record
    WHERE sca.l0_name = record.l0_name
      AND sca.l4_name = record.l4_name
      AND sca.season_code = record.season_code
      AND sca.store_code = record.store_code;

    -- Optional notice
    RAISE NOTICE 'Bulk update operation completed.';
END;
$function$
;
