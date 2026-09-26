--liquibase formatted sql
--changeset liquibase:sync_product_store_hierarchy_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_product_store_hierarchy_mapping
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_store_hierarchy_mapping();
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
primary_trait_desc,
l3_name,
product_channel_name,
store_channel_description,
channel)
(
with channels as (
select distinct channel
from global.store_attributes_filter
)

select distinct paf.l0_name, paf.l1_name, paf.l2_name,paf.primary_trait_desc, paf.l3_name,
channel as product_channel_name,
channel as store_channel_name,
channel as channel
from global.product_attributes_filter paf
join global.product_time_attributes using (product_code)
cross join channels
where attribute_value = 'active' and current_date between start_time and end_time)
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