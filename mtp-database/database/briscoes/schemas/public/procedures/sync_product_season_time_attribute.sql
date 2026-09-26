--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:sync_product_season_time_attribute runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:briscoes_sync_product_season_time_attributes
--comment: initial changeset for sync_product_season_time_attribute
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_season_time_attribute();
DROP PROCEDURE IF EXISTS public.sync_product_season_time_attribute(bool);
CREATE OR REPLACE PROCEDURE public.sync_product_season_time_attribute(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_season_time_attribute';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
if _is_historic then 
	 		delete from 
	 		  global.product_time_attributes 
	 		where 
	 		  true;
			
			raise notice 'Step1: %', (clock_timestamp() - _st);
 			
 		end if;
	
----Create partition
	
call global.build_list_partitions('product_time_attributes');


insert
	into
	global.product_time_attributes
	(product_code,
	attribute_name,
	attribute_value,
	start_time,
	end_time,
	l0_name )
	
select
	distinct psv.product_code,
	'status' attribute_name,
	status attribute_value,
	season_start_date as season_start_date,
	season_end_date as season_end_date,
	paf.l0_name
from
	public.productseason_validated_table psv join
	global.product_attributes_filter paf using (product_code) 
	WHERE NOT EXISTS 
		(
		  SELECT 1
		  FROM global.product_time_attributes gta
		  WHERE gta.product_code = psv.product_code
		    AND gta.attribute_name = 'status'
		);
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