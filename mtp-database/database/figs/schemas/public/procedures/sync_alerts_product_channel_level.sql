--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:sync_alerts_product_channel_level_figs runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-134
--comment: added sp to product channel level forcast alerts
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_alerts_product_channel_level();
CREATE OR REPLACE PROCEDURE public.sync_alerts_product_channel_level()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_alerts_product_channel_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.alerts_product_channel_level 
		where 
		  true; 

		INSERT INTO inventory_smart.alerts_product_channel_level ( 
			article,
			channel,
            l0_name,
            l1_name,
            l2_name,
            l3_name,
            style_name,
			color_id,
			style_type,
			f_style_fabric,
			replenish_status,
            oh_dc,
            total_inv,
            actual_promo_percentage,
            planned_promo_percentage,
			next_4_weeks_forecast,
			past_4_weeks_actual,
			past_4_weeks_forecast,
			recent_deviation,
            recent_deviation_flag,
            carry_over_exp_flag,
            core_exp_flag			
		) 
		SELECT 
		distinct 
			a.article,
			channel,
            a.l0_name,
            a.l1_name,
            a.l2_name,
            a.l3_name,
            a.style_name,
			paf.color_id,
			paf.style_type,
			paf.f_style_fabric,
			paf.replenish_status,
            oh_dc,
            total_inv,
            actual_promo_percentage,
            planned_promo_percentage,
			next_4_weeks_forecast,
			past_4_weeks_actual,
			past_4_weeks_forecast,
			recent_deviation,
            recent_deviation_flag,
            carry_over_exp_flag,
            core_exp_flag
		FROM 
		  public.alerts_product_channel_level a
		  LEFT JOIN global.product_attributes_filter paf ON a.article = paf.article
          where not paf.is_deleted
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