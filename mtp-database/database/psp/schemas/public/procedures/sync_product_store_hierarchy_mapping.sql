
-- liquibase formatted sql
-- changeset sriraj.varanasi@impactanalytics.co:sync_product_store_hierarchy_mapping_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_populate_tb_simulation_day_opt
-- comment: initial changeset for sync_product_store_hierarchy_mapping_v1
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_product_store_hierarchy_mapping();
CREATE OR REPLACE PROCEDURE public.sync_product_store_hierarchy_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_store_hierarchy_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  DELETE FROM "global".product_store_hierarchy_mapping
  WHERE true;
  INSERT INTO "global".product_store_hierarchy_mapping (
    l0_name, l1_name, manufacturer_cuq, channel
  )
  SELECT
    DISTINCT
      l0_cuq, l1_cuq, manufacturer_cuq, 'store' as channel
  FROM price_promo.product_master
  where is_active = 1;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$
;