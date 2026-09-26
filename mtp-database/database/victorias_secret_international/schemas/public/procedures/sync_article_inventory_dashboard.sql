--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:article_inventory_dashboard runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-64
--comment: initial changeset for article_inventory_dashboard
--rollback: SELECT 1 
DROP PROCEDURE IF EXISTS public.sync_article_inventory_dashboard();

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
          inventory_smart.article_inventory_dashboard
        where 
          true;
        insert into inventory_smart.article_inventory_dashboard (
           article ,
	l7_name ,
	color ,
	l0_name ,
	l3_name ,
	l4_name ,
	l5_name ,
	l6_name ,
	collection ,
	masterstyle_descr ,
	subbrand_code_desc ,
	product_lifecycle ,
	current_floorset ,
	current_assortment_group ,
	flex_style ,
	generic ,
	sizes_mat ,
	form ,
	user_defined_1 ,
	user_defined_2 ,
	user_defined_3 ,
	user_defined_4 ,
	user_defined_5 ,
	store_code ,
	store_name ,
	channel ,
	planning_division ,
	partner_group_name ,
	regional_master_name ,
	store_format_description ,
	vsba_regional_dc_descr ,
	region_name ,
	s1_name ,
	s3_name ,
	s4_name ,
	store_tier ,
	choice_status,
	oh ,
	it ,
	oo ,
	wip ,
	initial_oh ,
	rfid_delta ,
	epc_units ,
	tot_inv ,
	r_site_oh ,
	r_site_oo ,
	r_site_it ,
	r_site_wip ,
	r_site_total_inv ,
	l_site_oh ,
	l_site_oo ,
	l_site_it ,
	l_site_wip ,
	l_site_total_inv ,
	last_week_sales ,
	l4w_avg_sales ,
	l12w_avg_sales ,
	week_to_date_sales ,
	last_week_revenue ,
	store_forward_wos ,
	r_site_forward_wos ,
	size_integrity_oh ,
	size_integrity_oh_oo_it ,
	aur ,
	excess ,
	normal ,
	shortfall ,
	stockout ,
	oh_dc ,
	oo_it_dc ,
	current_week_forecast ,
	next_4_week_forecast ,
	next_8_week_forecast ,
	next_20_week_forecast 

        ) 
        SELECT 
            article ,
	l7_name ,
	color ,
	l0_name ,
	l3_name ,
	l4_name ,
	l5_name ,
	l6_name ,
	collection ,
	masterstyle_descr ,
	subbrand_code_desc ,
	product_lifecycle ,
	current_floorset ,
	current_assortment_group ,
	flex_style ,
	generic ,
	sizes_mat ,
	form ,
	user_defined_1 ,
	user_defined_2 ,
	user_defined_3 ,
	user_defined_4 ,
	user_defined_5 ,
	store_code ,
	x.store_name ,
	x.channel ,
	x.planning_division ,
	x.partner_group_name ,
	x.regional_master_name ,
	x.store_format_description ,
	x.vsba_regional_dc_descr ,
	x.region_name ,
	x.s1_name ,
	x.s3_name ,
	x.s4_name ,
	store_tier ,
	choice_status,
	oh ,
	it ,
	oo ,
	wip ,
	initial_oh ,
	rfid_delta ,
	epc_units ,
	tot_inv ,
	r_site_oh ,
	r_site_oo ,
	r_site_it ,
	r_site_wip ,
	r_site_total_inv ,
	l_site_oh ,
	l_site_oo ,
	l_site_it ,
	l_site_wip ,
	l_site_total_inv ,
	last_week_sales ,
	l4w_avg_sales ,
	l12w_avg_sales ,
	week_to_date_sales ,
	last_week_revenue ,
	store_forward_wos ,
	r_site_forward_wos ,
	size_integrity_oh ,
	size_integrity_oh_oo_it ,
	aur ,
	excess ,
	normal ,
	shortfall ,
	stockout ,
	oh_dc ,
	oo_it_dc ,
	current_week_forecast ,
	next_4_week_forecast ,
	next_8_week_forecast ,
	next_20_week_forecast 
        FROM 
          public.article_inventory_dashboard x
          join global.store_master sm using(store_code);
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
