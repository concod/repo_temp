--liquibase formatted sql
--changeset liquibase:get_generic_trigger_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_generic_trigger_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.get_generic_trigger_mapping(
	p_view character varying);

CREATE OR REPLACE FUNCTION data_platform.get_generic_trigger_mapping(
	p_view character varying)
    RETURNS TABLE(view character varying, source_config character varying, connector character varying, trigger_rule character varying, trigger_query character varying, trigger_query_filter character varying, trigger_file character varying, is_mandatory boolean, is_deleted boolean, created_by integer, created_at timestamp with time zone, updated_by integer, updated_at timestamp with time zone, deleted_by integer, deleted_at timestamp with time zone) 
    LANGUAGE 'plpgsql'
    
AS $FUNCTION$
/*
Created by : Himani Sharma   Created On :4th July,2023    
*/
begin
  return query
  select gtm.view ,				
    gtm.source_config ,				
    gtm.connector ,				
    gtm.trigger_rule ,						
    gtm.trigger_query ,				
    gtm.trigger_query_filter ,					
    gtm.trigger_file ,
	gtm.is_mandatory,
	gtm.is_deleted ,
	gtm.created_by ,
    gtm.created_at ,
    gtm.updated_by ,
    gtm.updated_at ,
    gtm.deleted_by ,
    gtm.deleted_at 
	from data_platform.generic_trigger_mapping as gtm 
    LEFT JOIN global.user_master AS um_created
    ON gtm.created_by = um_created.user_code
    LEFT JOIN global.user_master AS um_updated
    ON gtm.updated_by = um_updated.user_code
    LEFT JOIN global.user_master AS um_deleted
    ON gtm.deleted_by = um_deleted.user_code
    where gtm."view" = p_view and gtm.is_deleted = False;
end;
$FUNCTION$;