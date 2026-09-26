-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_spike_factor_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_spike_factor
-- comment: derived table for spike_factor_v5

DROP  PROCEDURE if exists public.sync_spike_factor();

CREATE OR REPLACE PROCEDURE public.sync_spike_factor()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_spike_factor';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE price_markdown_opt.tb_spike_factor;

	        INSERT INTO price_markdown_opt.tb_spike_factor
	        (
			l2_cid,
			lifecycle,
			md_week,
			md_day,
			bnm_spike_factor,
			ecom_spike_factor
	        )
			select
			l2_cid,
			lifecycle,
			md_week,
			md_day,
			bnm_spike_factor,
			ecom_spike_factor
			from public.spike_factor;
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