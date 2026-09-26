--liquibase formatted sql
--changeset liquibase:get_custom_qc runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_custom_qc
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.get_custom_qc(p_qc_code int);
CREATE OR REPLACE FUNCTION data_platform.get_custom_qc(p_qc_code integer)
 RETURNS TABLE(qc_id integer, qc_name character varying, qc_description character varying, qc_type character varying, table_id integer, table_name character varying, table_description character varying, table_location character varying)
 LANGUAGE plpgsql
AS $function$
/*
Created by : Manoj Solanki   Created On :26th Sep,2023    
*/
begin
  return query
  SELECT * FROM (
			select
            qc.qc_id,
            qc.qc_name,
            qc.qc_description,
			qc.qc_type,
			qc.table_id,
			ti.table_name,
			ti.table_description,
			ti.table_location
			from
 	data_platform.custom_qc qc
    left join data_platform.table_info ti
    on qc.table_id=ti.table_id
	where qc.is_deleted=False and qc.qc_id=p_qc_code
	 ) X;
end;
$function$
;
