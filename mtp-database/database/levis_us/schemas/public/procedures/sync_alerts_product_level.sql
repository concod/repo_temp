--liquibase formatted sql
--changeset prince.kumar@impactanalytics.co:adding_on_floor_date and markdown_date runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: adding_on_floor_date and markdown_date
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
       --deleting the table
       delete from
         inventory_smart.alerts_product_level
       where
         true;
       -- insert everything 
       insert into inventory_smart.alerts_product_level (
          l7_code, article, color, l3_name, l4_name, l5_name, l6_name, store_oh, store_it, store_oo, available_dc_oh, last_week_sales, last_week_revenue, last_4_week_sales, instock_percentage, fwos_target, door_count, vir_reservation_remaining_pdu_remaining, iob, forecast, dc_mapped, stockout_flag, shortfall_flag, overstock_flag, last_4_weeks_actuals, last_4_weeks_forecast, next_4_weeks_forecast, deviation_percentage, ly_past_4_week_actual, ly_next_4_week_actual, ly_deviation_percentage, past_4_week_actual, forecast_deviation_percentage, past_4_week_actual_store_count, next_4_week_store_count, store_count_deviation_percentage, past_4_week_actual_promo, next_4_week_planned_promo, promo_deviation_percentage, absolute_error, accuracy, past_4_week_forecast, forecast_error_perc_flag, recent_deviation_flag, new_products_flag, in_season_flag, stockout_is_resolved, shortfall_is_resolved, overstock_is_resolved, forecast_error_perc_is_resolved, recent_deviation_is_resolved, new_products_is_resolved, in_season_is_resolved, l0_name, l2_name, article_description, display_article, product_group, l1_name, dc_assignment, next_4_weeks_wsp, absolute_error_wsp_vs_fore, deviation_percentage_wsp_vs_fore, wsp_vs_fore_deviation_flag, wsp_vs_fore_deviation_is_resolved, on_floor_date, markdown_date
       )
       SELECT
          l7_code, article, color, l3_name, l4_name, l5_name, l6_name, store_oh, store_it, store_oo, available_dc_oh::jsonb, last_week_sales, last_week_revenue, last_4_week_sales, instock_percentage, fwos_target, door_count, vir_reservation_remaining_pdu_remaining::jsonb, iob::jsonb, forecast, dc_mapped, stockout_flag, shortfall_flag, overstock_flag, last_4_weeks_actuals, last_4_weeks_forecast, next_4_weeks_forecast, deviation_percentage, ly_past_4_week_actual, ly_next_4_week_actual, ly_deviation_percentage, past_4_week_actual, forecast_deviation_percentage, past_4_week_actual_store_count, next_4_week_store_count, store_count_deviation_percentage, past_4_week_actual_promo, next_4_week_planned_promo, promo_deviation_percentage, absolute_error, accuracy, past_4_week_forecast, forecast_error_perc_flag, recent_deviation_flag, new_products_flag, in_season_flag, stockout_is_resolved, shortfall_is_resolved, overstock_is_resolved, forecast_error_perc_is_resolved, recent_deviation_is_resolved, new_products_is_resolved, in_season_is_resolved, l0_name, l2_name, article_description, display_article, product_group, l1_name, dc_mapped as dc_assignment, next_4_weeks_wsp, absolute_error_wsp_vs_fore, deviation_percentage_wsp_vs_fore, wsp_vs_fore_deviation_flag, wsp_vs_fore_deviation_is_resolved,on_floor_date, markdown_date
       FROM
         public.alerts_product_level x
       left join
			(
			select distinct article,array(SELECT jsonb_array_elements_text(product_group::jsonb))::varchar[] as product_group from
			(
			select distinct article,product_groups ->> 'name' as product_group
			from
				(
				select
					article,
					json_build_object(
					'name',
					array_agg(distinct name)) as product_groups
				from
					(
					select
						distinct a.product_code,
						paf.article,
						a.pg_code,
						b.name
					from
						global.product_groups_mapping a
					inner join (
						select
							distinct pg_code,
							name,
							is_deleted
						from
							global.product_groups) b
							using(pg_code)
					inner join global.product_attributes_filter paf
					using(product_code)
					where b.is_deleted is false ) b
				group by
					1
				) a ) b ) b
				using(article);
        
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