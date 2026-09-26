--liquibase formatted sql
--changeset liquibase:add_source_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_source_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.add_source_mapping(
	input jsonb,
	p_user integer);

CREATE OR REPLACE FUNCTION data_platform.add_source_mapping(
	input jsonb,
	p_user integer)
    RETURNS integer
    LANGUAGE 'plpgsql'
AS $FUNCTION$
/*
Created by : Himani Sharma   Created On :18th April,2023    
*/
declare 
  v_actioned_ts timestamp := now();
  v_affected_rows int4;
  rows_count int4 := 0;
  _query text;
begin
	_query := 'SELECT count(*) from "data_platform".source_mapping where is_deleted = false and "table" = ''' || (input->>'table')::varchar || ''' and "view" = ''' || (input->>'view')::varchar || ''' ;';
	execute _query into rows_count;
	if rows_count >=1 then
		return -1;
	end if;
    insert into data_platform.source_mapping 
      (tenant , 
	   "table" , 
    connector , 
    "view" , 
    source_config , 
    pull_type , 
    "replace",
    schedule_interval  ,
    intermediate_table ,
    "filter" ,
    dataingestion_filterparam  ,
    filter_param  ,
    extraction_sync_dt  ,
    source_format_regex ,
    inter_query_exec_order ,
    partition_column ,
    clustering_columns ,
    query_partitioning_threshold,
    num_partitions ,
    db_partition_column  ,
    field_delimiter ,
	is_deleted ,							
	created_by ,
    created_at )
    values
      ((input->>'tenant')::varchar , 
				  (input->>'table')::varchar , 
    (input->>'connector')::varchar , 
    (input->>'view')::varchar, 
    (input->>'source_config')::varchar , 
    (input->>'pull_type')::varchar , 
    (input->>'replace')::bool,
    (input->>'schedule_interval')::varchar  ,
    (input->>'intermediate_table')::varchar ,
    (input->>'filter')::varchar ,
    (input->>'dataingestion_filterparam')::timestamp  ,
    (input->>'filter_param')::timestamp  ,
    (input->>'extraction_sync_dt')::timestamp  ,
    (input->>'source_format_regex')::varchar ,
    (input->>'inter_query_exec_order')::int4 ,
    (input->>'partition_column')::varchar ,
    (input->>'clustering_columns')::varchar ,
    (input->>'query_partitioning_threshold')::int4,
    (input->>'num_partitions')::int4 ,
    (input->>'db_partition_column')::varchar  ,
    (input->>'field_delimiter')::varchar ,
	'False',							
	p_user ,
    v_actioned_ts);
      GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  return v_affected_rows;
end;
$FUNCTION$;