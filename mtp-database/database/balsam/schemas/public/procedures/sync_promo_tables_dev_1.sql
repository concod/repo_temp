-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_promo_tables_dev_1_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_promo_tables_dev_1
-- comment: derived table for dev teams promo tables_v5

DROP  PROCEDURE if exists public.sync_promo_tables_dev_1();

CREATE OR REPLACE PROCEDURE public.sync_promo_tables_dev_1()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_promo_tables_dev_1';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
            call global.pc_refresh_1_product_group_products_data();
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
