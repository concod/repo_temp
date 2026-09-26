--liquibase formatted sql
--changeset liquibase:dc_store_rule_add runOnChange:true stripComments:false splitStatements:false context:MTP-31613 labels:MTP-31613
--comment: MTP-38504 Used to create the dc to store rule based on the dc to store rule configuration.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.dc_store_rule_add(dc_store_rule_data JSONB );
CREATE OR REPLACE FUNCTION inventory_smart.dc_store_rule_add(dc_store_rule_data JSONB )
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    _generated_id int4;
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
    BEGIN
       
	  insert into   "inventory_smart".dc_store_rule(rule_config_id,name,display_name,strategy,is_default,created_by,created_at) 
		values(
				cast(dc_store_rule_data ->> 'rule_config_id'AS Int4),
				dc_store_rule_data ->> 'name',
				dc_store_rule_data ->> 'display_name',
				(dc_store_rule_data ->>'strategy')::varchar,
				cast(dc_store_rule_data ->> 'is_default' AS BOOLEAN),
				cast(dc_store_rule_data ->> 'created_by'AS Int4),
				CURRENT_TIMESTAMP) 
		 RETURNING id INTO _generated_id;		
	     result := jsonb_build_object(
                'status', true,
                'message', 'DC to store rule record created',
                'id', _generated_id
            );
		
	EXCEPTION
    
        WHEN OTHERS THEN
             result := jsonb_build_object(
                'status', false,
                'message', 'Error: ' || SQLERRM
            );		
 
    END;
	
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.dc_store_rule_add', 'Before returning function value',null,dc_store_rule_data);
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
