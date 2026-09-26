-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_bp_competitor_config_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_bp_competitor_config
-- comment: derived table for sync_bp_competitor_config_v1

DROP  PROCEDURE if exists public.sync_bp_competitor_config();

CREATE OR REPLACE PROCEDURE public.sync_bp_competitor_config()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_bp_competitor_config';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE base_pricing.bp_competitor_config;
           
	        INSERT INTO base_pricing.bp_competitor_config
	        (
id,
competitor_name,
competitor_label

 )

			select
id,
competitor_name,
competitor_label

			from public.bp_competitor_config
		group by 1, 2, 3;
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