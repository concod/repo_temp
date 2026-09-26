--liquibase formatted sql
--changeset aman.lakkoju:fixed type cast issue for sync_oms_constraints_safety_stock runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-35860
--comment: fixed type cast issue for oms_constrains_safety_stock
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_oms_constraints_safety_stock(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_oms_constraints_safety_stock(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_constraints_safety_stock';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  if _is_historic then 
            delete from 
              inventory_smart.oms_constraints_safety_stock 
            where 
              true;
        end if;
  insert into inventory_smart.oms_constraints_safety_stock
      (product_code,
       loc_code,
       safety_stock_method,
       stock_units,
       service_level_pct,
       inventory_hold,
       max_stock_units,
       created_by,
       created_at, 
       updated_by, 
       updated_at 
      )
  select
       product_code,
       dc_id, --loc_code,
       safety_stock_method, --safety_stock_method,
       --replace(stock_unit::varchar,null,'0')::int, --stock_units,
       coalesce(stock_unit::varchar,'0')::int as stock_units, --stock_units,       
       (service_level::float)*100 as service_level,
       inventory_hold,
       --service_level,--service_level_pct,
	   --stock_unit,
       --replace(stock_unit::varchar,null,'0')::int,--max_stock_units,
       coalesce(stock_unit::varchar,'0')::int, --max_stock_units,	  
       3 as created_by,
       current_timestamp as created_at,
       updated_by ,
       updated_at::timestamp
  from
    --public.oms_constraints_safety_stock
    public.oms_constraints_safety_stock     
  on conflict ON CONSTRAINT pk_oms_constraints_safety_stock do update 
  set safety_stock_method = excluded.safety_stock_method,
      stock_units = excluded.stock_units,
      service_level_pct = excluded.service_level_pct,
      max_stock_units = excluded.max_stock_units,
      inventory_hold = excluded.inventory_hold,
      updated_by = excluded.updated_by ,
      updated_at = excluded.updated_at;
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
