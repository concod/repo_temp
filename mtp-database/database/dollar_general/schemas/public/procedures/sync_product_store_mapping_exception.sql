--liquibase formatted sql
--changeset rajat.choudhary-3:sync_product_store_mapping_exception runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:003
--comment: added new SP for sync_product_store_mapping_exception
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_store_mapping_exception();
CREATE OR REPLACE PROCEDURE public.sync_product_store_mapping_exception()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_store_mapping_exception';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  global.rcl_product_mapping_product_store_exceptions
		  where true ;

		INSERT INTO "global".rcl_product_mapping_product_store_exceptions
		(rcl_code, rule_code, validity, store_code, created_at, updated_at, updated_by, created_by, psa_name, psa_code)

		SELECT 
			m.rcl_code, 
			r.rule_code, 
			range_agg(daterange(start_date::date, end_date::date)) as validity,			
			m.store_code, 
			COALESCE(m.created_at, now()) as created_at, 
			COALESCE(m.updated_at, now()) as updated_at, 
			m.updated_by, 
			m.created_by, 
			m.psa_name, 
			m.psa_code
		from public.product_store_mapping_exception as m
		join global.rcl_product_mapping_product_store_rule as r
		on r.rcl_code = m.rcl_code and r.rcl_dimension = cast(m.rcl_dimension as jsonb)
		group by 1,2,4,5,6,7,8,9,10
		on conflict(rcl_code, rule_code, store_code) DO nothing;
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

