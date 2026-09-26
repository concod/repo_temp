--liquibase formatted sql
--changeset swapnil.bhange-2:sync_sku_rule runOnChange:true stripComments:false splitStatements:false context:dg_sync labels:00071
--comment: added aggregated_store_groups part in sync_sku_rule 
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_sku_rule(bool);
CREATE OR REPLACE PROCEDURE public.sync_sku_rule(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_sku_rule';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		if _is_historic then 
            delete from 
              inventory_smart.ph_configuration_mapping 
            where 
              true;
        end if;
		INSERT INTO inventory_smart.ph_configuration_mapping (
  ph_code, channel, default_store_groups,
  default_dcs
)
select
  ph_code,
  ph.channel,
  sg_codes,
  dc_codes
from
  inventory_smart.ph_master ph
  join (
    select
      sg.channel,
      l0_code,
      l1_code,
      l3_code,
      l4_code,
      array_agg(distinct sg.sg_code) as sg_codes,
      array_agg(distinct pmsd.dc_code) as dc_codes
    from
      global.store_groups sg
      join global.aggregated_store_groups_mapping asgm on sg.sg_code = asgm.sg_code
      join "global".product_store_attributes_filter psaf on asgm.psa_code = psaf.psa_code 
      join global.product_mapping_store_dc pmsd using(store_code)
    where
      lower(name) like '%default%'
    group by
      1,2,3,4,5
  ) csd using(l0_code,l4_code,channel) on conflict do nothing;
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
