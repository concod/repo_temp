--liquibase formatted sql
--changeset aaqib.khan@impactanalytics.co :SPs set up in test runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: initial changeset

DROP PROCEDURE if exists public.sync_tb_ruleset_config_size_range();

CREATE OR REPLACE PROCEDURE public.sync_tb_ruleset_config_size_range()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code VARCHAR := gen_random_uuid();
	_sp_name VARCHAR := 'public.sync_tb_ruleset_config_size_range';
	_log_step VARCHAR;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
	PERFORM set_config('local.log_code', _log_code, TRUE);
	PERFORM set_config('local.sp_name', _sp_name, TRUE);

	BEGIN
insert into size_smart.tb_ruleset_config_size_range (
    ruleset_config_id,
    size_config_mst_id,
    created_at,
    updated_at
)
select 
    120 as ruleset_config_id,
    scm.id as size_config_mst_id,
    now() as created_at,
    now() as updated_at
from size_smart.tb_size_config_mst scm
where not exists (
    select 1
    from size_smart.tb_ruleset_config_size_range rcsr
    where rcsr.size_config_mst_id = scm.id
)
on conflict (ruleset_config_id, size_config_mst_id)
do update set 
    updated_at = excluded.updated_at;


		CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

	EXCEPTION
		WHEN OTHERS THEN
			CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
			RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
	END;
END;
$procedure$
;

