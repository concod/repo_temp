--liquibase formatted sql
--changeset liquibase:delete_data_ingestion_config runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for delete_data_ingestion_config
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.delete_data_ingestion_config(
	p_attribute_name character varying,
	p_module character varying,
	p_user integer);


CREATE OR REPLACE FUNCTION data_platform.delete_data_ingestion_config(
	p_attribute_name character varying,
	p_module character varying,
	p_user integer)
    RETURNS integer
    LANGUAGE 'plpgsql'
AS $FUNCTION$
/*
Created by : Himani Sharma   Created On :15th March,2023    
Sample Call:
select * from data_platform.delete_data_ingestion_config(
            'tenant-id','sourcing_configuration',3)
*/
declare 
  v_actioned_ts timestamp := now();
  v_affected_rows int4;
begin
  update data_platform.data_ingestion_config set is_deleted=true, updated_by=p_user, updated_at=v_actioned_ts where attribute_name=p_attribute_name and module = p_module and is_latest and is_deleted = False;
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  return v_affected_rows;
end;
$FUNCTION$;