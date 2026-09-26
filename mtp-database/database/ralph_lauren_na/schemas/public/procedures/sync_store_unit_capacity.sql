--liquibase formatted sql
--changeset ishaan_singh:sync_store_unit_capacity runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start-MTP-2096
--comment: adding update code from li
--rollback: SELECT 1


DROP PROCEDURE IF EXISTS public.sync_store_unit_capacity();
CREATE OR REPLACE PROCEDURE public.sync_store_unit_capacity()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_unit_capacity';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	insert into inventory_smart.store_unit_capacity	
		(product_hierarchy,
		store_code,
		unit_capacity)
	select 	product_hierarchy,
		store_code,
		unit_capacity from public.store_unit_capacity;
		
	update inventory_smart.store_unit_capacity 
	set tot_inv =0,
	allocated_qty= 0,
	carton_allocated_qty =0
	where true;
		
	update inventory_smart.store_unit_capacity  sc
    set tot_inv=li.tot_inv
    from 
    (select store_code,l3_name,sum(coalesce(oh,0)+coalesce(oo,0)+coalesce (it,0)) tot_inv from inventory_smart.latest_inventory li 
join(select product_code,l3_name from global.product_attributes_filter) paf 
using(product_code)
where store_code in (select store_code from "global".store_attributes_filter where special_classification <> 'WHS')
group by 1,2
    ) li
    where sc.store_code  = li.store_code 
    and sc.product_hierarchy  = li.l3_name;
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
