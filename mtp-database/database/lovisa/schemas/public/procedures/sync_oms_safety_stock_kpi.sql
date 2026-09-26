-- liquibase formatted sql
-- changeset swapnil.bhange@impactanalytics.co:sync_oms_safety_stock_kpi_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_oms_safety_stock_kpi
-- comment: SP for oms_safety_stock_kpi_v2

DROP  PROCEDURE if exists public.sync_oms_safety_stock_kpi();
DROP  PROCEDURE if exists public.sync_oms_safety_stock_kpi(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_oms_safety_stock_kpi(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_safety_stock_kpi';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        update inventory_smart.oms_kpi ok
        set target_service_level =x.target_service_level,
        safety_stock =x.safety_stock,
        ss_base =x.ss_base_sl
        from 
        (
            SELECT
                product_code,
                "location",
                channel,
                target_service_level,
                safety_stock,
                ss_base,
                coalesce(ss_base_sl,0) as ss_base_sl
            FROM 
                public.oms_safetystock_latest
        )x
        where ok.product_code = x.product_code 
            and ok.loc_code = x."location"
            and ok.channel = x.channel;
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
