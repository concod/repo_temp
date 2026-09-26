--liquibase formatted sql
--changeset liquibase:get_data_source_config runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_data_source_config
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.get_data_source_config(config_id int);
CREATE OR REPLACE FUNCTION data_platform.get_data_source_config(config_id integer)
 RETURNS TABLE (data_source_config_id integer, name varchar, type varchar, is_valid boolean, user_name varchar, created_at timestamptz) 
 LANGUAGE plpgsql
AS $function$
/*
Created by : Manoj Solanki   Created On :26th Sep,2023    
*/
begin
  return query
  SELECT * FROM (
			select
			t.data_source_config_id,
			t.name,
			t.type,
			t.is_valid,
			um.user_name,
			t.created_at
			from
 	data_platform.data_source_config t
	left join global.user_master um on t.created_by=um.user_code
	where t.is_deleted =False and t.data_source_config_id=$1
	 ) X;
end;
$function$
;

