--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:MTP-75696_adding_season_code runOnChange:true stripComments:false splitStatements:false context:MTP-75696_adding_season_code labels:liquibase_project_start
--comment: MTP-75696_adding_season_code
--rollback: SELECT 1

DROP FUNCTION IF Exists space_smart.bulk_update_space_constraints_age(jsonb);


CREATE OR REPLACE FUNCTION space_smart.bulk_update_space_constraints_age(json_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$

BEGIN
    -- Insert or update records in the space_smart.space_constraints table
	UPDATE space_smart.space_constraints_age AS sca
	    SET
	        parent_block_min = record.parent_block_min,
	        parent_block_max = record.parent_block_max,
	        update_at = record.update_at,
	        update_by = record.update_by
	    FROM (
	        SELECT
	            (record->>'id')::INT AS id,
(record->>'season_code')::INT AS season_code,
	            record->>'parent_block_min' AS parent_block_min,
	            record->>'parent_block_max' AS parent_block_max,
	            (record->>'update_at')::TIMESTAMP AS update_at,
	            record->>'update_by' AS update_by
	        FROM jsonb_array_elements(json_data) AS record
	    ) AS record
	    WHERE sca.id = record.id
AND sca.season_code = record.season_code;

    -- Optional: Print a notice indicating the function completion
    RAISE NOTICE 'Bulk update operation completed.';
END;
$function$
;
