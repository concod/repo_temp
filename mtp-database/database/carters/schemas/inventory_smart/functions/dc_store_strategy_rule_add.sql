--liquibase formatted sql
--changeset liquibase:dc_store_strategy_rule_add runOnChange:true stripComments:false splitStatements:false context:MTP-31613 labels:MTP-31613
--comment: MTP-38504 Used to create the dc to store strategy rule.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.dc_store_strategy_rule_add(strategy_data JSONB );
CREATE OR REPLACE FUNCTION inventory_smart.dc_store_strategy_rule_add(strategy_data JSONB )
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    _generated_id int4;
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
  
BEGIN
     BEGIN
       
	  insert into   "inventory_smart".dc_store_strategy_rule(name,rule_def,is_default,created_by,created_at) 
		values(strategy_data ->> 'name',
				(strategy_data ->>'rule_def')::jsonb,
				cast(strategy_data ->> 'is_default' AS BOOLEAN),
				cast(strategy_data ->> 'created_by'AS Int4),
				CURRENT_TIMESTAMP) 
		 RETURNING id INTO _generated_id;	
		
         result := jsonb_build_object(
	                'status', true,
	                'message', 'DC to store strategy rule record created',
	                'id', _generated_id
	            );
	 
	EXCEPTION
    
        WHEN OTHERS THEN
             result := jsonb_build_object(
                'status', false,
                'message', 'Error: ' || SQLERRM
            );		
 
    END;
	
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.dc_store_strategy_rule_add', 'Before returning function value',null,strategy_data);

    RETURN result;
END;
$$ LANGUAGE plpgsql;


