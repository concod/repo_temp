--liquibase formatted sql
--changeset tarun.tyagi:dc_store_policy_rule_update runOnChange:true stripComments:false splitStatements:false context:MTP-110834 labels:MTP-110834
--comment: MTP-110834 Added rule_expression for update
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.dc_store_policy_rule_update(jsonb, text, int4);
CREATE OR REPLACE FUNCTION inventory_smart.dc_store_policy_rule_update(rule_data jsonb, screen text, _updated_by integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB;
    updated_rule_name text;
	updated_values jsonb;
	updated_rule_expression text[];
	_updated_id int4;
   begin
	   
		IF rule_data ? 'rule_name' THEN
	        updated_rule_name := rule_data ->> 'rule_name';
	    ELSE
	        updated_rule_name := NULL;
	    END IF;
	
	   updated_values := COALESCE(rule_data -> 'rule_values', '{}'::jsonb);	
	   

	   IF rule_data ? 'rule_expression' THEN
	        updated_rule_expression := CASE WHEN jsonb_typeof(rule_data -> 'rule_expression') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(rule_data -> 'rule_expression')) ELSE NULL END;
	    ELSE
	        updated_rule_expression := NULL;
	    END IF;
	  
	    -- Update the rule
	    UPDATE "inventory_smart".dc_store_policy_user_rule
	    SET 
	        rule_name = COALESCE(updated_rule_name, rule_name),
	        "values" = updated_values,
	        rule_expression = CASE WHEN rule_data ? 'rule_expression' THEN updated_rule_expression ELSE rule_expression END,
	        updated_by = _updated_by,
	        updated_at = current_timestamp
	    WHERE rule_code = CAST(rule_data ->> 'rule_code' AS integer) AND rule_type = screen
	    RETURNING rule_code INTO _updated_id;
	
	    IF FOUND THEN
	        RAISE NOTICE 'dc_store_policy_rule_update - Updated rule_code: %', _updated_id;
	        result := jsonb_build_object(
	            'status', true,
	            'message', 'DC Store Policy rule record updated',
	            'id', _updated_id
	        );
	    ELSE
	        result := jsonb_build_object(
	            'status', false,
	            'message', 'Error: Rule with provided rule_code does not exist'
	        );
	    END IF;
	
	    RETURN result;
	
	EXCEPTION
	    WHEN OTHERS THEN
	        RAISE NOTICE 'dc_store_policy_rule_update ERROR: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
	        result := jsonb_build_object(
	            'status', false,
	            'message', 'Error: ' || SQLERRM
	        );
	        RETURN result;
		

	END;
$function$
;
