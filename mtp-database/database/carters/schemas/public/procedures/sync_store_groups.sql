-- liquibase formatted sql
-- changeset shrinidhi.choragi@impactanalytics.co:default_sg_codes_deletion update runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels: default_sg_code update 
-- comment: default_sg_codes deletion update for sync_store_groups 

DROP PROCEDURE if exists public.sync_store_groups();
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
		  sg_code, "name", channel, application_code, 
		  special_classification
		) 
		SELECT 
		sg_code,
		  store_group, 
		  attribute_value as channel, 
		  application_code, 
		  'manual' as special_classification 
		FROM 
		  (select sg_code, store_group,attribute_value,application_code from public.store_group x join global.store_master sm using(store_code) join global.store_attributes sa using(store_code)
		where attribute_name='channel'
		  group by 
		  sg_code,
		  store_group, 
		  attribute_value, 
		  application_code) as a on conflict(name) 
		WHERE 
		  (NOT is_deleted) do 
		update 
		SET 
		  channel = EXCLUDED.channel, 
		  application_code = EXCLUDED.application_code;
		delete FROM 
		  "global".store_groups_mapping 
		where 
		  sg_code in(
		   501,502,503,504,505,506
		  );
		INSERT INTO "global".store_groups_mapping (sg_code, store_code, ref_sg_code) 
		SELECT 
		  sg.sg_code, 
		  x.store_code, 
		  null as ref_sg_code 
		FROM 
		  public.store_group x 
		  join global.store_groups sg ON sg.name = x.store_group 
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
