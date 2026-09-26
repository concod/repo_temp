--liquibase formatted sql
--changeset liquibase:get_rule_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_rule_master
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.get_rule_master(
	p_rule character varying);

CREATE OR REPLACE FUNCTION data_platform.get_rule_master(
	p_rule character varying)
    RETURNS TABLE(agg boolean, value character varying, kpis character varying, "table" character varying, outer_filter character varying, action character varying, name character varying, group_by character varying, inner_filter character varying, module character varying, threshold character varying, rule character varying, is_deleted boolean, created_by character varying, created_at timestamp with time zone, updated_by character varying, updated_at timestamp with time zone, deleted_by character varying, deleted_at timestamp with time zone, rule_display_name character varying, rule_description character varying) 
    LANGUAGE 'plpgsql'
    
AS $FUNCTION$
/*
Created by : Himani Sharma   Created On :11th July,2023    
*/
begin
  return query
  select 
  	rm."agg",				
    rm.value	,				
    rm.kpis ,				
    rm."table" ,			
    rm.outer_filter ,				
    rm.action ,				
    rm.name ,				
    rm.group_by ,					
    rm.inner_filter ,				
    rm.module ,				
    rm.threshold ,					
    rm.rule ,
    rm.is_deleted ,
    um_created.user_name ,
    rm.created_at ,
    um_updated.user_name ,
    rm.updated_at ,
    um_deleted.user_name ,
    rm.deleted_at,
	rm.rule_display_name,
	rm.rule_description
	from data_platform.rule_master as rm 
    LEFT JOIN global.user_master AS um_created
    ON rm.created_by = um_created.user_code
    LEFT JOIN global.user_master AS um_updated
    ON rm.updated_by = um_updated.user_code
    LEFT JOIN global.user_master AS um_deleted
    ON rm.deleted_by = um_deleted.user_code
    where rm."rule" = p_rule and rm.is_deleted = False;
end;
$FUNCTION$;