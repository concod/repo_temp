--liquibase formatted sql
--changeset saumya.agnihotri@impactanalytics.co:sync_constraint_master runOnChange:true stripComments:false splitStatements:false context:New_Sync_Stratgy_ labels:DAT-832
--comment: added channel column
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_validity_constraint_master();
CREATE OR REPLACE PROCEDURE public.sync_validity_constraint_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_validity_constraint_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        -- call global.build_list_partitions('constraint_master');
        call global.build_list_partitions('constraint_validity_master');
        -- INSERT INTO inventory_smart.constraint_master (
        INSERT INTO inventory_smart.constraint_validity_master (
          mapping_code, l0_name, product_code, store_code,
          validity, channel, wos, transit_time, safety_stock, 
          min_stock, max_stock, aps, ros
        ) 
        SELECT 
          pmps.mapping_code, 
          pmps.l0_name,
          x.product_code, 
          x.store_code,
          daterange(
            current_date, '2050-12-31'::date
          ) as validity, 
          channel,
          x.wos, 
          x.transit_time, 
          x.safety_stock, 
          coalesce(x.min_stock, 0) as min_stock, 
          coalesce(x.max_stock, 0) as max_stock, 
          x.aps, 
          x.ros
        FROM 
          public.constraint_master x 
          -- join "global".product_attributes_filter paf on x.product_code= paf.product_code
          left join global.product_mapping_product_store pmps
          on x.product_code = pmps.product_code
          -- and pmps.product_code= paf.product_code
          and x.store_code = pmps.store_code 
          on conflict do nothing;
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
