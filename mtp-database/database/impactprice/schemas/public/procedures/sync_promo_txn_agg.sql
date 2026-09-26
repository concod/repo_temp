--liquibase formatted sql
--changeset sreevathsa.sp:sync_promo_txn_agg_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_promo_txn_agg
--comment: aggregate tb_transaction_promo_mkd_combined and sync to promo_txn_agg
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_promo_txn_agg();

CREATE OR REPLACE PROCEDURE public.sync_promo_txn_agg()
 LANGUAGE plpgsql
AS $procedure$

declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_promo_txn_agg';
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
		SELECT async_query INTO _worker FROM public.async_query('call public.pc_create_date_partitions(''price_promo_opt'', ''promo_txn_agg'', ''day'', ''70 week'', ''backward'');');
	    PERFORM public.async_query_status(_worker, 'cleanup');

		raise notice 'step_01_end:%',(clock_timestamp() - _st);

		_log_step := 'parallel_upsert';
		raise notice 'step_02_start:%',(clock_timestamp() - _st);
		perform public.parellel_insert(
			'WITH rows AS (
				INSERT INTO price_promo_opt.promo_txn_agg (
					product_id,
					date_id,
					store_reco_level,
					currency,
					currency_id,
					no_of_txn,
					cost,
					promo_base_price,
					quantity,
					revenue,
					margin,
					selling_price,
					promo_spend,
					promo_discount,
					price_spend,
					price_discount,
					coupon_spend,
					coupon_discount,
					aur,
					aum,
					clearance_indicator
				)
				SELECT
					-- Keys
					product_id::int4,
					date_id::date,
					store_reco_level::text,

					-- Currency
					MAX(currency)::text AS currency,
					MAX(currency_id)::int4 AS currency_id,

					-- Aggregated metrics
					SUM(promo_no_of_txn)::float8 AS no_of_txn,
					SUM(promo_cost)::float8 AS cost,
					AVG(promo_base_price)::float8 AS promo_base_price,
					SUM(promo_quantity)::float8 AS quantity,
					SUM(promo_revenue)::float8 AS revenue,
					SUM(promo_margin)::float8 AS margin,
					AVG(promo_selling_price)::float8 AS selling_price,
					SUM(promo_spend)::float8 AS promo_spend,
					(SUM(promo_spend) / NULLIF(SUM(promo_base_price), 0) * 100.0)::float8 AS promo_discount,
					SUM(promo_price_spend)::float8 AS price_spend,
					(SUM(promo_price_spend) / NULLIF(SUM(promo_base_price), 0) * 100.0)::float8 AS price_discount,
					SUM(promo_coupon_spend)::float8 AS coupon_spend,
					SUM(promo_coupon_discount)::float8 AS coupon_discount,

					-- Recomputed rate metrics at aggregated level
					(SUM(promo_revenue) / NULLIF(SUM(promo_quantity), 0))::float8 AS aur,
					(SUM(promo_margin) / NULLIF(SUM(promo_quantity), 0))::float8 AS aum,

					-- Clearance indicator: majority vote within the group
					CASE
						WHEN SUM(promo_clearance_indicator) * 2 >= COUNT(*) THEN 1
						ELSE 0
					END::int4 AS clearance_indicator
				FROM public.tb_transaction_promo_mkd_combined t1
				{where}
				GROUP BY
					product_id,
					date_id,
					store_reco_level
				ON CONFLICT (product_id, date_id, store_reco_level)
				DO UPDATE SET
					currency = EXCLUDED.currency,
					currency_id = EXCLUDED.currency_id,
					no_of_txn = EXCLUDED.no_of_txn,
					cost = EXCLUDED.cost,
					promo_base_price = EXCLUDED.promo_base_price,
					quantity = EXCLUDED.quantity,
					revenue = EXCLUDED.revenue,
					margin = EXCLUDED.margin,
					selling_price = EXCLUDED.selling_price,
					promo_spend = EXCLUDED.promo_spend,
					promo_discount = EXCLUDED.promo_discount,
					price_spend = EXCLUDED.price_spend,
					price_discount = EXCLUDED.price_discount,
					coupon_spend = EXCLUDED.coupon_spend,
					coupon_discount = EXCLUDED.coupon_discount,
					aur = EXCLUDED.aur,
					aum = EXCLUDED.aum,
					clearance_indicator = EXCLUDED.clearance_indicator
				RETURNING 1
			)
			SELECT count(1) as cnt FROM rows;',
			50,
			'public.tb_transaction_promo_mkd_combined',
			'product_id',
			'tpmc_product_id_idx',
			30
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