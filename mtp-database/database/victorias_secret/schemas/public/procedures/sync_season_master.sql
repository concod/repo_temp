--liquibase formatted sql
--changeset liquibase:sync_season_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_season_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_season_master();
CREATE OR REPLACE PROCEDURE public.sync_season_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_season_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		insert into global.season_master (name,
		season_type,
		season_status,
		year,
		season_start_date,
		season_end_date)
		select distinct season, 'VB Season' season_type, false  as  season_status, 
		DATE_PART('year', season_start_date::date) as "year", season_start_date,season_end_date 
		from 
		public.productseason_validated_table a
		where not exists (select 'p' from  global.season_master sm
		where sm."name" =a.season
		);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	end
$procedure$
;
