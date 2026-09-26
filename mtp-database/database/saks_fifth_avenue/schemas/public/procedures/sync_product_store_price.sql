-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_product_store_price_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_product_store_price
-- comment: derived table for product_store_price_v5

DROP  PROCEDURE if exists public.sync_product_store_price();

CREATE OR REPLACE PROCEDURE public.sync_product_store_price()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_store_price';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        delete from
	          price_markdown.tb_product_store_price
	        where
	          true;

	        INSERT INTO price_markdown.tb_product_store_price
	        (
                product_id,
                store_id,
                markdown_type,
                original_price,
                current_price,
                effective_from_date,
                updated_at
	        )
			select
                product_id,
                store_id,
                markdown_type,
                original_price,
                current_price,
                cast(effective_from_date as date) as effective_from_date,
                current_timestamp as updated_at
			from public.product_store_price;
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