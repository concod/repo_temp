-- liquibase formatted sql
-- changeset shameel.zeeeshan@impactanalytics.co:sync_product_store_hierarchy_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:column addition country
-- comment: column addition country

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
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
delete from
"global".product_store_hierarchy_mapping
where
true;
INSERT INTO "global".product_store_hierarchy_mapping
( 
l0_name,
l1_name,
l2_name,
l3_name,
product_channel_name,
store_channel_description,
channel,
country) 
select distinct paf.l0_name, paf.l1_name, paf.l2_name, paf.l3_name,
paf.l1_name as product_channel_name,
paf.l1_name as store_channel_name,
paf.l1_name as channel,
paf.l0_name as country
from
global.product_attributes_filter paf
join global.product_time_attributes using (product_code)
where attribute_value = 'active' and current_date between start_time and end_time
;
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
