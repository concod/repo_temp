-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_latest_inventory_dc_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_latest_inventory_dc
-- comment: derived table for latest_inventory_dc_v5

DROP  PROCEDURE if exists public.sync_latest_inventory_dc();

CREATE OR REPLACE PROCEDURE public.sync_latest_inventory_dc()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_latest_inventory_dc';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE global.tb_latest_inventory_dc;

	        INSERT INTO global.tb_latest_inventory_dc
	        (
              s0_id,
              s0_name,
              s1_id,
              s1_name,
              style_cuq,
              product_id,
              clearance_indicator,
              date,
              oh,
              it,
              oo,
              vendor_oo,
              total_inventory
	        )
			select
              cast(s0_id as int4) as s0_id,
              s0_name,
              cast(s1_id as int4) as s1_id,
              s1_name,
              style_cuq,
              cast(product_id as int4) as product_id,
              cast(clearance_indicator as int4) as clearance_indicator,
              cast("date" as date) as date,
              cast(oh as int4) as oh,
              cast(it as int4) as it,
              cast(oo as int4) as oo,
              cast(vendor_oo as int4) as vendor_oo,
              cast(total_inventory as int4) as total_inventory
			from public.latest_inventory_dc
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