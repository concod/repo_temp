-- liquibase formatted sql
-- changeset sreevathsa.sp@impactanalytics.co:sync_dc_pack_reserve_quantity_derived_table runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_dc_pack_reserve_quantity_derived_table
-- comment: initial changeset for sync_dc_pack_reserve_quantity_derived_table current_date -1

DROP PROCEDURE if exists public.sync_dc_pack_reserve_quantity_derived_table();

CREATE OR REPLACE PROCEDURE public.sync_dc_pack_reserve_quantity_derived_table()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_pack_reserve_quantity_derived_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
         insert into inventory_smart.dc_pack_reserve_quantity_derived_table 
        SELECT
        article,
        current_date-1 as date,
        sum(COALESCE(quantity,0)) AS reserve_quantity
        FROM
        inventory_smart.dc_reserve_quantity a
        LEFT join
        inventory_smart.dc_pack_configuration b
        USING(article,product_code)
        where reservation_till_date >= current_date-1
        GROUP BY
        1,2
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