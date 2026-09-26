--liquibase formatted sql
--changeset kaustubh.gupta:sync_alerts_product_level runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_alerts_product_level
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_alerts_product_level();
CREATE OR REPLACE PROCEDURE public.sync_alerts_product_level()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_alerts_product_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.alerts_product_level
		where 
		  true; 


		INSERT INTO inventory_smart.alerts_product_level (
			article,
			l0_name,
			l1_name,
			l2_name,
			primary_trait_desc,
			l3_name,
			l4_name,
			l5_name,
			channel,
			product_description,
			excs_flg,
			shrtfl_flg,
			stckout_flg,
			excess,
			shortfall,
			stockout,
			normal,
			oh,
			it,
			oo,
			lw_units,
			lw_revenue,
			lw_margin,
			size_integrity,
			clearance_alert_flag,
			newly_launched_alert_flag,
			retirement_alert_flag,
			tot_inv,
			promo_percentage,
			wos_oh,
			wos_oh_it,
			wos_oh_oo_it,
			launch_date,
			stockout_is_resolved,
			shortfall_is_resolved,
			overstock_is_resolved
		) 
		SELECT 
			article,
			l0_name,
			l1_name,
			l2_name,
			primary_trait_desc,
			l3_name,
			l4_name,
			l5_name,
			channel,
			product_description,
			excs_flg,
			shrtfl_flg,
			stckout_flg,
			excess,
			shortfall,
			stockout,
			normal,
			oh,
			it,
			oo,
			lw_units,
			lw_revenue,
			lw_margin,
			size_integrity,
			clearance_alert_flag,
			newly_launched_alert_flag,
			retirement_alert_flag,
			tot_inv,
			promo_percentage,
			wos_oh,
			wos_oh_it,
			wos_oh_oo_it,
			launch_date,
			0 as stockout_is_resolved,
			0 as shortfall_is_resolved,
			0 as overstock_is_resolved
		FROM 
		  public.alerts_product_level;
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
