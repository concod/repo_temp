--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:sync_update_constraint_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sm_sync_update_constraint_mapping 
--comment: initial changeset for sync_update_constraint_mapping
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_update_constraint_mapping();

CREATE OR REPLACE PROCEDURE public.sync_update_constraint_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_update_constraint_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

    CREATE TABLE public.constraint_master_update AS
    SELECT  ucm.*
        ,pmps.mapping_code
    FROM public.update_constraint_mapping ucm
    LEFT JOIN "global".product_mapping_product_store pmps
    ON ucm.l0_name = pmps.l0_name AND ucm.product_code = pmps.product_code AND ucm.store_code = pmps.store_code
    WHERE pmps.mapping_code is not null;


    UPDATE inventory_smart.constraint_master t1
    SET
        mapping_code = t2.mapping_code,
        l0_name = t2.l0_name
    FROM public.constraint_master_update t2
    WHERE
        t1.l0_name is null
        and t1.product_code = t2.product_code
        AND t1.store_code = t2.store_code
        AND t1.mapping_code IS NULL;

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







