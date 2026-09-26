--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:sync_product_dc_mapping_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:VS-371
--comment: Updated SP for to handle full replace
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_dc_mapping();
CREATE OR REPLACE PROCEDURE public.sync_product_dc_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_dc_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin	
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	ALTER SEQUENCE global.product_mapping_mapping_code_seq RESTART WITH 1;

	truncate global.product_mapping cascade;

	insert into global.product_mapping (
		mapping_type, product_code, dc_code, is_active ,validity
	)
	select 'product_dc' as mapping_type , product_code, dc_code, is_active ,validity
	from (
		select  product_code ,dc.dc_code ,
		case when a.is_active= 'active' then true else false end  as is_active,
		range_agg(daterange(start_date , end_date)) as validity
		from (
			select product_code, dc_code, is_active, start_date , end_date
			from public.product_dc_mapping
			group by 1,2,3,4,5 
		) a
		join  global.distribution_centres dc
		on a.dc_code =dc.linked_store_code 
		group by product_code ,dc.dc_code ,a.is_active
	) x 
	on conflict do nothing ;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end ;
$procedure$
;