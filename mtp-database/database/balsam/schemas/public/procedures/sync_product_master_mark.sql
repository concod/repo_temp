-- liquibase formatted sql
-- changeset abhishek.verma@impactanalytics.co:sync_product_master_mark runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_product_master_mark
-- comment: derived table for product_master

DROP PROCEDURE IF EXISTS public.sync_product_master_mark;

create or replace procedure public.sync_product_master_mark()
language plpgsql
security definer
as $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_master_mark';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	 
    TRUNCATE TABLE price_markdown.product_master;

	insert into price_markdown.product_master
	(brandsku, l0_name, currency, l0_id, l0_cuq, l0_cid, l1_id, l1_name, l1_cuq, l1_cid, l2_id,	 l2_name, 
	l2_cuq, l2_cid, l3_id, l3_name, l3_cuq, l3_cid, l4_id, l4_name, l4_cuq, l4_cid, brand, brand_cid, org_brand, 
	l5_id, l5_name, l5_cuq, l5_cid, l6_id, l6_name, l6_cuq, l6_cid, product_id, product_name, product_cuq, msrp_with_vat, 
	current_price_with_vat, cost_usd, lifecycle, drop_ship, status_id, status, light_type_id, light_type, realism_id, realism, 
	size_id, size, ecom_age, max_age, store_age, age_month_bucket, vat_rate_per, sku, avg_sale_price, avg_sale_price_with_vat, 
	currency_id, msrp, current_price, current_price_usd, active, is_active, clearance_indicator, derived_status, derived_status_id, 
	cost, last_reg_price_bnm, last_reg_price_bnm_with_vat, last_reg_price_ecom, last_reg_price_ecom_with_vat, current_price_with_vat_usd, 
	msrp_with_vat_usd

)
	select 
	brandsku, l0_name, currency, l0_id, l0_cuq, l0_cid, l1_id, l1_name, l1_cuq, l1_cid, l2_id,	 l2_name, 
	l2_cuq, l2_cid, l3_id, l3_name, l3_cuq, l3_cid, l4_id, l4_name, l4_cuq, l4_cid, brand, brand_cid, org_brand, 
	l5_id, l5_name, l5_cuq, l5_cid, l6_id, l6_name, l6_cuq, l6_cid, product_id, product_name, product_cuq, msrp_with_vat, 
	current_price_with_vat, cost_usd, lifecycle, drop_ship, status_id, status, light_type_id, light_type, realism_id, realism, 
	size_id, size, ecom_age, max_age, store_age, age_month_bucket, vat_rate_per, sku, avg_sale_price, avg_sale_price_with_vat, 
	currency_id, msrp, current_price, current_price_usd, active, is_active, clearance_indicator, derived_status, derived_status_id, 
	cost, last_reg_price_bnm, last_reg_price_bnm_with_vat, last_reg_price_ecom, last_reg_price_ecom_with_vat, current_price_with_vat_usd, 
	msrp_with_vat_usd
    from public.product_master_pricesmart;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$;