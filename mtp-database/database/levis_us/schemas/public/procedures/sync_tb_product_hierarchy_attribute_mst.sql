--liquibase formatted sql
--changeset raghav.kirkol:SPs set up in test runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: initial changeset
--rollback: SELECT 1


DROP PROCEDURE IF EXISTS  public.sync_tb_product_hierarchy_attribute_mst();

CREATE OR REPLACE PROCEDURE public.sync_tb_product_hierarchy_attribute_mst()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_product_hierarchy_attribute_mst';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  INSERT INTO size_smart.tb_product_hierarchy_attribute_mst (
    hierarchy_mst_id,
    product_attribute_id,
    created_at,
    updated_at
  )
  SELECT DISTINCT
    thm.id,
    tpa.id,
    tpa.created_at::timestamptz AT TIME ZONE 'Asia/Kolkata',
    tpa.updated_at::timestamptz AT TIME ZONE 'Asia/Kolkata'
  FROM
    size_smart.tb_hierarachy_mst thm
  JOIN public.tb_hierarachy_mst pthm
    ON pthm.l0_name = thm.l0_name
   AND pthm.l8_name = thm.l8_name
  JOIN size_smart.tb_product_attribute tpa
    ON pthm.internal_name = tpa.internal_name 
   AND pthm.l4_name = tpa.global_fit_platform
   AND pthm.subcategory = tpa.subcategory
  ON CONFLICT (hierarchy_mst_id, product_attribute_id) 
  DO UPDATE 
    SET updated_at = EXCLUDED.updated_at;
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
