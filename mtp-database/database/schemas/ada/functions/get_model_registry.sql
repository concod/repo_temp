--liquibase formatted sql
--changeset liquibase:get_model_registry runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_model_registry
--rollback: SELECT 1
DROP FUNCTION IF EXISTS ada.get_model_registry(p_tag jsonb, p_code character varying);
CREATE OR REPLACE FUNCTION ada.get_model_registry(p_tag jsonb, p_code character varying)
 RETURNS TABLE(model_code integer, tag jsonb, code character varying, training_sub_category character varying, version integer, training_category character varying, model_url character varying, lower_level_split_model_url character varying, hierarchy_level character varying, similarity_flag boolean, data_refresh_date date, experiment_id character varying, created_by integer, created_at timestamp with time zone, updated_by integer, updated_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
begin
  return query
  select 
 	mr.model_code,
	tags.tag,
	mr.code,
	mr.training_sub_category,	
	mr.version,
	mr.training_category,
	mr.model_url,
	mr.lower_level_split_model_url,
	mr.hierarchy_level,
	mr.similarity_flag,
    mr.data_refresh_date,
	mr.experiment_id,
	mr.created_by,
	mr.created_at,
    mr.updated_by,
	mr.updated_at
  from ada.model_registry mr
  inner join ada.model_registry_tags tags
  on mr.tag_id = tags.tag_id
  where tags.tag = p_tag
  and mr.code  = p_code
  and mr.is_latest and mr.is_deleted = false;
end;
$function$
;
