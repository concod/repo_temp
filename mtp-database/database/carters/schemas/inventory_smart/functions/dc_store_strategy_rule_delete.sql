--liquibase formatted sql
--changeset liquibase:dc_store_strategy_rule_delete runOnChange:true stripComments:false splitStatements:false context:MTP-31613 labels:MTP-31613
--comment: MTP-38504 Used to delete the dc to store strategy rule.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.dc_store_strategy_rule_delete(rule_id int4, user_id int4 );
    CREATE OR REPLACE FUNCTION inventory_smart.dc_store_strategy_rule_delete(rule_id int4, user_id int4 )
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    _updated_id int4;
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
    -- Start the transaction
    BEGIN
        IF EXISTS (SELECT 1 FROM inventory_smart.dc_store_strategy_rule WHERE id = rule_id) THEN
       
        UPDATE inventory_smart.dc_store_strategy_rule
        SET is_deleted  = true,
        	updated_by = user_id,
        	updated_at = CURRENT_TIMESTAMP
        WHERE id = rule_id
        RETURNING id into _updated_id;
       
        result := jsonb_build_object(
            'status', true,
            'message', 'DC to store strategy rule record deleted',
            'rule_id', _updated_id
        );
      
    ELSE
        result := jsonb_build_object(
            'status', false,
            'message', 'DC to store strategy rule record does not exist',
            'rule_id', rule_id
        );
    END IF;
   
	EXCEPTION
        WHEN OTHERS THEN
             result := jsonb_build_object(
                'status', false,
                'message', 'Error: ' || SQLERRM
            );		
 
    END;
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.dc_store_strategy_rule_delete', 'Before returning function value',null,jsonb_build_object('rule_id',rule_id,'user_id',user_id));
   
    RETURN result;
END;
$$ LANGUAGE plpgsql;  

