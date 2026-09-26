--liquibase formatted sql
--changeset kakumanu.abhishek:sync_store_groups_to_grade runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:SAP-172
--comment: added store_channel column
DROP PROCEDURE IF EXISTS public.sync_store_groups_to_grade();
DROP PROCEDURE IF EXISTS public.sync_store_groups_to_grade(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_store_groups_to_grade(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_groups_to_grade';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        if _is_historic then 
            delete from 
              "global".store_groups_to_grade 
            where 
              true;
            end if;
            insert into "global".store_groups_to_grade  (
                         store_code,
                         name,
                         grade,
                         sg_code,
                         store_channel
        ) 
        SELECT 
         a.store_code,
         a.name,
         a.grade,
         b.sg_code,
         a.store_channel
        FROM 
          public.store_groups_to_grade a 
        LEFT JOIN "global".store_groups b using(name)
        Where b.sg_code is not null;
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