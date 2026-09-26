
-- liquibase formatted sql
-- changeset abhishek.sagar@impactanalytics.co:sync_dc_pack_configuration runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_dc_pack_configuration
-- comment: updated logic for sync_dc_pack_configuration based on l1_name and s1_name join

DROP PROCEDURE IF EXISTS public.sync_dc_pack_configuration();
CREATE OR REPLACE PROCEDURE public.sync_dc_pack_configuration()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
   _log_code varchar := gen_random_uuid();
   _sp_name varchar := 'public.sync_dc_pack_configuration';
   _log_step varchar;
   _st TIMESTAMP := clock_timestamp();
begin
   call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
   perform set_config('local.log_code', _log_code, true);
   perform set_config('local.sp_name', _sp_name, true);
   begin
       -- Step 1: Clear existing configuration
       _log_step := 'DELETE existing data';
       delete from
         inventory_smart.dc_pack_configuration
         where
             true
       ;
      
       -- Step 2: Insert new configuration based on new DDL
       _log_step := 'INSERT new data';
       INSERT INTO inventory_smart.dc_pack_configuration (
           pack_type_id,
           pack_type,
           product_code,
           "size",
           units_in_pack,
           pack_description,
           article
       )
       select
           pack_type_id,
           pack_type,
           product_code,
           "size",
           units_in_pack,
           pack_description,
           article
       from public.dc_pack_configuration a ;
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

