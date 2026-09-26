--liquibase formatted sql
--changeset aaqib.khan@impactanalytics.co :SPs set up in test runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: initial changeset


DROP PROCEDURE if exists public.sync_tb_size_config();

CREATE OR REPLACE PROCEDURE public.sync_tb_size_config()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code VARCHAR := gen_random_uuid();
	_sp_name VARCHAR := 'public.sync_tb_size_config';
	_log_step VARCHAR;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
	PERFORM set_config('local.log_code', _log_code, TRUE);
	PERFORM set_config('local.sp_name', _sp_name, TRUE);

	BEGIN
		INSERT INTO size_smart.tb_size_config (
			size_master_id,
			source_id,
			size_id,
			"order",
			created_at,
			updated_at
		)
		SELECT 
			c.id as size_master_id,
			ss.id as source_id,
			sss.size_id,
			sss."order",
			now(),
			now()
		FROM size_smart.tb_source ss
		JOIN size_smart.tb_source_size sss ON sss.source_id = ss.id
		JOIN size_smart.tb_size_config_mst c 
			ON c.planning_group_name = sss.planning_group_name
			AND c.hash = ss.id::text || '_' || sss.planning_group_name || '_' || (
				SELECT string_agg(sss2.size_id::text, '' ORDER BY sss2."order", sss2.size_id)  -- ✅ Same tiebreaker
				FROM size_smart.tb_source_size sss2
				WHERE sss2.source_id = ss.id
					AND sss2.planning_group_name = sss.planning_group_name
				GROUP BY sss2.source_id, sss2.planning_group_name)

		ON CONFLICT (source_id, size_id, size_master_id)
		DO UPDATE SET
			"order" = EXCLUDED."order",
			updated_at = now();


		CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

	EXCEPTION
		WHEN OTHERS THEN
			CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
			RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
	END;
END;
$procedure$
;
