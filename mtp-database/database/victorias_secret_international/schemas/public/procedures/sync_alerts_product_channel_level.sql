--liquibase formatted sql
--changeset pradeep.kumar:sync_alerts_product_channel_level_test runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_alert_pc_level
--comment: initial changeset for sync_alerts_product_channel_level

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
INSERT INTO
  inventory_smart.alerts_product_channel_level (
	article,
    l7_name,
    channel,
    color,
    l0_name,
    l3_name,
    l4_name,
    l5_name,
    l6_name,
    flex_style,
    generic,
    sizes_mat,
    form,
    user_defined_1,
    user_defined_2,
    user_defined_3,
    user_defined_4,
    user_defined_5,
    product_lifecycle,
    subbrand_code_desc,
    masterstyle_descr,
    total_inv,
    dc_oh,
    forecast_21_28_weeks,
    ly_21_28_weeks,
    lr_ly_deviation,
    ly_store_count,
    forecasted_store_count,
    lr_store_count_deviation,
    ly_week_promo,
    forecasted_promo,
    lr_promo_deviation,
    past_4_weeks_actual,
    next_4_weeks_mfp_forecast,
    next_4_weeks_forecast,
    ly_deviation,
    store_count_deviation,
    promo_deviation,
    mfp_deviation,
    ly_past_4_weeks_actual,
    ly_next_4_weeks_actual,
    recent_deviation,
    past_4_weeks_store_count,
    next_4_weeks_store_count,
    past_4_weeks_actual_promo,
    next_4_weeks_planned_promo,
    past_4_weeks_planned_promo,
    past_4_weeks_forecast,
    absolute_error,
    accuracy,
    allocate_and_replen_choices_flag,
    recently_launched_flag,
    recent_deviation_flag,
    ia_vs_mfp_flag,
    long_range_flag,
    allocate_replen_tag,
    floorset_name,
    floorset_start_date,
    floorset_end_date)
SELECT
	  src.article,
	  src.l7_name,
	  src.channel,
	  src.color,
	  src.l0_name,
	  src.l3_name,
	  src.l4_name,
	  src.l5_name,
	  src.l6_name,
	  src.flex_style,
	  src.generic,
	  src.sizes_mat,
	  src.form,
	  src.user_defined_1,
	  src.user_defined_2,
	  src.user_defined_3,
	  src.user_defined_4,
	  src.user_defined_5,
	  src.product_lifecycle,
	  src.subbrand_code_desc,
	  src.masterstyle_descr,
	  src.total_inv,
	  src.dc_oh,
	  src.forecast_21_28_weeks,
	  src.ly_21_28_weeks,
	  src.lr_ly_deviation,
	  src.ly_store_count,
	  src.forecasted_store_count,
	  src.lr_store_count_deviation,
	  src.ly_week_promo,
	  src.forecasted_promo,
	  src.lr_promo_deviation,
	  src.past_4_weeks_actual,
	  src.next_4_weeks_mfp_forecast,
	  src.next_4_weeks_forecast,
	  src.ly_deviation,
	  src.store_count_deviation,
	  src.promo_deviation,
	  src.mfp_deviation,
	  src.ly_past_4_weeks_actual,
	  src.ly_next_4_weeks_actual,
	  src.recent_deviation,
	  src.past_4_weeks_store_count,
	  src.next_4_weeks_store_count,
	  src.past_4_weeks_actual_promo,
	  src.next_4_weeks_planned_promo,
	  src.past_4_weeks_planned_promo,
	  src.past_4_weeks_forecast,
	  src.absolute_error,
	  src.accuracy,
	  src.allocate_and_replen_choices_flag,
	  src.recently_launched_flag,
	  src.recent_deviation_flag,
	  src.ia_vs_mfp_flag,
	  src.long_range_flag,
	  src.allocate_replen_tag,
	  src.floorset_name,
	  src.floorset_start_date,
	  src.floorset_end_date
FROM
  public.choice_channel_level_alerts AS src
ON CONFLICT DO nothing;
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