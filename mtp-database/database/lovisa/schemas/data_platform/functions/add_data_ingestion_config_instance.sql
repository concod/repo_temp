--liquibase formatted sql
--changeset hisham.mohammed@impactanalytics.co:add_data_ingestion_config_instance runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added add_data_ingestion_config_instance function

DROP FUNCTION IF EXISTS data_platform.add_data_ingestion_config_instance(varchar, text, varchar, varchar, bool, varchar, varchar, int4, bool, varchar);


CREATE OR REPLACE FUNCTION data_platform.add_data_ingestion_config_instance(
  p_attribute_name character varying, 
  p_attribute_value text, 
  p_datatype character varying, 
  p_module character varying, 
  p_is_mandatory boolean, 
  p_description character varying, 
  p_display_name character varying, 
  p_user integer, 
  p_hidden boolean, 
  p_instance character varying)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$

/*
Created by : Hisham Mohammed   Created On :23rd June,2025    
Sample Call :
select * from data_platform.add_data_ingestion_config_instance(
            'tenant-id','Signet','str','configuration,True,'name of tenant','tenant',3, False, '1');
      
*/
declare 
  v_max_ver     INT4;
  v_actioned_ts timestamp := now();
  v_affected_rows int4;
begin
  
  select
    coalesce(max(version),0)
  into
    v_max_ver
  from
    data_platform.data_ingestion_config 
  where
    attribute_name     = p_attribute_name
  and
    module = p_module
  and 
	instance = cast(p_instance as smallint)
   and
    is_latest;
  
  if v_max_ver = 0
  then
    insert into data_platform.data_ingestion_config 
      (attribute_name,attribute_value,datatype,module,is_mandatory,description,display_name,version,created_by,created_at,is_latest,hidden,instance)
    values
      (p_attribute_name,p_attribute_value,p_datatype,p_module,p_is_mandatory,p_description,p_display_name,(v_max_ver+1),p_user,v_actioned_ts,true,p_hidden,cast(p_instance as smallint));
      GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  else
    update data_platform.data_ingestion_config 
    set is_latest = false, updated_by  = p_user, updated_at  = v_actioned_ts
    where attribute_name = p_attribute_name
	and module = p_module
	and instance = cast(p_instance as smallint)
    and is_latest;
    insert into data_platform.data_ingestion_config 
      (attribute_name,attribute_value,datatype,module,is_mandatory,description,display_name,version,created_by,created_at,is_latest,hidden,instance )
    values
      (p_attribute_name,p_attribute_value,p_datatype,p_module,p_is_mandatory,p_description,p_display_name,(v_max_ver+1),p_user,v_actioned_ts,true,p_hidden, cast(p_instance as smallint));
      GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end if;
  return v_affected_rows;
end;
$function$
;