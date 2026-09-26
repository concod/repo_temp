--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:delta_logic_fix runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-18913,MTP-33853
--comment: sync_instock_kpi_table delete replaced with truncate and replaced DTC Year, PFS Year, DTC Season, PFS Season columns with foe_year and season
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.delta_logic_fix();
CREATE OR REPLACE PROCEDURE public.delta_logic_fix()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.delta_logic_fix';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    update GLOBAL.store_master sm
    set is_deleted=false,
    active = svt.active
    from public.store_validated_table svt
    where sm.is_deleted =true;

update global.store_attributes sa 
set attribute_value=svt.open_date
from public.store_validated_table svt
where attribute_name='open_date'
and svt.store_code = sa.store_code;
    
    call global.build_store_attributes_filter('');
    
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
    END;
$procedure$
;
