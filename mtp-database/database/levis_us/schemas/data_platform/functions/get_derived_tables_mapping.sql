--liquibase formatted sql
--changeset liquibase:mohammed.abdulla@impactanalytics.co_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding db column to the derived tables mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.get_derived_tables_mapping(
	p_name character varying);

CREATE OR REPLACE FUNCTION data_platform.get_derived_tables_mapping(p_name character varying)
 RETURNS TABLE(name character varying, run_in character varying, replace_flag_gbq boolean, replace_flag_psg boolean, execution_order integer, type character varying, schedule_interval character varying, is_deleted boolean, created_by character varying, created_at timestamp with time zone, updated_by character varying, updated_at timestamp with time zone, deleted_by character varying, deleted_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
/*
Created by : Himani Sharma   Created On :16th May,2023    
*/
begin
  return query
  select dm.name,				
    dm.run_in,				
    dm.replace_flag_gbq,				
    dm.replace_flag_psg,						
    dm.execution_order,				
    dm.type,
    dm.label,
    dm.db,
    dm.schedule_interval,
	dm.is_deleted,
	dm.created_by,
    dm.created_at,
    dm.updated_by,
    dm.updated_at,
    dm.deleted_by,
    dm.deleted_at 
	from data_platform.derived_tables_mapping as dm 
    LEFT JOIN global.user_master AS um_created
    ON dm.created_by = um_created.user_code
    LEFT JOIN global.user_master AS um_updated
    ON dm.updated_by = um_updated.user_code
    LEFT JOIN global.user_master AS um_deleted
    ON dm.deleted_by = um_deleted.user_code
    where dm."name" = p_name and dm.is_deleted = False;
end;
$function$
;