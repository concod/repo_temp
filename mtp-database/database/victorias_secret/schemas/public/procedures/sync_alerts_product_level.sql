--liquibase formatted sql
--changeset anujkumar.singh@impactanalytics.co:sync_alerts_product_level_v5 runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-430
--comment: Added product group
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
			generic,
			l2_name,
			l3_name,
			l4_name,
			form  ,
			l6_name  ,
			flex_style  ,
			l5_name  ,
			color  ,
			launch_floorset  ,
			sizes_mat ,
			new_choice_flag ,
			upcoming_po ,
			oh ,
			it ,
			oo ,
			oh_dc ,
			forecast_over_target_wos ,
			wip ,
			user_defined_1  ,
			user_defined_2  ,
			user_defined_3  ,
			user_defined_4  ,
			user_defined_5  ,
			user_defined_6  ,
			floorset_end_date ,
			floorset_start_date ,
			launch_date ,
			next_po_upcoming_date,
			collection,		
			masterstyle_descr,			
			subbrand_code_desc,			
			product_lifecycle,
			store_count,
			product_group,
			current_assortment_group,
			current_floorset
		) 
		SELECT 
			choice,
			l0_name,
			generic,
			l2_name,
			l3_name,
			l4_name,
			form  ,
			l6_name  ,
			flex_style  ,
			l5_name  ,
			color  ,
			launch_floorset  ,
			sizes_mat ,
			new_choice_flag ,
			upcoming_po ,
			oh ,
			it ,
			oo ,
			oh_dc ,
			forecast_over_target_wos ,
			wip ,
			user_defined_1  ,
			user_defined_2  ,
			user_defined_3  ,
			user_defined_4  ,
			user_defined_5  ,
			user_defined_6  ,
			floorset_end_date ,
			floorset_start_date ,
			launch_date ,
			next_po_upcoming_date,
			collection,		
			masterstyle_descr,			
			subbrand_code_desc,			
			product_lifecycle,
			store_count,
			b.product_group,
			current_assortment_group,
			current_floorset
		FROM 
		  public.new_choices_allocation_alert a 
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
				on a.choice=b.article
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
