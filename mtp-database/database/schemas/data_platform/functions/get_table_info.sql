--liquibase formatted sql
--changeset liquibase:get_table_info runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_table_info
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.get_table_info(p_table_id int);
CREATE OR REPLACE FUNCTION data_platform.get_table_info(p_table_id integer)
 RETURNS TABLE(table_id integer, table_name character varying, table_description character varying, table_location character varying)
 LANGUAGE plpgsql
AS $function$
/*
Created by : Manoj Solanki   Created On :26th Sep,2023    
*/
begin
  return query
  SELECT * FROM (
			select
			t.table_id,
			t.table_name,
			t.table_description,
			t.table_location
			from
 	data_platform.table_info t
	where t.is_deleted =False and t.table_id=p_table_id
	 ) X;
end;
$function$
;

