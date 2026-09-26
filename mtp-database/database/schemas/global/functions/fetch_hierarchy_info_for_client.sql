--liquibase formatted sql
--changeset srishti.kumariimpactanalytics.co:fetch_hierarchy_info_for_client_for_application runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:uam_hierarchy_for_client_for_application
--comment: fetch hierarchy info for client for application
--rollback: SELECT 1

DROP FUNCTION IF EXISTS global.fetch_hierarchy_info_for_client();
DROP FUNCTION IF EXISTS global.fetch_hierarchy_info_for_client(TEXT, INTEGER);
CREATE OR REPLACE FUNCTION global.fetch_hierarchy_info_for_client(
  application_name TEXT DEFAULT NULL,
  application_code_ INTEGER DEFAULT NULL
)
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
  app_code INTEGER;
BEGIN
  -- Determine which application_code to use
  IF application_name IS NOT NULL THEN
      SELECT application_code INTO app_code 
      FROM global.application_master 
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(application_name));
        
      IF app_code IS NULL THEN
        -- If not found, raise an error
        RAISE EXCEPTION 'Application "%" not found in application_master', application_name;
      END IF;
  ELSIF application_code_ IS NOT NULL THEN
    -- If application_code is provided directly, use it
    app_code := application_code_;
    RAISE NOTICE 'Using provided application_code: %', app_code;
  ELSE
    -- If neither is provided, use default application_code 6
    app_code := 6;
    RAISE NOTICE 'No input provided. Using default application_code: 6';
END IF;
	
-- Below checking if data exist for determined app code if no then fetch for app code 6 and atlast app code 3
  
  select
	attribute_value
	into
		json_data
	from
		global.tenant_attribute_master
	where
		name = 'user_hierarchies'
		and application_code = any(ARRAY[app_code,6,3])
	order by
		array_position(ARRAY[app_code,6,3], application_code)
	limit 1;


	IF json_data is NULL THEN
		-- if data not found found for determined app code then fetch for first entry whatever found. This is for keeping data backward cascade
		SELECT attribute_value 
	  FROM global.tenant_attribute_master 
	  WHERE name = 'user_hierarchies' limit 1
	  INTO json_data;
	end if;
		
  
  -- Build hierarchy structure
  IF json_data IS NOT NULL THEN
    FOR key IN SELECT jsonb_object_keys(json_data) LOOP
      -- Get the array of values corresponding to the key
      values := json_data->key;
      hierarchy := '{}';
      
      -- Loop through the array of values
      FOR value IN SELECT jsonb_array_elements(values) LOOP
        value_name := value->>'name';
        hierarchy := hierarchy || value_name;
      END LOOP;
      
      -- Add this hierarchy to the result
      result := jsonb_set(result, ARRAY[key], to_jsonb(hierarchy));
      RAISE NOTICE 'Hierarchy: %, Levels: %', key, hierarchy;
    END LOOP;
  ELSE
    RAISE NOTICE 'No hierarchies found for application_code: %', app_code;
    result := '{}';
  END IF;

  RETURN result;
END;
$function$
;