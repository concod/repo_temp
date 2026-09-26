-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_tb_customer_channel_filter_mapping_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_coupon_redemption
-- comment: derived table for sync_tb_customer_channel_filter_mapping_v1

DROP PROCEDURE if exists public.sync_tb_customer_channel_filter_mapping();

CREATE OR REPLACE PROCEDURE public.sync_tb_customer_channel_filter_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_customer_channel_filter_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        -- TRUNCATE TABLE global.tb_customer_channel_filter_mapping;

	        INSERT INTO global.tb_customer_channel_filter_mapping
	        (
        c0_id,
		s0_id,
		filters_to_enable
	        )
			select
        c0_id,
		s0_id,
		filters_to_enable
			from public.tb_customer_channel_filter_mapping;
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
