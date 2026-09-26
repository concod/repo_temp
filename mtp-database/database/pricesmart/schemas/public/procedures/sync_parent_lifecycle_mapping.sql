-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_parent_lifecycle_mapping_v6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_parent_lifecycle_mapping
-- comment: derived table for parent_lifecycle_mapping_v6 changing l5_id to text

DROP  PROCEDURE if exists public.sync_parent_lifecycle_mapping();

CREATE OR REPLACE PROCEDURE public.sync_parent_lifecycle_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_parent_lifecycle_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE global.tb_parent_lifecycle_mapping;

	        INSERT INTO global.tb_parent_lifecycle_mapping
	        (
              l5_id,
              product_id,
              lifecycle_indicator_id,
              lifecycle_indicator
	        )
			select
              cast(l5_id as text) as l5_id,
              cast(product_id as int4) as product_id,
              cast(lifecycle_indicator_id as int4) as lifecycle_indicator_id,
              lifecycle_indicator
			from public.parent_lifecycle_mapping
		;
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