--liquibase formatted sql
--changeset mohammad.abdulla@impactanalytics.co:get_all_data_ingestion_config runOnChange:true stripComments:false splitStatements:false context:RELEASE_1_1 labels:removed_hidden_col_filter
--comment: exclude tenant_alias from the result
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.get_all_data_ingestion_config(
	p_module character varying);

CREATE OR REPLACE FUNCTION data_platform.get_all_data_ingestion_config(
	p_module character varying)
    RETURNS TABLE(attribute_name character varying, attribute_value text, module character varying, is_mandatory boolean, description character varying, display_name character varying, version integer, created_by character varying, created_at timestamp with time zone, updated_by character varying, updated_at timestamp with time zone, is_deleted boolean, is_latest boolean, datatype character varying, hidden boolean) 
    LANGUAGE 'plpgsql'

AS $FUNCTION$
/*
Created by : Himani Sharma   Created On :15th March,2023    
Sample Call:
select * from data_platform.get_all_data_ingestion_config('sourcing_configuration')
*/
begin
  return query
  SELECT di.attribute_name,di.attribute_value,di.module,di.is_mandatory,di.description,di.display_name,di.version,um_created.user_name AS created_by,di.created_at, um_updated.user_name AS updated_by, di.updated_at,di.is_deleted,di.is_latest,di.datatype,di.hidden
        FROM data_platform.data_ingestion_config AS di
        LEFT JOIN global.user_master AS um_created
        ON di.created_by = um_created.user_code
        LEFT JOIN global.user_master AS um_updated
        ON di.updated_by = um_updated.user_code
        where di.is_latest and di.module = p_module and di.is_deleted = false and di.attribute_name != 'tenant_alias';
end;
$FUNCTION$;