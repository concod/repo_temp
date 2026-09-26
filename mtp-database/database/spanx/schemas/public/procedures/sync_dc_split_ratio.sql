--liquibase formatted sql
--changeset abhimanyu.sheoran@impactanalytics.co:sync_dc_split_ratio runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for sync_dc_split_ratio

DROP PROCEDURE IF EXISTS public.sync_dc_split_ratio(bool);

CREATE OR REPLACE PROCEDURE public.sync_dc_split_ratio(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_split_ratio';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   if _is_historic then 
            delete from 
              inventory_smart.dc_split_ratio 
            where 
              true;
        end if;
  insert into inventory_smart.dc_split_ratio
      (
article,
product_code,
size,
loc_code,
channel,
penetration,
fiscal_year_week
      )
  select
       article,
product_code,
size,
loc_code,
channel,
penetration,
fiscal_year_week
  from
    --public.oms_kpi
    public.dc_split_ratio
  on conflict ON CONSTRAINT pk_dc_split_ratio do nothing;

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
