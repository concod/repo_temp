--liquibase formatted sql
--changeset tarun.tyagi:dc_store_policy_rule_add runOnChange:true stripComments:false splitStatements:false context:MTP-110834 labels:MTP-110834
--comment: MTP-110834 Added rule_expression while creating the rule
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.dc_store_policy_rule_add(jsonb, text, int4);
CREATE OR REPLACE FUNCTION inventory_smart.dc_store_policy_rule_add(rule_data jsonb, screen text, _created_by integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB;
    _generated_id int4;
    existing_rule_count int4;
begin
     begin
	    SELECT COUNT(*) INTO existing_rule_count
        FROM "inventory_smart".dc_store_policy_user_rule
        WHERE rule_name = rule_data ->> 'rule_name' and rule_type = screen;
        
        IF existing_rule_count > 0 THEN
            result := jsonb_build_object(
                'status', false,
                'message', 'Error: Rule name already exists'
            );
        
        else
		  INSERT INTO "inventory_smart".dc_store_policy_user_rule (rule_name, "values", rule_expression, rule_type, created_by, is_deletable) 
			values (
					rule_data ->> 'rule_name',
					(rule_data -> 'rule_values')::jsonb,
                    CASE 
                        WHEN jsonb_typeof(rule_data -> 'rule_expression') = 'array'
                        THEN ARRAY(SELECT jsonb_array_elements_text(rule_data -> 'rule_expression'))
                        ELSE NULL
                    END,
					screen,
					_created_by,
					true
				)
	
			 RETURNING rule_code INTO _generated_id;	
			
			RAISE NOTICE 'dc_store_policy_rule_add - Created rule_code: %', _generated_id;
			
	         result := jsonb_build_object(
		                'status', true,
		                'message', 'DC Store Policy rule record created',
		                'id', _generated_id
		            );
	 	END IF;
	EXCEPTION
    
        WHEN OTHERS THEN
             RAISE NOTICE 'dc_store_policy_rule_add ERROR: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
             result := jsonb_build_object(
                'status', false,
                'message', 'Error: ' || SQLERRM
            );		
 
    END;
    
    RETURN result;
	
END;
$function$
;
