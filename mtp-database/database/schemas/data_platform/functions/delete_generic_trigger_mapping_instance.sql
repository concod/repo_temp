--liquibase formatted sql
--changeset hisham.mohammed@impactanalytics.co:delete_generic_trigger_mapping_instance runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added delete_generic_trigger_mapping_instance function

DROP FUNCTION IF EXISTS data_platform.delete_generic_trigger_mapping_instance(varchar, int4, varchar);

CREATE OR REPLACE FUNCTION data_platform.delete_generic_trigger_mapping_instance(
  p_view character varying, 
  p_user integer, 
  p_instance character varying)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$

/*
Created by : Hisham Mohammed   Created On :23rd June,2025    
Sample Call:
select * from data_platform.delete_generic_trigger_mapping_instance(
            'view_name',3,'1')
*/
declare 
  v_actioned_ts timestamp := now();
  v_affected_rows int4;
  _query  text;
  rows_count int4;
begin
	_query := 'SELECT count(*) from "data_platform".generic_trigger_mapping where is_deleted = False and "view" = ''' || p_view || ''' and "instance" = ''' || p_instance::smallint || ''' ;';
	execute _query into rows_count;
	if rows_count =0 then
		return -1;
	end if;
  update data_platform.generic_trigger_mapping set is_deleted=True, deleted_by=p_user, deleted_at=v_actioned_ts where "view"=p_view and "instance"=cast(p_instance as smallint);
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  return v_affected_rows;
end;
$function$
;
