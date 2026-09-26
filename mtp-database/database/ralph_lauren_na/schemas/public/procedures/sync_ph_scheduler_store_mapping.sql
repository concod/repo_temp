--liquibase formatted sql
--changeset kirubasahari.n@impactanalytics.co:update_sync_ph_scheduler_store_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:
--comment: update sync_ph_scheduler_store_mapping
DROP PROCEDURE IF EXISTS public.sync_ph_scheduler_store_mapping();
CREATE OR REPLACE PROCEDURE public.sync_ph_scheduler_store_mapping()
LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_ph_scheduler_store_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
with base as (
SELECT article,ph_code,channel,l0_name 
FROM inventory_smart.ph_scheduler_mapping psm
WHERE NOT EXISTS (
    SELECT 1
    FROM inventory_smart.ph_scheduler_store_mapping psm2
    WHERE psm.ph_code = psm2.ph_code
    and psm.channel = psm2.channel
) and l0_name is not NULL),
aid as (
  select article,channel,store_code from global.product_mapping_product_store pmps 
  join  global.product_attributes_filter
  using(product_code)
  join "global".store_attributes_filter saf 
  using(store_code)
  where article in (select article from base  ) 
  and pmps.l0_name in (select l0_name from base)
  group by 1,2,3),
psm as (
  select ph_code,article,channel,store_code,l0_name,(select rule_code from inventory_smart.alloc_rule_master arm where rule_name='Default'),
     true,112,112  from "global".product_mapping_product_store pmps 
  join "global".product_attributes_filter paf
  using(product_code,l0_name)
  join "global".store_attributes_filter saf 
  using(store_code)
  join inventory_smart.ph_master pm2 
  using(article,channel,l0_name)
  where store_code in (select store_code from global.new_store_mapping))
  insert into inventory_smart.ph_scheduler_store_mapping
    select ph_code,article,channel,store_code,l0_name,(select rule_code from inventory_smart.alloc_rule_master arm where rule_name='Default'),
     true,112,112
     from aid 
join base 
using(article,channel)
where store_code  not in (select linked_store_code from global.distribution_centres)
and concat(ph_code, article,channel,store_code) not in (select concat(ph_code, article,channel,store_code) from inventory_smart.ph_scheduler_store_mapping pssm  )
union distinct 
select * from psm
where concat(ph_code, article,channel,store_code) not in (select concat(ph_code, article,channel,store_code) from inventory_smart.ph_scheduler_store_mapping pssm  )
on CONFLICT(article,channel,store_code,l0_name)
do nothing;

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

