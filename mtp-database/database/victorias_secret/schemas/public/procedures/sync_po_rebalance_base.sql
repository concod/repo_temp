--liquibase formatted sql
--changeset saumya.agnihotri@impactanalytics.co:sync_po_rebalance_base runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for sync_po_rebalance_base

DROP PROCEDURE IF EXISTS public.sync_po_rebalance_base(bool);
CREATE OR REPLACE PROCEDURE public.sync_po_rebalance_base(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_po_rebalance_base';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  if _is_historic then
            delete from
              inventory_smart.po_rebalance_base
            where
              true;
        end if;
INSERT INTO inventory_smart.po_rebalance_base
  (	
    product_code,
	loc_code,
	channel,
	fiscal_year_week,
	dc_inv_bop_post_allocation,
	po_inbound,
	total_store_forecast,
	total_store_wos_demand,
	total_target_store_inv,
	store_allocation_unconstrained,
	l4w_ss,
	lw_ss,
	total_store_bop_inv,
	safety_stock,
	dc_inv_wos,
	store_inv_wos
  )
SELECT
    product_code,
	loc_code,
	channel,
	fiscal_year_week,
	dc_inv_bop_post_allocation,
	po_inbound,
	total_store_forecast,
	total_store_wos_demand,
	total_target_store_inv,
	store_allocation_unconstrained,
	l4w_ss,
	lw_ss,
	total_store_bop_inv,
	safety_stock,
	dc_inv_wos,
	store_inv_wos
from
    public.po_rebalance_base as p ;
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