--liquibase formatted sql
--changeset liquibase:sync_dc_mrpc_kpi_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_dc_mrpc_kpi_table
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_dc_mrpc_kpi_table(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_dc_mrpc_kpi_table(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_mrpc_kpi_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        if _is_historic THEN 
            delete FROM 
             inventory_smart.dc_mrpc_kpi_table
            WHERE 
             true; 
        end if;
        INSERT INTO inventory_smart.dc_mrpc_kpi_table (
            product_code,dc_oh,dc_oh_cost,
            mrpc,mrpc_cost,product_channel_name,
            l0_name,l1_name,
            l2_name,merchandise_category,planning_ownership 
        )
        SELECT  
            product_code
            ,dc_oh
            ,dc_oh_cost 
            ,mrpc
            ,mrpc_cost 
            ,product_channel_name
            ,l0_name
            ,l1_name
            ,l2_name
            ,merchandise_category
            ,planning_ownership
        FROM 
            public.dc_mrpc_kpi_table; 
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
