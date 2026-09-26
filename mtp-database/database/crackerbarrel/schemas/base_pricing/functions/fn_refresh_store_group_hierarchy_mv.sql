--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_refresh_store_group_hierarchy_mv stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_refresh_store_group_hierarchy_mv

DROP FUNCTION IF EXISTS base_pricing.fn_refresh_store_group_hierarchy_mv;

CREATE OR REPLACE FUNCTION base_pricing.fn_refresh_store_group_hierarchy_mv()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  max_level integer;
  case_statements text := '';
  array_agg_statements text := '';
  select_statements text := '';
  level_num integer;
  full_query text;
BEGIN
  -- Get max hierarchy level
  SELECT MAX(store_hierarchy_level_id) INTO max_level FROM base_pricing.bp_store_hierarchy_level;

  -- Build CASE statements for each level
  FOR level_num IN 0..max_level LOOP
    case_statements := case_statements || 
      'CASE WHEN tsh.hierarchy_level = ' || level_num || ' THEN tsh.hierarchy_value ELSE NULL::integer END AS s' || level_num || '_ids, ';
  END LOOP;
  case_statements := left(case_statements, length(case_statements) - 2); -- remove trailing comma and space

  -- Build array_agg statements
  FOR level_num IN 0..max_level LOOP
    array_agg_statements := array_agg_statements || 
      'array_agg(DISTINCT hierarchy_data.s' || level_num || '_ids) FILTER (WHERE hierarchy_data.s' || level_num || '_ids IS NOT NULL) AS s' || level_num || '_ids, ';
  END LOOP;
  array_agg_statements := left(array_agg_statements, length(array_agg_statements) - 2);

  -- Build final SELECT columns
  FOR level_num IN 0..max_level LOOP
    select_statements := select_statements || 'hierarchy_agg_data.s' || level_num || '_ids, ';
  END LOOP;
  select_statements := left(select_statements, length(select_statements) - 2);

  -- Drop existing MV
  EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS base_pricing.mv_store_group_hierarchy_agg_data';

  -- Build full dynamic query including CTEs and create MV
  full_query := '
  CREATE MATERIALIZED VIEW base_pricing.mv_store_group_hierarchy_agg_data
     
  AS
  WITH hierarchy_data AS (
    SELECT
      tsh.store_group_id,
      ' || case_statements || '
    FROM base_pricing.bp_store_group_hierarchy tsh
    GROUP BY tsh.store_group_id, tsh.hierarchy_level, tsh.hierarchy_value
  ),
  hierarchy_agg_data AS (
    SELECT
      hierarchy_data.store_group_id,
      ' || array_agg_statements || '
    FROM hierarchy_data
    GROUP BY hierarchy_data.store_group_id
  )
  SELECT
    hierarchy_agg_data.store_group_id,
    ' || select_statements || '
  FROM hierarchy_agg_data
  WITH DATA;';

  -- Execute full query
  EXECUTE full_query;

  -- Create index on store_group_id
  EXECUTE 'CREATE INDEX mvw_sg_hierarchy_agg_data_sg_id_idx ON base_pricing.mv_store_group_hierarchy_agg_data USING btree (store_group_id);';

END;
$function$
;