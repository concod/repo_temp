--liquibase formatted sql
--changeset liquibase:dc_store_rule_delete runOnChange:true stripComments:false splitStatements:false context:MTP-31613 labels:MTP-31613
--comment: MTP-38504 Used to delete the dc to store rule. It will change the is_deleted status to true (soft delete). It also change the is_deleted status to true in the dc_store_strategy_rule table for the crosponding rule definitions.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.dc_store_rule_delete(rule_id int4, user_id int4 );   
CREATE OR REPLACE FUNCTION inventory_smart.dc_store_rule_delete(rule_id int4, user_id int4 )
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    _updated_id int4;
    rule_filter JSONB := jsonb_agg(jsonb_build_object('rule_id', rule_id));
   
BEGIN
    -- Start the transaction
    BEGIN
        IF EXISTS (SELECT 1 FROM inventory_smart.dc_store_rule WHERE id = rule_id) THEN
       
        UPDATE inventory_smart.dc_store_rule
        SET is_deleted  = true,
        	updated_by = user_id,
        	updated_at = CURRENT_TIMESTAMP
        WHERE id = rule_id
        RETURNING id into _updated_id;

       --Change the is_deleted to true (soft delete in the record)
       UPDATE "inventory_smart".dc_store_strategy_rule 
         SET rule_def = (
            SELECT jsonb_agg(
                CASE
                    WHEN (rule->>'rule_id')::INT  = rule_id THEN jsonb_build_object(
                        'rule_id', rule->>'rule_id',
                        'name',rule->>'name',
                        'display_name',rule->>'dsiplay_name',
                        'strategy', rule->>'strategy',
                        'strategy_value',rule->>'strategy_value',
                        'is_deleted',true
                    )
                    ELSE rule
                END
            )
            FROM (
                SELECT jsonb_array_elements(rule_def) AS rule
                FROM "inventory_smart".dc_store_strategy_rule 
                WHERE rule_def @> rule_filter
            ) AS sub
 		)
        WHERE rule_def @>  rule_filter ;
       
   		
        result := jsonb_build_object(
            'status', true,
            'message', 'Dc to store rule record deleted',
            'rule_id', _updated_id
        );
      
    ELSE
        result := jsonb_build_object(
            'status', false,
            'message', 'Dc to store rule record does not exist',
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
