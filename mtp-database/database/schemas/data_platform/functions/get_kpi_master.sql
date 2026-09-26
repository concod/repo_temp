--liquibase formatted sql
--changeset liquibase:get_kpi_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_kpi_master
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.get_kpi_master(
	p_kpi_code character varying);

CREATE OR REPLACE FUNCTION data_platform.get_kpi_master(
	p_kpi_code character varying)
    RETURNS TABLE(kpi_code character varying, kpi character varying, query text, variable character varying, "table" character varying, is_deleted boolean, created_by character varying, created_at timestamp with time zone, updated_by character varying, updated_at timestamp with time zone, deleted_by character varying, deleted_at timestamp with time zone) 
    LANGUAGE 'plpgsql'
    
AS $FUNCTION$
/*
Created by : Himani Sharma   Created On :11th July,2023    
*/
begin
  return query
  select km.kpicode ,
    km.kpi ,
    km."query" ,
    km.variable ,
    km."table" ,
    km.is_deleted ,
    um_created.user_name ,
    km.created_at ,
    um_updated.user_name ,
    km.updated_at ,
    um_deleted.user_name ,
    km.deleted_at 
	from data_platform.kpi_master as km 
    LEFT JOIN global.user_master AS um_created
    ON km.created_by = um_created.user_code
    LEFT JOIN global.user_master AS um_updated
    ON km.updated_by = um_updated.user_code
    LEFT JOIN global.user_master AS um_deleted
    ON km.deleted_by = um_deleted.user_code
    where km."kpicode" = p_kpi_code and km.is_deleted = False;
end;
$FUNCTION$;