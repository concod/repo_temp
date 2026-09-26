--liquibase formatted sql
--changeset liquibase:sync_oms_vendor_projection runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_oms_vendor_projection
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS sync_oms_vendor_projection(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_oms_vendor_projection(IN _is_historic boolean DEFAULT false)
	LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_vendor_projection';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	if _is_historic then 
            delete from 
              inventory_smart.oms_vendor_projection 
            where 
              true;
        end if;
       
    INSERT INTO inventory_smart.oms_vendor_projection
	(product_code, 
	loc_code, 
	vendor_code, 
	fiscal_year_month, 
	fiscal_month_name, 
	roq_unconstrained, 
	total_cost)
	
	SELECT product_code, 
	"location",
	vendor_code,
	fiscal_year_month,
	fiscal_month_name, 
	roq_unconstrained, 
	total_cost
	FROM public.oms_vendor_projection;
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
;
