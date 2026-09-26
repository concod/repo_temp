--liquibase formatted sql
--changeset kakumanu.abhishek:sync_newly_launched_skus_alert runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_newly_launched_skus_alert
--rollback: SELECT 1

DROP PROCEDURE if exists public.sync_newly_launched_skus_alert();
CREATE OR REPLACE PROCEDURE public.sync_newly_launched_skus_alert()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_newly_launched_skus_alert';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        delete from 
          inventory_smart.newly_launched_skus_alert
        where 
          true;
        insert into inventory_smart.newly_launched_skus_alert (
          allocation_plan_name,article,creation_date,lw_sales_units,bulk_remaining,allocated_quantity,
          vir_reservation_remaining_pdu_remaining,iob,dc_mapped,newly_launched_flag,
          newly_launched_is_resolved,l0_name,l2_name,l4_name,l5_name,l6_name,l7_code
        ) 
        SELECT 
           allocation_plan_name,article,creation_date,lw_sales_units,bulk_remaining,allocated_quantity,
          vir_reservation_remaining_pdu_remaining,iob,dc_mapped,newly_launched_flag,
          newly_launched_is_resolved,l0_name,l2_name,l4_name,l5_name,l6_name,l7_code
        FROM 
          public.newly_launched_skus_alert x;
          
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
