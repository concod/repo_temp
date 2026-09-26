--liquibase formatted sql
--changeset anujkumar.singh@impactanalytics.co:sync_alerts_product_store_level_v3 runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-132
--comment: Added product group
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_alerts_product_store_level();
DROP PROCEDURE IF EXISTS public.sync_alerts_product_store_level(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_alerts_product_store_level()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_alerts_product_store_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.alerts_product_store_level 
		where 
		  true; 

		INSERT INTO inventory_smart.alerts_product_store_level (
			article ,
			store_code ,
			l0_name ,
			sizes_mat,
			l2_name ,
			l3_name ,
			l4_name ,
			l6_name,
			store_name,
			l5_name,
			user_defined_3,
			user_defined_5,
			generic,
			user_defined_6,
			user_defined_1,
			form,
			user_defined_2,
			flex_style,
			color,
			store_tier,
			user_defined_4 ,
			below_mins_flag,
			location_hierarchy_region_code,
			stockout_and_shortfall_flag,
			oh,
			it,
			oo,
			it_dc,
			lw_revenue,
			forward_wos,
			lw_gm_perc,
			promo_percentage,
			target_wos,
			stockout,
			week_to_day_sales,
			excess,
			oh_dc,
			l4w_avg_sales,
			lw_sales,
			min,
			normal,
			oo_dc,
			shortfall,
			size_integrity_oh,
			size_integrity_oh_oo_it,
			aur,
			below_mins_ind,
			sizes_count,
			total_inv,
			s1_name,
			inventory_status,
			s3_name,
			s4_name,
			allocate_replen_tag,
			wip,
			channel,
			collection,		
			masterstyle_descr,			
			subbrand_code_desc,			
			product_lifecycle,
			product_group,
			current_assortment_group,
			current_floorset
		) 
		SELECT 
			a.article ,
			store_code ,
			l0_name ,
			sizes_mat,
			l2_name ,
			l3_name ,
			l4_name ,
			l6_name,
			store_name,
			l5_name,
			user_defined_3,
			user_defined_5,
			generic,
			user_defined_6,
			user_defined_1,
			form,
			user_defined_2,
			flex_style,
			color,
			store_tier,
			user_defined_4 ,
			below_mins_flag,
			location_hierarchy_region_code,
			stockout_and_shortfall_flag,
			oh,
			it,
			oo,
			it_dc,
			lw_revenue,
			forward_wos,
			lw_gm_perc,
			promo_percentage,
			target_wos,
			stockout,
			week_to_day_sales,
			excess,
			oh_dc,
			l4w_avg_sales,
			lw_sales,
			min,
			normal,
			oo_dc,
			shortfall,
			size_integrity_oh,
			size_integrity_oh_oo_it,
			aur,
			below_mins_ind,
			sizes_count,
			total_inv,
			s1_name,
			inventory_status,
			s3_name,
			s4_name,
			allocate_replen_tag,
			wip,
			channel,
			collection,		
			masterstyle_descr,			
			subbrand_code_desc,			
			product_lifecycle,
			b.product_group,
			current_assortment_group,
			current_floorset
		FROM 
		  public.choice_store_level_alerts a 
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
