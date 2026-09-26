--liquibase formatted sql
--changeset abijithsarath.menon@impactanalytics.co:sync_new_store_default_group runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:pacsun_sync_alerts_product_zone_level
--comment: initial changeset for sync_new_store_default_group

DROP PROCEDURE if exists  public.sync_new_store_default_group();

CREATE OR REPLACE PROCEDURE public.sync_new_store_default_group()
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_new_store_default_group';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  DELETE
  FROM global.store_groups_mapping
  WHERE sg_code = 5;

  WITH new_stores AS (
    SELECT DISTINCT store_code
    FROM global.store_time_attributes
    where store_code not in ('4901','4905')
    and attribute_value = 'active'
    and current_date between start_time and end_time
  )
  INSERT INTO global.store_groups_mapping (sg_code, store_code, ref_sg_code)
  SELECT
    5,
    store_code,
    NULL     AS ref_sg_code
  FROM new_stores
  ON CONFLICT (sg_code, store_code) DO NOTHING;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$;
