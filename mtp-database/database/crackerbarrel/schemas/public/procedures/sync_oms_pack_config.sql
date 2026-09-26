-- liquibase formatted sql
-- changeset bhargav.polavarapu@impactanalytics.co:adding_sync_oms_pack_config_in_one runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:adding the sp test
-- comment: adding_sync_oms_pack_config_in test

DROP PROCEDURE IF EXISTS public.sync_oms_pack_config(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_pack_config(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_pack_config';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  
   if _is_historic then 
             delete from 
               inventory_smart.oms_pack_config 
             where 
               true;
         end if;
   INSERT INTO inventory_smart.oms_pack_config
(
   article,
  "style",
  pack_id,
  pack_type,
  product_code,
  "size",
  units_in_pack,
  pack_description,
  color_code
)
SELECT
  article,
  "style",
  pack_id,
  pack_type,
  product_code,
  "size",
  units_in_pack,
  pack_description,
  color_code
FROM

 public.oms_pack_config

ON CONFLICT ON CONSTRAINT pk_oms_pack_config DO NOTHING;

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