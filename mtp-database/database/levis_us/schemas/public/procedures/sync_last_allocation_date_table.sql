--liquibase formatted sql
--changeset himansh.bhardwaj:sync_last_allocation_date_table_AAT runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: initial changeset
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_last_allocation_date_table();
CREATE OR REPLACE PROCEDURE public.sync_last_allocation_date_table()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_last_allocation_date_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        --deleting the table
        delete from 
          inventory_smart.last_allocation_date_table 
        where 
          true;
        -- insert everything
        INSERT INTO inventory_smart.last_allocation_date_table(
        article ,
        last_allocation_date) 
        select article, CAST(MAX(updated_at) AS DATE) as last_allocation_date
        from inventory_smart.create_allocation_result_flat_gurobi carfg 
        where status = 2 and allocated_total>0
        group by 1;

        --deleting the table
        delete from 
          inventory_smart.article_allocation_tracker 
        where 
          true;
        -- insert everything
        INSERT INTO inventory_smart.article_allocation_tracker(
        article ,
        updated_at) 
        select article, MAX(updated_at) as last_allocation_timestamp
        from inventory_smart.create_allocation_result_flat_gurobi carfg 
        where status = 2 and allocated_total>0
        group by 1;                  
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