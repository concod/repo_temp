-- liquibase formatted sql
-- changeset shameel.zeshan@impactanalytics.co:sync_alerts_product_level runOnChange:true stripComments:false splitStatements:false context:added clearance_flag labels: adding clearance_flag
-- comment: adding clearance_flag

DROP  PROCEDURE if exists public.sync_alerts_product_level();

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
	         
	        INSERT INTO inventory_smart.alerts_product_level
	        (
	        article,
			style,
	        style_description, l0_name, l1_name, l2_name, l3_name, 
 			l4_name, season, gender, l5_name, collection, 
 			class, subclass,sty_primary_occsn_end_use_dsc,
 			product_type,launch_date,clearance_flag, clearance, planned_clearance_date,
			overstock_flag,
			understock_flag,
			stockout_flag,
			depleting_flag,
			define_clearance_flag,
			first_markdown_flag,
			style_first_allocation_flag,
			os_is_resolved,
			us_is_resolved,
			sk_is_resolved,
			dp_is_resolved,
			dc_is_resolved,
			fm_is_resolved,
			sfa_is_resolved,
			overstock_net_dc_available_incoming,
			understock_net_dc_available_incoming,
			overstock_planned_clearance_date,
			understock_planned_clearance_date,
			define_clearance_strategy_planned_clearance_date,
			first_markdown_planned_clearance_date,
			overstock_total_wos,
			understock_total_wos,
			overstock_style_life_cycle,
			understock_style_life_cycle,
			stockout_instock_per,
			stockout_ata,
			depleting_ata,
			define_clearance_strategy_ata,
			first_markdown_planned_clearance_ata,
			stockout_str_oh,
			depleting_dc_oh_wos,
			sfa_launch_date,
    		sfa_ata,
    		sfa_packs,
    		sfa_eaches,
			product_group
	        )
			select a.article,
			style,
			style_description, l0_name, l1_name, l2_name, l3_name, 
 			l4_name, season, gender, l5_name, collection,
 			class, subclass,sty_primary_occsn_end_use_dsc,
 			product_type,launch_date,clearance_flag, clearance, planned_clearance_date,
			overstock_flag,
			understock_flag,
			stockout_flag,
			depleting_flag,
			define_clearance_flag,
			first_markdown_flag,
			style_first_allocation_flag,
			os_is_resolved,
			us_is_resolved,
			sk_is_resolved,
			dp_is_resolved,
			dc_is_resolved,
			fm_is_resolved,
			sfa_is_resolved,
			overstock_net_dc_available_incoming,
			understock_net_dc_available_incoming,
			overstock_planned_clearance_date,
			understock_planned_clearance_date,
			define_clearance_strategy_planned_clearance_date,
			first_markdown_planned_clearance_date,
			overstock_total_wos,
			understock_total_wos,
			overstock_style_life_cycle,
			understock_style_life_cycle,
			stockout_instock_per,
			stockout_ata,
			depleting_ata,
			define_clearance_strategy_ata,
			first_markdown_planned_clearance_ata,
			stockout_str_oh,
			depleting_dc_oh_wos,
			sfa_launch_date,
    		sfa_ata,
    		sfa_packs,
    		sfa_eaches,
    		b.product_group
			from public.alerts_product_level a
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
				using(article)
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
