--liquibase formatted sql
--changeset liquibase:dc_store_strategy_rule_update runOnChange:true stripComments:false splitStatements:false context:MTP-31613 labels:MTP-31613
--comment: MTP-38504 Used to update the dc store strategy rule.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.dc_store_strategy_rule_update(rule_id int4, strategy_data JSONB );
CREATE OR REPLACE FUNCTION inventory_smart.dc_store_strategy_rule_update(rule_id int4, strategy_data JSONB )
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    _updated_id int4;
BEGIN
    -- Start the transaction
    BEGIN
        IF EXISTS (SELECT 1 FROM inventory_smart.dc_store_strategy_rule WHERE id = rule_id) THEN
       
        UPDATE inventory_smart.dc_store_strategy_rule
        SET name = (strategy_data ->> 'name'),
        	rule_def = (strategy_data ->>'rule_def')::jsonb,
        	is_default = cast(strategy_data ->> 'is_default' AS BOOLEAN),
        	updated_by = cast(strategy_data ->> 'updated_by'AS Int4),
        	updated_at = CURRENT_TIMESTAMP
        WHERE id = rule_id
        RETURNING id into _updated_id;
       
        result := jsonb_build_object(
            'status', true,
            'message', 'Dc to store strategy rule record updated',
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
   
    RETURN result;
END;
$$ LANGUAGE plpgsql;  
