--liquibase formatted sql
--changeset aman.lakkoju:Added_added_article_alert_flag_ sync_article_inventory_dashboard  runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Added_added_article_alert_flag_
--rollback: SELECT 1

DROP PROCEDURE if exists public.sync_article_inventory_dashboard();
CREATE OR REPLACE PROCEDURE public.sync_article_inventory_dashboard(IN _is_historic boolean DEFAULT true)
 LANGUAGE plpgsql
AS $procedure$
declare
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_inventory_dashboard';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		if _is_historic then 
	 		select async_query into _worker from public.async_query('delete from 
	 		  inventory_smart.article_inventory_dashboard 
	 		where 
	 		  true;');
			perform public.async_query_status(_worker, 'cleanup');
			raise notice 'Step1: %', (clock_timestamp() - _st);
 			-- perform global.create_drop_index_list_ingestion('inventory_smart', 'article_inventory_dashboard', true);
 			-- raise notice 'Step2: %', (clock_timestamp() - _st);
 		end if;
 		perform public.parellel_insert('WITH rows AS ( insert into inventory_smart.article_inventory_dashboard (
			article,
			style,
			style_description,
			l0_name,
			l1_name,
			l2_name,
			primary_trait_id,
			l3_name,
			l4_name,
			l5_name,
			product_type,
			item_status,
			launch_date,
			clearance,
			clearance_start_date,
			store_code,
			store_name,
			store_tier,
			price,
			msrp,
			oh,
			it,
			oo,
			tot_inv,
			twos,
			wtd_units,
			lw_units,
			lw_margin,
			lw_revenue,
			w2_units,
			w3_units,
			w4_units,
			w5_units,
			w6_units,
			w7_units,
			w8_units,
			l4w_units,
			l4w_revenue,
			l8w_units,
			l6m_units,
			discount,
			wos_oh_oo_it,
			wos_oh_oo,
			wos_oh_it,
			wos_oh,
			dc_wos_oh_oo_it,
			dc_wos_oh_oo,
			dc_wos_oh,
			stockout,
			shortfall,
			excess,
			normal,
			article_alert_flag,
			sell_through_perc,
			instock_perc,
			dc_instock_perc,
			ata_eaches,
			ata_packs,
			ata,
			dc_instock,
			oo_dc,
			in_stock,
			in_stock_count,
			total_count,
			dc_instock_count,
			dc_instock_total_count,
			in_stock_dc_ata_count,
			in_stock_dc_ata_total_count,
			in_stock_ata,
			allocated_units,
			promo_percentage,
			oh_dc,
			it_dc,
			channel,
			primary_trait_desc
			

 		) 
 		SELECT 
			article,
			style,
			style_description,
			l0_name,
			l1_name,
			l2_name,
			primary_trait_id,
			l3_name,
			l4_name,
			l5_name,
			product_type,
			item_status,
			launch_date,
			clearance,
			clearance_start_date,
			store_code,
			store_name,
			store_tier,
			price,
			msrp,
			oh,
			it,
			oo,
			total_inv,
			twos,
			wtd_units,
			lw_units,
			lw_margin,
			lw_revenue,
			w2_units,
			w3_units,
			w4_units,
			w5_units,
			w6_units,
			w7_units,
			w8_units,
			l4w_units,
			l4w_revenue,
			l8w_units,
			l6m_units,
			discount,
			wos_oh_oo_it,
			wos_oh_oo,
			wos_oh_it,
			wos_oh,
			dc_wos_oh_oo_it,
			dc_wos_oh_oo,
			dc_wos_oh,
			stockout,
			shortfall,
			excess,
			normal,
			article_alert_flag,
			sell_through_perc,
			instock_perc,
			dc_instock_perc,
			ata_eaches,
			ata_packs,
			ata,
			dc_instock,
			oo_dc,
			in_stock,
			in_stock_count,
			total_count,
			dc_instock_count,
			dc_instock_total_count,
			in_stock_dc_ata_count,
			in_stock_dc_ata_total_count,
			in_stock_ata,
			allocated_units,
			promo_percentage,
			oh_dc,
			it_dc,
			channel,
			primary_trait_desc

 		FROM 
 		  public.article_inventory_dashboard {where} RETURNING 1
		) 
		SELECT 
		  count(1) as cnt 
		FROM 
		  rows;', 50, 'public.article_inventory_dashboard', 'store_code', 'paid_store_idx');
		raise notice 'Step2: %', (clock_timestamp() - _st);
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