--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:sync_oms_constraints_status runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_constraints_status
--comment: initial changeset sync_oms_constraints_status 

DROP PROCEDURE IF EXISTS public.sync_oms_constraints_status(bool);
CREATE OR REPLACE PROCEDURE public.sync_oms_constraints_status(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_constraints_status';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  if _is_historic then 
            delete from 
              inventory_smart.oms_constraints_status
            where 
              true;
        end if;
INSERT INTO inventory_smart.oms_constraints_status
	(product_code,
	channel, 
	l6_name,
	vendor_code, 
	vendor_name, 
	status, 
	preferred_status, 
	vendor_location,
	created_by, 
	created_at, 
	updated_by, 
	updated_at, 
	column_updated)
SELECT 
	src.product_code, 
	src.channel, 
	l6_name,
	src.vendor_code, 
	src.vendor_name, 
	src.status, 
	src.preferred_status, 
	src.vendor_location,
	(select user_code from "global".user_master where email='ia_system@impactanalytics.co') as created_by,
	src.created_at, 
	(select user_code from "global".user_master where email='ia_system@impactanalytics.co') as updated_by,
	current_timestamp AS updated_at, 
	'-' as column_updated
FROM public.oms_constraints_status AS src
ON CONFLICT (product_code, channel, vendor_code)
DO UPDATE 
SET 
	vendor_name=EXCLUDED.vendor_name, 
    updated_by = (select user_code from "global".user_master where email='ia_system@impactanalytics.co'),
    updated_at = current_timestamp,
	column_updated=excluded.column_updated
WHERE 
    inventory_smart.oms_constraints_status.vendor_name IS DISTINCT FROM excluded.vendor_name;
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