--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:sync_article_inventory_dashboard runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:sm_sync_article_inventory_dashboard
--comment: initial changeset for sync_article_inventory_dashboard
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_article_inventory_dashboard(IN _is_historic boolean);
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
 			store_code,
 			lw_revenue,
 			lw_margin,
 			oh,
 			oo,
 			it,
 			store_level_prediction,
 			oh_dc,
 			shortfall,
 			normal,
 			excess,
 			wos,
            wos_oh,
            wos_oh_it,
 			lw_qty,
 			promo_percentage,
 			stockout,
 			tot_inv,
 			si,
            si_oh_it,
            si_oh_oo_it,
 			available_stores_percentage,
 			week_to_date_sales,
 			last_day_sales,
 			oo_dc,
 			it_dc,
 			channel,
 			sales_1_ago,
 			sales_2_ago,
 			sales_3_ago,
 			sales_4_ago,
            aur,
            sell_through_rate,
            style_color_status
 		) 
 		SELECT 
 		    article,
 			store_code,
 			lw_revenue,
 			lw_margin,
 			oh,
 			oo,
 			it,
 			store_level_prediction,
 			oh_dc,
 			shortfall,
 			normal,
 			excess,
 			wos,
            wos_oh,
            wos_oh_it,
 			lw_units,
 			promo_percentage,
 			stockout,
 			tot_inv,
 			size_integrity,
            size_integrity_oh_it,
            size_integrity_oh_oo_it,
 			available_stores_percentage,
 			week_to_date_sales,
 			last_day_sales,
 			oo_dc,
 			it_dc,
 			channel,
 			sales_1_ago,
 			sales_2_ago,
 			sales_3_ago,
 			sales_4_ago,
            aur,
            sell_through_rate,
            style_color_status
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
