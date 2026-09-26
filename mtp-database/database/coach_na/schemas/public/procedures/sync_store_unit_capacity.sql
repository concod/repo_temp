--liquibase formatted sql
--changeset hemantkumar.bajaj@impactanalytics.co:sync_store_unit_capacity runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sm_sync_store_unit_capacity
--comment: initial changeset for sync_store_unit_capacity

DROP PROCEDURE IF EXISTS public.sync_store_unit_capacity();


CREATE OR REPLACE PROCEDURE public.sync_store_unit_capacity()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_unit_capacity';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

    INSERT INTO inventory_smart.store_unit_capacity (
        store_code,
        unit_capacity,
        product_hierarchy,
        updated_at,
        updated_by
    )
    WITH a AS (
        SELECT DISTINCT
            saf.store_code,
            CONCAT(paf.l0_name, '-', paf.l1_name, '-', paf.l2_name) AS product_hierarchy
        FROM global.product_store_hierarchy_mapping paf
        LEFT JOIN global.store_attributes_filter saf
               ON paf.l0_name = saf.s0_name
              AND paf.l1_name = saf.s1_name
    )
    SELECT
        a.store_code,
        1000000,
        a.product_hierarchy,
        CURRENT_TIMESTAMP,
        NULL
    FROM a
    ON CONFLICT (store_code, product_hierarchy) DO NOTHING;

  
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;

