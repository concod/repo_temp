--liquibase formatted sql
--changeset liquibase:dc_store_policy_rule_update runOnChange:true stripComments:false splitStatements:false context:MTP-63019 labels:MTP-63019
--comment: MTP-63019 Used to update a dc store policy rule
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
	_updated_id int4;
   begin
	   
		IF rule_data ? 'rule_name' THEN
	        updated_rule_name := rule_data ->> 'rule_name';
	    ELSE
	        updated_rule_name := NULL;
	    END IF;
	
	   updated_values := COALESCE(rule_data -> 'rule_values', '{}'::jsonb);	
	  
	    -- Update the rule
	    UPDATE "inventory_smart".dc_store_policy_user_rule
	    SET 
	        rule_name = COALESCE(updated_rule_name, rule_name),
	        "values" = updated_values,
	        updated_by = _updated_by,
	        updated_at = current_timestamp
	    WHERE rule_code = CAST(rule_data ->> 'rule_code' AS integer) AND rule_type = screen
	    RETURNING rule_code INTO _updated_id;
	
	    IF FOUND THEN
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
	        result := jsonb_build_object(
	            'status', false,
	            'message', 'Error: ' || SQLERRM
	        );
	        RETURN result;
		

	END;
$function$
;
