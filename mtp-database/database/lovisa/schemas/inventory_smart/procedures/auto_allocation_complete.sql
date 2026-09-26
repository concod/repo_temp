--liquibase formatted sql
--changeset swapnil.bhange:auto_allocation_complete_added_sps runOnChange:true stripComments:false splitStatements:false context:MTP-102557 labels:range_level_aggreagtion_sp_addition
--comment: add auto allocation complete range_level_aggreagtion_sp_addition
DROP procedure if exists inventory_smart.auto_allocation_complete();
CREATE OR REPLACE PROCEDURE inventory_smart.auto_allocation_complete()
LANGUAGE plpgsql
AS $$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'inventory_smart.auto_allocation_complete';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    v_gen_random_uuid uuid;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    v_gen_random_uuid := gen_random_uuid();

    perform global.sp_log(v_gen_random_uuid::text, 'inventory_smart.auto_allocation_complete'::text, 'Starting procedure'::text, ''::text, jsonb_build_object());

    CALL public.aggregate_allocation_at_range_level();

    perform global.sp_log(v_gen_random_uuid::text, 'inventory_smart.auto_allocation_complete'::text, 'Procedure complete'::text, ''::text, jsonb_build_object());
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$;