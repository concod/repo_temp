--liquibase formatted sql
--changeset aaqib.khan@impactanalytics.co :changes in test env UPDATES runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:levis_TEST_1
--comment: changes in test env UPDATES


DROP PROCEDURE IF EXISTS public.sync_tb_size_config_mst();

CREATE OR REPLACE PROCEDURE public.sync_tb_size_config_mst()
LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code VARCHAR := gen_random_uuid();
	_sp_name VARCHAR := 'public.sync_tb_size_config_mst';
	_log_step VARCHAR;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
	PERFORM set_config('local.log_code', _log_code, TRUE);
	PERFORM set_config('local.sp_name', _sp_name, TRUE);

	BEGIN
		-- Step 1: Insert or update    records in tb_size_config_mst
		INSERT INTO size_smart.tb_size_config_mst (
    name,
    planning_group_name,
    hash,
    size_range_order,
    created_at,
    updated_at,
    updated_by
)
SELECT
    sm.name,
    tss.planning_group_name,

    sm.id::text || '_' || tss.planning_group_name || '_' ||
    string_agg(
        tss.size_id::text,
        '' ORDER BY COALESCE(tss."order", tss.size_id) 
    ) AS hash,
    COALESCE(
        jsonb_agg(s.name ORDER BY COALESCE(sc."order", tss."order")), -- if tb_size_config is empty pick the order from tb_source_size
        '[]'::jsonb
    ) AS size_range_order,

    now() AS created_at,
    now() AS updated_at,
    251 AS updated_by
FROM (
    SELECT DISTINCT source_id, planning_group_name, size_id, "order"
    FROM size_smart.tb_source_size
) tss
JOIN size_smart.tb_source sm
    ON tss.source_id = sm.id
JOIN size_smart.tb_size s
    ON tss.size_id = s.id
LEFT JOIN size_smart.tb_size_config sc
    ON sc.source_id = tss.source_id
   AND sc.size_id   = tss.size_id
GROUP BY
    sm.id, sm.name, tss.planning_group_name
ON CONFLICT (hash) DO UPDATE
SET
    name = EXCLUDED.name,
    planning_group_name = EXCLUDED.planning_group_name,
    size_range_order = EXCLUDED.size_range_order,
    updated_at = now();


		CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

	EXCEPTION
		WHEN OTHERS THEN
			CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
			RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
	END;
END;
$procedure$;




