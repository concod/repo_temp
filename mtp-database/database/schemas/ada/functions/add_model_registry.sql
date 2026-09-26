--liquibase formatted sql
--changeset liquibase:add_model_registry runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_model_registry
--rollback: SELECT 1
DROP FUNCTION IF EXISTS ada.add_model_registry(p_model_code integer, p_tag jsonb, p_code character varying, p_training_sub_category character varying, p_training_category character varying, p_model_url character varying, p_lower_level_split_model_url character varying, p_hierarchy_level character varying, p_similarity_flag boolean, p_data_refresh_date date, p_experiment_id character varying, p_user integer);
CREATE OR REPLACE FUNCTION ada.add_model_registry(p_model_code integer, p_tag jsonb, p_code character varying, p_training_sub_category character varying, p_training_category character varying, p_model_url character varying, p_lower_level_split_model_url character varying, p_hierarchy_level character varying, p_similarity_flag boolean, p_data_refresh_date date, p_experiment_id character varying, p_user integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare 
  v_max_ver     INT4;
  v_tag_id      INT4;
  v_actioned_ts timestamp := now();
  v_affected_rows int4;
begin
  select tag_id into v_tag_id from ada.model_registry_tags where tag = p_tag::jsonb;
  if v_tag_id is null
  then 
    insert into ada.model_registry_tags values (default,p_tag::jsonb) returning tag_id into v_tag_id;
  end if;
 
  select
    coalesce(max(version),0)
  into
    v_max_ver
  from
    ada.model_registry
  where
    tag_id     = v_tag_id
  and
    training_sub_category  = p_training_sub_category
  and
    code       = p_code
  and
    is_latest;
  
  if v_max_ver = 0
  then
    -- create new ada.model_registry record with version=1
    insert into ada.model_registry
      (
 	   model_code,
	   tag_id,
	   code,
	   training_sub_category,	
	   version,
	   training_category,
	   model_url,
	   lower_level_split_model_url,
	   hierarchy_level,
	   similarity_flag,
       data_refresh_date,
	   experiment_id,
	   created_by,
	   created_at,
       is_latest
      )
    values
      (
       p_model_code,
	   v_tag_id,
	   p_code,
	   p_training_sub_category,
	   (v_max_ver+1),
	   p_training_category,
	   p_model_url,
	   p_lower_level_split_model_url,
	   p_hierarchy_level,
	   p_similarity_flag,
       p_data_refresh_date,
	   p_experiment_id,
	   p_user,
	   v_actioned_ts,
	   true
      );
      GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  else
     -- expire the existing latest record and create new ada.model_registry record with version= max(version)+1
    update ada.model_registry
    set is_latest = false, updated_by  = p_user, updated_at  = v_actioned_ts
    where tag_id = v_tag_id
    and code  = p_code
    and training_sub_category  = p_training_sub_category
    and is_latest;
    insert into ada.model_registry
      (
 	   model_code,
	   tag_id,
	   code,
	   training_sub_category,	
	   version,
	   training_category,
	   model_url,
	   lower_level_split_model_url,
	   hierarchy_level,
	   similarity_flag,
       data_refresh_date,
	   experiment_id,
	   created_by,
	   created_at,
       is_latest
      )
    values
      (
       p_model_code,
	   v_tag_id,
	   p_code,
	   p_training_sub_category,
	   (v_max_ver+1),
	   p_training_category,
	   p_model_url,
	   p_lower_level_split_model_url,
	   p_hierarchy_level,
	   p_similarity_flag,
       p_data_refresh_date,
	   p_experiment_id,
	   p_user,
	   v_actioned_ts,
	   true
      );
      GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end if;
  return v_affected_rows;
end;
$function$
;
