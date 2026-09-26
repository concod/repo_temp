-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_tb_budget_master_ty_agg_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_bp_competitor_attributes
-- comment: derived table for sync_tb_budget_master_ty_agg_v2

DROP PROCEDURE IF EXISTS public.sync_tb_budget_master_ty_agg();

CREATE OR REPLACE PROCEDURE public.sync_tb_budget_master_ty_agg()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_budget_master_ty_agg';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		-- call public.pc_create_date_partitions('price_promo_opt', 'promo_txn_agg', 'day', '2 year', 'backward');
          	call public.pc_create_date_partitions('price_promo_opt', 'tb_budget_master_ty_agg', 'day', '12 week', 'backward');
            call public.pc_create_date_partitions('price_promo_opt', 'tb_budget_master_ty_agg', 'day', '40 week', 'forward');
			TRUNCATE TABLE  price_promo_opt.tb_budget_master_ty_agg;
      --     	DELETE FROM price_promo_opt.promo_txn_master
			-- WHERE date_id BETWEEN (		   
			-- 	SELECT MIN(date_id)
			-- 	FROM price_promo_opt.promo_txn_master_version t1
			-- 	WHERE t1.version_code = global.get_table_version('price_promo_opt.promo_txn_master_version'::text)
			-- 	) 
			-- AND (
			-- 	SELECT MAX(date_id)
			-- 	FROM price_promo_opt.promo_txn_master_version t1
			-- 	WHERE t1.version_code = global.get_table_version('price_promo_opt.promo_txn_master_version'::text)
			-- 	);
   
	        INSERT INTO price_promo_opt.tb_budget_master_ty_agg
	        (
        product_id,
        dates,
        store_reco_level,
        units,
        margin,
        revenue
	        )
			select
        product_id,
        dates,
        store_reco_level,
        units_ty,
        margin_ty,
        revenue_ty
			FROM price_promo_opt.tb_budget_master_ty_agg_version t1
			WHERE t1.version_code = global.get_table_version('price_promo_opt.tb_budget_master_ty_agg_version'::text)
			;
			TRUNCATE TABLE price_promo_opt.tb_budget_master_ty_agg_version;
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

