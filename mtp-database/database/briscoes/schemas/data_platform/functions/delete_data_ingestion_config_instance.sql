--liquibase formatted sql
--changeset hisham.mohammed@impactanalytics.co:delete_data_ingestion_config_instance runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added delete_data_ingestion_config_instance function

DROP FUNCTION IF EXISTS data_platform.delete_data_ingestion_config_instance(varchar, varchar, int4, varchar);


CREATE OR REPLACE FUNCTION data_platform.delete_data_ingestion_config_instance(
  p_attribute_name character varying, 
  p_module character varying, 
  p_user integer, 
  p_instance character varying)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$

/*
Created by : Hisham Mohammed   Created On :23rd June,2025    
Sample Call:
select * from data_platform.delete_data_ingestion_config_instance(
            'tenant-id','sourcing_configuration',3)
*/
declare 
  v_actioned_ts timestamp := now();
  v_affected_rows int4;
begin
  update data_platform.data_ingestion_config set is_deleted=true, updated_by=p_user, updated_at=v_actioned_ts where attribute_name=p_attribute_name and module = p_module and is_latest and is_deleted = False and instance = cast(p_instance as smallint);
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  return v_affected_rows;
end;
$function$
;
