-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_po_data_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_po_data
-- comment: derived table for po_data_v5

DROP  PROCEDURE if exists public.sync_po_data();

CREATE OR REPLACE PROCEDURE public.sync_po_data()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_po_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE global.tb_inventory_po;

	        INSERT INTO global.tb_inventory_po
	        (
              s0_id,
              s0_name,
              s1_id,
              s1_name,
              style_cuq,
              product_id,
              store_code,
              po_date,
              po_order
	        )
			select
              cast(s0_id as int4) as s0_id,
              s0_name,
              cast(s1_id as int4) as s1_id,
              s1_name,
              style_cuq,
              cast(product_id as int8) as product_id,
              cast(store_id as int4) as store_code,
              cast(po_date as date) as po_date,
              cast(po_order as int4) as po_order
			from public.po_data
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