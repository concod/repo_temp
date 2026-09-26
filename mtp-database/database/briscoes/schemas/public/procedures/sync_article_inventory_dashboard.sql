-- liquibase formatted sql
-- changeset samarjit.mazumder@impactanalytics.co:sync_article_inventory_dashboard_base runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:briscoes_sync_article_inventory_dashboard
-- comment: initial changeset for sync_article_inventory_dashboard
--rollback: SELECT 1

DROP PROCEDURE if exists public.sync_article_inventory_dashboard();

CREATE OR REPLACE PROCEDURE public.sync_article_inventory_dashboard()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_inventory_dashboard';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		delete from 
 		  inventory_smart.article_inventory_dashboard_base
 		where 
 		  true;
 		insert into inventory_smart.article_inventory_dashboard_base (
			article, 
			l0_name,
			l1_name,
			l2_name,
			l3_name,
		--	l4_name,
			l5_name,
			l6_name,
			store_code,
			sales_org_name,
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
			dc_oh_oo_it_wos,
			dc_oh_wos,
			dc_oh_oo_wos,
 			lw_units,
 			promo_percentage,
 			stockout,
 			tot_inv,
 			si,
            si_oh_it,
            si_oh_oo_it ,
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
            style_color_status,
            -----Newly added
            product_type,
            -----Newly added1
            store_name,
            twos,
            sales_5_ago,
           sales_6_ago,
           sales_7_ago,
           sales_8_ago,
          style_name,
           grade,
           average_discount,
           price,
		   lw_margin_percentage
           )
		SELECT 
		    a.article,  
		    pm.l0_name, 
		    pm.l1_name, 
		    pm.l2_name, 
		    pm.l3_name, 
		--    pm.l4_name,
		    pm.l5_name,
			pm.l6_name,
		    a.store_code, 
		    sales_org_name,
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
			dc_oh_oo_it_wos,
			dc_oh_wos,
			dc_oh_oo_wos,
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
            style_color_status,
            -------Newly added
            product_type,
            -----Newly added1
            store_name,
            frt.twos,
            sales_5_ago,
           sales_6_ago,
           sales_7_ago,
           sales_8_ago,
          style_name,
           grade,
           average_discount,
           price,
		   lw_margin_percentage
            
        FROM  
        (select distinct  
        	article,
 			store_code,
            sales_org_name,
 			lw_revenue,
 			lw_margin,
 			lw_units,
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
			dc_oh_oo_it_wos,
			dc_oh_wos,
			dc_oh_oo_wos,
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
            style_color_status,
            -------Newly added
            product_type,
            sales_5_ago,
           sales_6_ago,
           sales_7_ago,
           sales_8_ago,
           style_name,
           grade,
           average_discount,
           price,
		   lw_margin_percentage
        from public.article_inventory_dashboard) a
        join
        (select 
        distinct article
--        , style, style_description
         
        , l0_name
        , l1_name
        , l2_name
        , l3_name
    --    , l4_name
        , l5_name
		,l6_name 
        from "global".product_attributes_filter
		where active is true) pm
        using(article)
        join
        (select store_code, store_name from "global".store_attributes_filter where active) sm
        using(store_code)
        left join (select article,store_code,avg(wos) as twos from inventory_smart.final_result_table frt 
        join global.product_attributes_filter using(product_code)
        group by 1,2) frt on a.article=frt.article and a.store_code=frt.store_code;
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



