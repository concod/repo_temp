--liquibase formatted sql
--changeset akshay.jain@impactanalytics.co:fetch_hierarchy_info_for_client runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:uam_hierarchy_for_client
--comment: fetch hierarchy info for client
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.fetch_hierarchy_info_for_client();
CREATE OR REPLACE FUNCTION global.fetch_hierarchy_info_for_client()
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  json_data JSONB := '{}';
  result JSONB := '{}';
  key TEXT;
  values JSONB;
  value JSONB;
 hierarchy text[];
 value_name TEXT;
BEGIN
  -- Loop through the keys in the JSON data
select attribute_value from global.tenant_attribute_master where name = 'user_hierarchies' into json_data;
  FOR key IN SELECT jsonb_object_keys(json_data) LOOP
    -- Get the array of values corresponding to the "name" key
    values := json_data->key;
    
   	hierarchy:= '{}';
  	
    -- Loop through the array of values
    FOR value IN SELECT jsonb_array_elements(values) LOOP
      -- Add each value to the result dictionary
	    
	   value_name := value->>'name';
	  hierarchy := hierarchy || value_name;
    END LOOP;
   result := jsonb_set(result, ARRAY[key], to_jsonb(hierarchy));
   raise notice '%', hierarchy;
  END LOOP;

  RETURN result;
END;
$function$
;

