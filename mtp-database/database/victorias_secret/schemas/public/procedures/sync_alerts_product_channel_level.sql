--liquibase formatted sql
--changeset anujkumar.singh@impactanalytics.co:sync_alerts_product_channel_level_v3 runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-134
--comment: Added product group
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
			oh_dc,
			next_4_weeks_forecast,
			past_4_weeks_actual,
			past_4_weeks_forecast,
			absolute_error,
			ly_deviation,
			accuracy,
			ly_next_4_weeks_actual,
			mfp_deviation,
			recent_deviation,
			next_4_weeks_store_count,
			allocate_replen_flag,
			past_4_weeks_store_count,
			recent_deviation_flag,
			mfp_deviation_flag,
			l6_name,
			color,
			l0_name,
			l2_name,
			l3_name,
			l4_name,
			l5_name,
			flex_style,
			generic,
			sizes_mat,
			form,
			user_defined_1,
			user_defined_2,
			user_defined_3,
			user_defined_4,
			user_defined_5,
			user_defined_6,
			allocate_replen_tag,
			ly_past_4_weeks_actual,
			next_4_weeks_mfp_forecast,
			next_4_weeks_planned_promo,
			past_4_weeks_actual_promo,
			past_4_weeks_planned_promo,
			promo_deviation,
			recently_launched_choice_flag,
			store_count_deviation,
			total_inv,
			collection,		
			masterstyle_descr,			
			subbrand_code_desc,			
			product_lifecycle,
			product_group,
			current_assortment_group,
			current_floorset
		) 
		SELECT 
			a.article,
			channel,
			dc_oh,
			next_4_weeks_forecast,
			past_4_weeks_actual,
			past_4_weeks_forecast,
			absolute_error,
			ly_deviation,
			accuracy,
			ly_next_4_weeks_actual,
			mfp_deviation,
			recent_deviation,
			next_4_weeks_store_count,
			allocate_replen_flag,
			past_4_weeks_store_count,
			recent_deviation_flag,
			mfp_deviation_flag,
			l6_name,
			color,
			l0_name,
			l2_name,
			l3_name,
			l4_name,
			l5_name,
			flex_style,
			generic,
			sizes_mat,
			form,
			user_defined_1,
			user_defined_2,
			user_defined_3,
			user_defined_4,
			user_defined_5,
			user_defined_6,
			allocate_replen_tag,
			ly_past_4_weeks_actual,
			next_4_weeks_mfp_forecast,
			next_4_weeks_planned_promo,
			past_4_weeks_actual_promo,
			past_4_weeks_planned_promo,
			promo_deviation,
			recently_launched_choice_flag,
			store_count_deviation,
			total_inv,
			collection,		
			masterstyle_descr,			
			subbrand_code_desc,			
			product_lifecycle,
			b.product_group,
			current_assortment_group,
			current_floorset
		FROM 
		  public.choice_channel_level_alerts a
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
				on a.article=b.article
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
