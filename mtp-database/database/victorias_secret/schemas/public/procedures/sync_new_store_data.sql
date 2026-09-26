--liquibase formatted sql
--changeset anujkumar.singh:sync_new_store_data_v4 runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-493
--comment: updated sp sync_new_store_data
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_new_store_data();
CREATE OR REPLACE PROCEDURE public.sync_new_store_data()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_new_store_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin      
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    DELETE FROM 
        global.new_store_data
        WHERE store_code NOT IN (
    SELECT distinct store_code
    FROM global.new_store_attributes
    WHERE opening_date+90 >= current_date
    union distinct 
    SELECT distinct legacy_store_code
    FROM global.new_store_attributes
    WHERE opening_date+90 >= current_date and legacy_store_code is not null
);

INSERT INTO global.new_store_data  (
 		  store_code, store_name,remodel_flag
 		)
 		SELECT
 		  x.store_code,
 		  x.store_name,
 		  false as remodel_flag
 		FROM
 		  "global".store_attributes_filter x
 		 where upper(store_category) = 'STORE'
 		 and open_date > current_date
 		 and upper(geography) = 'NA'
 		and not is_deleted and active
 	    ON CONFLICT (store_code) DO NOTHING;
 	
 	 	INSERT INTO global.new_store_data  (
 		  store_code, store_name,remodel_flag
 		)
 		select a.legacy_store_code as store_code, b.store_name,true as remodel_flag
 		from "global".real_estate_master a
 		inner join "global".store_attributes_filter b
 		on a.legacy_store_code=b.store_code
 	    where a.temp_store_effective_date>=current_date and a.remodel_store_effective_date>=current_date and a.remodel_store_effective_date>a.temp_store_effective_date
        and geography='NA' and active ON CONFLICT (store_code) DO NOTHING;
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
