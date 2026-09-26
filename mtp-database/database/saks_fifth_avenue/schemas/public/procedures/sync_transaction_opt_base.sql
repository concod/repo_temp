-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_transaction_opt_base_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_transaction_opt_base
-- comment: derived table for transaction_opt_base_v5

DROP  PROCEDURE if exists public.sync_transaction_opt_base();

CREATE OR REPLACE PROCEDURE public.sync_transaction_opt_base()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_transaction_opt_base';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE price_promo.tb_transaction_opt_base;

	        INSERT INTO price_promo.tb_transaction_opt_base
	        (
            date,
            country,
            channel,
            l2_id,
            l5_id,
            l5_identifier,
            style_cuq,
            product_code,
            store_code,
            clearance_indicator,
            gross_quantity,
            net_quantity,
            net_revenue,
            net_margin,
            net_disc,
            gross_disc,
            total_inv,
            net_sp,
            gross_sp
	        )
			select
            cast("date" as date) as date,
            country,
            channel,
            cast(l2_id as int4) as l2_id,
            cast(l5_id as int8) as l5_id,
            l5_identifier,
            style_cuq,
            cast(product_code as int8) as product_code,
            cast(store_code as int4) as store_code,
            cast(clearance_indicator as int4) as clearance_indicator,
            cast(gross_quantity as int4) as gross_quantity,
            cast(net_quantity as int4) as net_quantity,
            cast(net_revenue as float8) as net_revenue,
            cast(net_margin as float8) as net_margin,
            cast(net_disc as float8) as net_disc,
            cast(gross_disc as float8) as gross_disc,
            cast(total_inv as int4) as total_inv,
            cast(net_sp as float4) as net_sp,
            cast(gross_sp as float4) as gross_sp
			from public.transaction_opt_base
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