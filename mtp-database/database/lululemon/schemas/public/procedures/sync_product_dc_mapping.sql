-- liquibase formatted sql
-- changeset aniket.nichat@impactanalytics.co:sync_product_dc_mapping_lulu runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_product_dc_mapping
-- comment: updated logic for sync_product_dc_mapping_lulu based on l1_name and s1_name join

DROP PROCEDURE if exists public.sync_product_dc_mapping();
CREATE OR REPLACE PROCEDURE public.sync_product_dc_mapping()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
   _log_code varchar := gen_random_uuid();
   _sp_name varchar := 'public.sync_product_dc_mapping';
   _log_step varchar;
   _st TIMESTAMP := clock_timestamp();
BEGIN
   call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
   perform set_config('local.log_code', _log_code, true);
   perform set_config('local.sp_name', _sp_name, true);
   begin
       _log_step := 'INSERT into global.product_mapping_product_dc';
      
       INSERT INTO global.product_mapping_product_dc(
           mapping_type,
           product_code,
           dc_code,
           is_active
       )
       SELECT
           'product_dc' as mapping_type,
           pm.product_code,
           CAST(sm.store_code AS INTEGER) AS dc_code,
           TRUE as is_active
       FROM
           "global".product_attributes_filter pm
       LEFT JOIN
           "global".store_attributes_filter sm ON pm.l1_name = sm.s1_name
       WHERE
           pm.active = TRUE
           -- AND sm.active = TRUE -- Commented out per requirements
           AND sm.store_type = 'DC'
       ON CONFLICT DO NOTHING;
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

