--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:get_iaf_query runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:mtp-43302
--comment:  initial changeset 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_iaf_query(p_plan_code integer);
CREATE OR REPLACE FUNCTION plan_smart.get_iaf_query(p_plan_code integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_query_combine text := '';
    v_plan_id       text;
BEGIN
   
    SELECT 
      attribute_value 
    INTO 
      v_plan_id
   FROM 
      plan_smart.plan_attributes 
    WHERE 
      attribute_name = 'planid' AND plan_code = p_plan_code;
    

    IF v_plan_id IS  NULL THEN
       v_query_combine := 'SELECT * FROM plan_smart.iaf_master_1';
    ELSE
       v_query_combine := 'SELECT * FROM plan_smart.iaf_optimized WHERE plan_id = ' || quote_literal(v_plan_id);
    END IF;

   
   raise notice 'v_query_combine : %', v_query_combine;
  
    RETURN v_query_combine;
END
$function$
;
