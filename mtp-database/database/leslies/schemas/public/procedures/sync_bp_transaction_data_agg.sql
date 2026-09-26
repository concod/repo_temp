-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_bp_transaction_data_agg_v4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_bp_transaction_data_agg
-- comment: derived table for sync_bp_transaction_data_agg_v4

DROP  PROCEDURE if exists public.sync_bp_transaction_data_agg();

CREATE OR REPLACE PROCEDURE public.sync_bp_transaction_data_agg()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_bp_transaction_data_agg';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
          TRUNCATE TABLE base_pricing.bp_transaction_data_agg CASCADE;
--          call public.pc_create_date_partitions('base_pricing', 'bp_transaction_data_weekly', 'day', '26 week', 'backward');
--		    call public.pc_create_date_partitions('base_pricing', 'bp_transaction_data_agg', 'month', '7 months', 'backward');
         
	        INSERT INTO base_pricing.bp_transaction_data_agg
	        (
                start_date,
                end_date,
                product_id,
                store_id,
                channel_id,
                segment_id,
                transactions,
                sales_units,
                total_base_cost,
                total_additional_cost,
                sourced_unit_price,
                retail_unit_price,
                total_sales_price,
                total_revenue,
                total_margin,
                total_contri_margin
	        )
			select
		        start_date::date,
            end_date::date,
		        product_id::int4,
		        store_id::int4,
		        channel::int4,
		        customer_type::int4,
		        transactions::int4,
		        sales_units::int8,
		        total_base_cost::float8,
		        total_additional_cost::float8,
		        sourced_unit_price::float8,
		        retail_unit_price::float8,
		        total_sales_price::float8,
		        total_revenue::float8,
		        total_margin::float8,
		        total_contri_margin::float8
			from public.bp_transaction_data_agg;
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
