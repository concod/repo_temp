--liquibase formatted sql
--changeset liquibase:sync_instock_kpi_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_instock_kpi_table
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_instock_kpi_table(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_instock_kpi_table(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_instock_kpi_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        if _is_historic THEN 
            delete FROM 
             inventory_smart.instock_kpi_table
            WHERE 
             true; 
        end if;
        INSERT INTO inventory_smart.instock_kpi_table (
            store_code,product_code,oh_flag,
            date,product_channel_name,l0_name,
            l1_name,l2_name,merchandise_category,
            planning_ownership,store_code_name,store_channel_description,channel,state,
            district,city,store_description
        )
        SELECT  
            store_code,
            product_code,
            oh_flag,
            date,
            product_channel_name,
            l0_name,
            l1_name,
            l2_name,
            merchandise_category,
            planning_ownership,
            store_code_name,
            store_channel_description,
            channel,
            state,
            district,
            city,
            store_description
        FROM 
            public.instock_kpi_table; 
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
