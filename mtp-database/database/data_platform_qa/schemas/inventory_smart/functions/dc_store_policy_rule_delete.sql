--liquibase formatted sql
--changeset liquibase:dc_store_policy_rule_delete_modified runOnChange:true stripComments:false splitStatements:false context:MTP-63019 labels:MTP-63019
--comment: MTP-63019 Used to delete dc store policy rule
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.dc_store_policy_rule_delete(int4, text);
CREATE OR REPLACE FUNCTION inventory_smart.dc_store_policy_rule_delete(rule_code_value integer, screen text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare 
result jsonb;
_updated_id int4;
v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin
				
    begin
       
		UPDATE "inventory_smart".dc_store_policy_user_rule
	    SET 
	        is_deleted = True
	    WHERE rule_code = rule_code_value and rule_type = screen
	    RETURNING rule_code INTO _updated_id;
			
	    IF screen = 'dc-store-rule' THEN
	        UPDATE inventory_smart.rcl_dc_store_policy 
	        SET dc_store_rule = NULL,
	            updated_at = now()
	        WHERE dc_store_rule = rule_code_value;
	    ELSIF screen = 'auto-allocation' THEN
	        UPDATE inventory_smart.rcl_dc_store_policy 
	        SET auto_allocation_rule = NULL,
	            updated_at = now()
	        WHERE auto_allocation_rule = rule_code_value;
	    END IF;
			
        result := jsonb_build_object(
	                'status', true,
	                'message', 'DC Store Policy rule record is deleted',
	                'id', _updated_id
	            );
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.dc_store_policy_rule_delete', 'Before returning function value',null,jsonb_build_object(   'rule_code_value',$1,'screen',$2));
	 
	EXCEPTION
    
        WHEN OTHERS THEN
             result := jsonb_build_object(
                'status', false,
                'message', 'Error: ' || SQLERRM
            );		
 
    END;
    
    RETURN result;
END;
$function$
;
