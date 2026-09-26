--liquibase formatted sql
--changeset himansh.bhardwaj:sync_dashboard_date_ticker runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: initial changeset
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_dashboard_date_ticker();
CREATE OR REPLACE PROCEDURE public.sync_dashboard_date_ticker()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dashboard_date_ticker';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
    -- Update operation for dashboard_date_ticker
	UPDATE "global".default_attributes 
	SET attribute_value = (
							SELECT to_jsonb(a) as attr 
							FROM (
									SELECT to_jsonb(b) as value
									FROM public.dashboard_date_ticker b
								  ) a
						   )
	WHERE attribute_type = 'dashboard_date_ticker';
		
    Raise notice 'Dashboard date ticker sync completed in %', (clock_timestamp() - _st);
    
exception
    when others then
        raise exception 'Error in sync_dashboard_date_ticker: %', SQLERRM;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
END
$procedure$
;
