--liquibase formatted sql
--changeset hisham.mohammed@impactanalytics.co:update_generic_trigger_mapping_instance runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added update_generic_trigger_mapping_instance function

DROP FUNCTION IF EXISTS data_platform.update_generic_trigger_mapping_instance(jsonb, int4, varchar);

CREATE OR REPLACE FUNCTION data_platform.update_generic_trigger_mapping_instance(
	input jsonb, 
	p_user integer, 
	p_instance character varying)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
/*
Created by : Hisham Mohammed   Created On :23rd June,2025    
Sample call :
select * from data_platform.update_generic_trigger_mapping_instance(
            '{"view":"view_name","source_config":"source_config_name","connector":"connector_name","trigger_rule":"trigger_rule_name","trigger_query":"trigger_query_name","trigger_query_filter":"trigger_query_filter_name","trigger_file":"trigger_file_name","is_mandatory":"true"}',
            3,
            '1')
*/
declare 
  v_actioned_ts timestamp := now();
  v_affected_rows int4;
  _query  text;
  _update_query text;
  rows_count int4;
  _key varchar;
  _value TEXT;
  _ret_val jsonb := '{}';
begin
	_query := 'SELECT count(*) from "data_platform".generic_trigger_mapping where is_deleted = False and "view" = ''' ||  (input->>'view')::varchar || '''  and "instance" = ''' || p_instance::smallint || ''' ;';
	execute _query into rows_count;
	if rows_count =0 then
		return -1;
	end if;
	
	_update_query := 'UPDATE "data_platform".generic_trigger_mapping SET ';
	for _key, _value in select * from jsonb_each_text($1) where value is not null loop
		_update_query := _update_query || format('%I = %L, ', _key, _value);
    END LOOP;
	
	_update_query := _update_query || format(' updated_by = %L, updated_at = %L', p_user, v_actioned_ts);
	_update_query := _update_query || ' WHERE '||format(' "view" = %L  and "instance" = %L and is_deleted = %L', (input->>'view')::varchar,p_instance::smallint,False);
    EXECUTE _update_query;
		
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  return v_affected_rows;
end;
$function$
;
