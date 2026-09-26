-- liquibase formatted sql
-- changeset aniket.nichat@impactanalytics.co:sync_product_store_hierarchy_mapping1 runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_product_dc_mapping
-- comment: updated logic for sync_product_store_hierarchy_mapping1 based on l1_name and s1_name join


DROP PROCEDURE if exists public.sync_product_store_hierarchy_mapping();




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
	mapping_key,
    l0_name,
    l1_name,
    l2_name,
    l3_name,
	l4_name,
    channel,
    s1_name
  )
 SELECT
    DISTINCT  DENSE_RANK() over (order by l0_name,l1_name,l2_name,l3_name,l4_name) AS mapping_key ,l0_name,
    l1_name,
    l2_name,
    l3_name,
      l4_name,
    channel,
    channel as s1_name
  FROM (
    SELECT
      DISTINCT paf.l0_name,
      paf.l1_name,
      paf.l2_name,
      paf.l3_name,
        paf.l4_name
    FROM global.product_attributes_filter paf
    JOIN global.product_time_attributes using (product_code)
    WHERE attribute_value = 'active' and current_date between start_time and end_time
  ) t1
left join  "global".store_attributes_filter saf on l1_name=s1_name
    WHERE saf.active and not saf.is_deleted and channel not in ('-')
;
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



