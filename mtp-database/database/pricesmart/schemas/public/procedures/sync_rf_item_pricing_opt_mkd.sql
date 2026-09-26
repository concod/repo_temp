-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_rf_item_pricing_opt_mkd_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_rf_item_pricing_opt_mkd
-- comment: derived table for latest_inventory_v5

DROP  PROCEDURE if exists public.sync_rf_item_pricing_opt_mkd();

CREATE OR REPLACE PROCEDURE public.sync_rf_item_pricing_opt_mkd()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_rf_item_pricing_opt_mkd';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE price_markdown.tb_product_store_price;

	        INSERT INTO price_markdown.tb_product_store_price
	        (
                product_id,
                store_id,
                markdown_type,
                original_price,
                current_price,
                effective_from_date,
                updated_at,
                last_reg_price
	        )
			select
              cast(product_id as int8) as product_id,
              cast(store_id as int4) as store_id,
              cast(clearance_indicator as text) as markdown_type,
              CAST(NULL as float8) as original_price,
              cast(current_price as float8) as current_price,
              cast(effective_from_date as date) as effective_from_date,
              cast(current_date as timestamp) as updated_at,
              cast(last_reg_price as float8) as last_reg_price
			from public.rf_item_pricing_opt_mkd
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