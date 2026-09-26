--liquibase formatted sql
--changeset sreevathsa.sp:sync_promo_txn_master_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_promo_txn_master
--comment: sync promo_txn_master from public.promo_txn_master
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_promo_txn_master();

CREATE OR REPLACE PROCEDURE public.sync_promo_txn_master()
 LANGUAGE plpgsql
AS $procedure$

declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_promo_txn_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_worker text;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

		-- Create partitions for 70 weeks backward
		raise notice 'step_01_start:%',(clock_timestamp() - _st);
		SELECT async_query INTO _worker FROM public.async_query('call public.pc_create_date_partitions(''price_promo_opt'', ''promo_txn_master'', ''day'', ''70 week'', ''backward'');');
	    PERFORM public.async_query_status(_worker, 'cleanup');

		raise notice 'step_01_end:%',(clock_timestamp() - _st);

		_log_step := 'parallel_upsert';
		raise notice 'step_02_start:%',(clock_timestamp() - _st);
		perform public.parellel_insert(
			'WITH rows AS (
				INSERT INTO price_promo_opt.promo_txn_master (
					product_id,
					transaction_id,
					store_id,
					date_id,
					currency,
					currency_id,
					no_of_txn,
					cost,
					base_price,
					base_price_secondary,
					retail_price,
					quantity,
					revenue,
					margin,
					selling_price,
					dis_amount,
					dis_perc,
					final_discount_percent,
					final_amount,
					promo_spend,
					promo_discount,
					coupon_amount,
					coupon_discount,
					aur,
					aum,
					store_reco_level
				)
				SELECT
					product_id,
					transaction_id,
					store_id,
					date_id,
					currency,
					currency_id,
					no_of_txn,
					cost,
					base_price,
					base_price_secondary,
					retail_price,
					quantity,
					revenue,
					margin,
					selling_price,
					dis_amount,
					dis_perc,
					final_discount_percent,
					final_amount,
					promo_spend,
					promo_discount,
					coupon_amount,
					coupon_discount,
					aur,
					aum,
					store_reco_level
				FROM public.promo_txn_master t1
				{where}
				ON CONFLICT (product_id, transaction_id, store_id, date_id)
				DO UPDATE SET
					currency = EXCLUDED.currency,
					currency_id = EXCLUDED.currency_id,
					no_of_txn = EXCLUDED.no_of_txn,
					cost = EXCLUDED.cost,
					base_price = EXCLUDED.base_price,
					base_price_secondary = EXCLUDED.base_price_secondary,
					retail_price = EXCLUDED.retail_price,
					quantity = EXCLUDED.quantity,
					revenue = EXCLUDED.revenue,
					margin = EXCLUDED.margin,
					selling_price = EXCLUDED.selling_price,
					dis_amount = EXCLUDED.dis_amount,
					dis_perc = EXCLUDED.dis_perc,
					final_discount_percent = EXCLUDED.final_discount_percent,
					final_amount = EXCLUDED.final_amount,
					promo_spend = EXCLUDED.promo_spend,
					promo_discount = EXCLUDED.promo_discount,
					coupon_amount = EXCLUDED.coupon_amount,
					coupon_discount = EXCLUDED.coupon_discount,
					aur = EXCLUDED.aur,
					aum = EXCLUDED.aum,
					store_reco_level = EXCLUDED.store_reco_level
				RETURNING 1
			)
			SELECT count(1) as cnt FROM rows;',
			50,
			'public.promo_txn_master',
			'product_id',
			'ptm_product_id_idx',
			40
		);
		raise notice 'step_02_end:%',(clock_timestamp() - _st);
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