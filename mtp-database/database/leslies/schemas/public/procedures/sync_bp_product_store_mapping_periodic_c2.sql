-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_bp_product_store_mapping_periodic_c2_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_bp_product_store_mapping_c1
-- comment: derived table for sync_bp_product_store_mapping_periodic_c2_v1

DROP  PROCEDURE if exists public.sync_bp_product_store_mapping_periodic_c2();

CREATE OR REPLACE PROCEDURE public.sync_bp_product_store_mapping_periodic_c2()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_bp_product_store_mapping_periodic_c2';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
			DELETE FROM base_pricing.bp_product_store_mapping_c2 t1
			USING public.bp_product_store_mapping_all t2
			WHERE t1.product_id = t2.product_id
			AND t1.store_id = t2.store_id
			AND t2.pricing_cust_type = 'c2';
		    
	        INSERT INTO base_pricing.bp_product_store_mapping_c2
	        (
product_id,
store_id,
price_lock,
price,
segment_id,
eligibility,
is_kvi,
reference_price_1,
reference_price_2,
created_at,
updated_at
 )

			select
product_id,
store_id,
price_lock,
price,
cast(10003 as int4) as segment_id,
eligibility,
is_kvi,
reference_price_1,
reference_price_2,
created_at,
updated_at
			from public.bp_product_store_mapping_all
			where product_id in (select distinct product_id from base_pricing.bp_product_master)
			and store_id in (select distinct store_id from base_pricing.bp_store_master)
			and pricing_cust_type = 'c2'
		group by 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
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
