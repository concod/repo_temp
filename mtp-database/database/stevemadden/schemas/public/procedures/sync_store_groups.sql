--liquibase formatted sql
--changeset liquibase:sync_store_groups runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_store_groups
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_groups();
CREATE OR REPLACE PROCEDURE public.sync_store_groups()
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
		insert into "global".store_groups(
		  "name", channel, application_code, 
		  special_classification
		) 
		SELECT 
		  "name", 
		  channel, 
		  application_code, 
		  lower(x.special_classification) as special_classification 
		FROM 
		  public.store_group x join global.store_master sm using(store_code)
		  where channel in('Factory Line Retail','Full Line Retail')
		group by 
		  "name", 
		  channel, 
		  application_code, 
		  lower(x.special_classification) on conflict(name) 
		WHERE 
		  (NOT is_deleted) do 
		update 
		SET 
		  channel = EXCLUDED.channel, 
		  application_code = EXCLUDED.application_code, 
		  special_classification = EXCLUDED.special_classification;
		delete FROM 
		  "global".store_groups_mapping 
		where 
		  sg_code in(
		    SELECT 
		      sg.sg_code 
		    FROM 
		      public.store_group x 
		      join global.store_groups sg using("name") 
		    group by 
		      1
		  );
		INSERT INTO "global".store_groups_mapping (sg_code, store_code, ref_sg_code) 
		SELECT 
		  sg.sg_code, 
		  x.store_code, 
		  ref_sg_code 
		FROM 
		  public.store_group x 
		  join global.store_groups sg using("name")
		  join global.store_master sm using(store_code) on conflict do nothing;
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
