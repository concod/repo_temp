--liquibase formatted sql
--changeset swapnil.bhange:sync_default_store_grade_new_stores_02_08_2023 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-21627
--comment: SP for sync_default_store_grade_new_stores 
DROP PROCEDURE IF EXISTS public.sync_default_store_grade_new_stores();
DROP PROCEDURE IF EXISTS public.sync_default_store_grade_new_stores(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_default_store_grade_new_stores(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_default_store_grade_new_stores';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        if _is_historic then 
            delete FROM "global".default_store_grade
            where 
              true;
            end if;
           insert into "global".default_store_grade (
           				channel,
           				store_code,
           				grade
           	)
           	SELECT 
				sm.channel,
				nsr.store_code,
				nsr.store_grade as grade 
			from 
				"global".new_store_reserve nsr 
			left join 
			"global".store_attributes_filter sm using(store_code)
			where concat(channel, store_code) not in (select concat(channel, store_code) from "global".default_store_grade dsg )
			group by 1,2,3;
			
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
