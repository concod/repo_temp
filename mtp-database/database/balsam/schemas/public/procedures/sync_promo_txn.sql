-- liquibase formatted sql
-- changeset abhishek.verma@impactanalytics.co:sync_promo_txn runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_promo_txn
-- comment: derived table for promo_txn

DROP PROCEDURE IF EXISTS public.sync_promo_txn;
create or replace procedure public.sync_promo_txn()
language plpgsql
security definer
as $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_promo_txn';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	TRUNCATE TABLE price_promo_opt.promo_txn;
	call price_promo_opt.pc_create_date_partitions('price_promo_opt', 'promo_txn', 'day', '3 year', 'backward');
    call price_promo_opt.pc_create_date_partitions('price_promo_opt', 'promo_txn', 'day', '4 week', 'backward');

	insert into price_promo_opt.promo_txn
	(product_id, date_id, store_id, currency, currency_id, no_of_txn, cost, base_price_with_vat, 
	base_price, base_price_secondary, retail_price_with_vat, retail_price, gross_quantity, 
	gross_revenue, gross_revenue_with_vat, gross_margin, gross_margin_with_vat, gross_sp_with_vat, 
	gross_sp, gross_dis_amount_with_vat, gross_dis_amount, gross_dis_perc, gross_dis_perc_with_vat, 
	final_discount_percent_with_vat, final_discount_percent, final_amount, final_amount_with_vat, 
	promo_amount, promo_amount_with_vat, promo_discount, promo_discount_with_vat, coupon_amount_with_vat, 
	coupon_amount, coupon_discount, coupon_discount_with_vat, aur, aur_with_vat, aum, aum_with_vat, total_inv, 
	vat_rate_per, clearance_indicator

)
	select 
	product_id, date_id, store_id, currency, currency_id, no_of_txn, cost, base_price_with_vat, 
	base_price, base_price_secondary, retail_price_with_vat, retail_price, gross_quantity, 
	gross_revenue, gross_revenue_with_vat, gross_margin, gross_margin_with_vat, gross_sp_with_vat, 
	gross_sp, gross_dis_amount_with_vat, gross_dis_amount, gross_dis_perc, gross_dis_perc_with_vat, 
	final_discount_percent_with_vat, final_discount_percent, final_amount, final_amount_with_vat, 
	promo_amount, promo_amount_with_vat, promo_discount, promo_discount_with_vat, coupon_amount_with_vat, 
	coupon_amount, coupon_discount, coupon_discount_with_vat, aur, aur_with_vat, aum, aum_with_vat, total_inv, 
	vat_rate_per, clearance_indicator
	from public.promo_txn;
	
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$;