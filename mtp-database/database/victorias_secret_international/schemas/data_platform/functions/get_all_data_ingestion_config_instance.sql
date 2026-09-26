--liquibase formatted sql
--changeset hisham.mohammed@impactanalytics.co:get_all_data_ingestion_config_instance runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added get_all_data_ingestion_config_instance function

DROP FUNCTION IF EXISTS data_platform.get_all_data_ingestion_config_instance(varchar, varchar);

CREATE OR REPLACE FUNCTION data_platform.get_all_data_ingestion_config_instance(
  p_module character varying, 
  p_instance character varying
  )
 RETURNS TABLE(attribute_name character varying, attribute_value text, module character varying, is_mandatory boolean, description character varying, display_name character varying, version integer, created_by character varying, created_at timestamp with time zone, updated_by character varying, updated_at timestamp with time zone, is_deleted boolean, is_latest boolean, datatype character varying, hidden boolean)
 LANGUAGE plpgsql
AS $function$

/*
Created by : Hisham Mohammed   Created On :23rd June,2025    
Sample Call:
select * from data_platform.get_all_data_ingestion_config_instance(
            'sourcing_configuration','1')
*/
begin
 return query
 SELECT di.attribute_name,di.attribute_value,di.module,di.is_mandatory,di.description,di.display_name,di.version,um_created.user_name AS created_by,di.created_at, um_updated.user_name AS updated_by, di.updated_at,di.is_deleted,di.is_latest,di.datatype,di.hidden
       FROM data_platform.data_ingestion_config AS di
       LEFT JOIN global.user_master AS um_created
       ON di.created_by = um_created.user_code
       LEFT JOIN global.user_master AS um_updated
       ON di.updated_by = um_updated.user_code
       where di.is_latest and di.module = p_module and di.instance = cast(p_instance as smallint) and di.is_deleted = false and di.attribute_name != 'tenant_alias';
end;
$function$
;

