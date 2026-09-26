--liquibase formatted sql
--changeset himani.sharma@impactanalytics.co:get_derived_tables_mapping_alter runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:added db_type
--comment: added db type
DROP FUNCTION IF EXISTS data_platform.get_derived_tables_mapping_clickhouse(p_name character varying);

CREATE OR REPLACE FUNCTION data_platform.get_derived_tables_mapping_clickhouse(p_name character varying)
RETURNS TABLE(
  name character varying,
  run_in character varying,
  replace_flag_gbq character varying,
  replace_flag_psg character varying,
  execution_order integer,
  type character varying,
  label character varying,        
  db character varying,           
  schedule_interval character varying,
  db_type character varying,
  is_deleted boolean,
  created_by character varying,
  created_at timestamp with time zone,
  updated_by character varying,
  updated_at timestamp with time zone,
  deleted_by character varying,
  deleted_at timestamp with time zone
)
LANGUAGE plpgsql
AS $function$
/*
Created by : Himani Sharma   Created On :7th Jan,2026    
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
    dm.db_type,
	dm.is_deleted,
	um_created.name   AS created_by,
    dm.created_at,
    um_updated.name   AS updated_by,
    dm.updated_at,
    um_deleted.name   AS deleted_by,
    dm.deleted_at 
	from data_platform.derived_tables_mapping_clickhouse as dm 
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