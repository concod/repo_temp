--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:sync_product_store_hierarchy_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:create_sync_product_store_hierarchy_mapping
--comment: initial changeset for sync_product_store_hierarchy_mapping
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_product_store_hierarchy_mapping();

CREATE PROCEDURE public.sync_product_store_hierarchy_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS
    $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_store_hierarchy_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        
        delete from "global".product_store_hierarchy_mapping where true;

        INSERT INTO "global".product_store_hierarchy_mapping
        (l0_name, s0_id) 
        select distinct l0_name, s0_id
        from
        (
            select distinct paf.l0_name
            from
                global.product_attributes_filter as paf
        ) as a
        join
        (
            select distinct saf.s0_id
            from
                global.store_attributes_filter as saf
        ) as b
        on a.l0_name = b.s0_id;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
        end;
$procedure$
;