--liquibase formatted sql
--changeset anish.a@impactanalytics.co:sync_store_groups runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for sync_store_groups


DROP PROCEDURE if EXISTS public.sync_store_groups(bool);

CREATE OR REPLACE PROCEDURE public.sync_store_groups(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_groups';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		
	if _is_historic then 
		 		delete from 
		 		  "global".store_groups 
		 		where 
		 		  sg_code in (select distinct sg_code from public.store_groups);
		 		 
		 		delete from 
		 		  "global".store_groups_mapping 
		 		where 
		 		  sg_code in (select distinct sg_code from public.store_groups);
		 		 
				raise notice 'Step1: %', (clock_timestamp() - _st);
	 			
	 		end if;
	 	
    INSERT INTO "global".store_groups
    (sg_code, "name", special_classification, channel, application_code, is_default)
    select
    distinct 
		sg_code,
		name,
		special_classification,
		channel,
		application_code,
		is_default
    FROM
        public.store_groups
    on conflict do nothing;
       
    INSERT into "global".store_groups_mapping 
    (sg_code,store_code)
    select 
    distinct 
	    sg_code,
	    store_code 
    from 
    	public.store_groups
    on conflict do nothing ;   
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;
