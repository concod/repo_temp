--liquibase formatted sql
--changeset bhargav.polavarapu@impactanalytics.co:kpis_map runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for kpis_map
--rollback: SELECT 1
DROP FUNCTION IF EXISTS monday_smart.kpis_map();
CREATE 
OR REPLACE FUNCTION monday_smart.kpis_map() RETURNS TABLE(map jsonb) LANGUAGE plpgsql AS $function$ begin return query 
select 
  jsonb_build_object(
    name, 
    jsonb_build_object(
      'formula', 
      formula, 
      'variables', 
      array_to_json(variables)
    )
  ) 
from 
  monday_smart.kpis_master;
end $function$;
