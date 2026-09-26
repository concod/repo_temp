--liquibase formatted sql
--changeset liquibase:get_source_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_source_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.get_source_mapping(
	p_table_name character varying,
	p_view character varying);

CREATE OR REPLACE FUNCTION data_platform.get_source_mapping(
	p_table_name character varying,
	p_view character varying)
    RETURNS TABLE(tenant character varying, "table" character varying, connector character varying, view character varying, source_config character varying, pull_type character varying, replace boolean, schedule_interval character varying, intermediate_table character varying, filter character varying, dataingestion_filterparam timestamp without time zone, filter_param timestamp without time zone, extraction_sync_dt timestamp without time zone, source_format_regex character varying, inter_query_exec_order integer, partition_column character varying, clustering_columns character varying, query_partitioning_threshold integer, num_partitions integer, db_partition_column character varying, field_delimiter character varying, is_deleted boolean, created_by character varying, created_at timestamp with time zone, updated_by character varying, updated_at timestamp with time zone, deleted_by character varying, deleted_at timestamp with time zone) 
    LANGUAGE 'plpgsql'

AS $FUNCTION$
/*
Created by : Himani Sharma   Created On :18th April,2023    
*/
begin
  return query
  select sm.tenant , 
	sm."table" , 
    sm.connector , 
    sm."view" , 
    sm.source_config , 
    sm.pull_type , 
    sm."replace",
    sm.schedule_interval  ,
    sm.intermediate_table ,
    sm."filter" ,
    sm.dataingestion_filterparam  ,
    sm.filter_param  ,
    sm.extraction_sync_dt  ,
    sm.source_format_regex ,
    sm.inter_query_exec_order ,
    sm.partition_column ,
    sm.clustering_columns ,
    sm.query_partitioning_threshold,
    sm.num_partitions ,
    sm.db_partition_column  ,
    sm.field_delimiter ,
	sm.is_deleted ,							
	um_created.created_by ,
    sm.created_at ,
    um_updated.updated_by ,
    sm.updated_at ,
	um_deleted.deleted_by ,
    sm.deleted_at 
	from data_platform.source_mapping as sm
    LEFT JOIN global.user_master AS um_created
    ON sm.created_by = um_created.user_code
    LEFT JOIN global.user_master AS um_updated
    ON sm.updated_by = um_updated.user_code
    LEFT JOIN global.user_master AS um_deleted
    ON sm.deleted_by = um_deleted.user_code
    where sm."table" = p_table_name and sm."view"=p_view and sm.is_deleted = false;
end;
$FUNCTION$;