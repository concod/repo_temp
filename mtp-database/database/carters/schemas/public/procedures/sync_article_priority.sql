-- liquibase formatted sql
-- changeset shameel.zeshan@impactanalytics.co:article_priority_table runOnChange:true stripComments:false splitStatements:false context:added sp labels:added article_priority table
-- comment: added article_priority table  

DROP PROCEDURE if exists public.sync_article_priority();

CREATE OR REPLACE PROCEDURE public.sync_article_priority()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_priority';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		delete from 
 		  inventory_smart.article_priority
 		where 
 		  true;
 		insert into inventory_smart.article_priority (article ,l0_name,l1_name,l2_name,l3_name,l4_name,l5_name,default_priority,syncstartdatetime)
		select article ,l0_name,l1_name,l2_name,l3_name,l4_name,l5_name,default_priority,syncstartdatetime
		from public.article_priority
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