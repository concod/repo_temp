--liquibase formatted sql
--changeset liquibase:sync_store_status runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_store_status
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_status();
CREATE OR REPLACE PROCEDURE public.sync_store_status()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		delete from 
		  global.store_time_attributes 
		where 
		  true;

		INSERT INTO "global".store_time_attributes
		(store_code, attribute_name, attribute_value, start_time, end_time)
		
		SELECT 
		store_code,
		attribute_name,
		attribute_value,
		start_time,
		end_time
		
		FROM 
		  public.store_status ;
	end
$procedure$
;
