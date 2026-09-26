--liquibase formatted sql
--changeset liquibase:dc_store_rule_update runOnChange:true stripComments:false splitStatements:false context:MTP-31613 labels:MTP-31613
--comment: MTP-38504 Used to update the dc to store rule.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.dc_store_rule_update(rule_id int4, dc_store_rule_data JSONB );
CREATE OR REPLACE FUNCTION inventory_smart.dc_store_rule_update(rule_id int4, dc_store_rule_data JSONB )
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    _updated_id int4;
    _name text;
    _display_name text;
    rule_filter JSONB := jsonb_agg(jsonb_build_object('rule_id', rule_id));
   
BEGIN
     BEGIN
        IF EXISTS (SELECT 1 FROM inventory_smart.dc_store_rule WHERE id = rule_id) THEN
       
        _name := (dc_store_rule_data ->> 'name');
        _display_name := dc_store_rule_data ->> 'display_name';
        
        UPDATE "inventory_smart".dc_store_rule
        SET name = _name,
        	rule_config_id = cast(dc_store_rule_data ->> 'rule_config_id'AS Int4),
			display_name =	_display_name,
		   	strategy = (dc_store_rule_data ->>'strategy'),
        	is_default = cast(dc_store_rule_data ->> 'is_default' AS BOOLEAN),
        	updated_by = cast(dc_store_rule_data ->> 'updated_by'AS Int4),
        	updated_at = CURRENT_TIMESTAMP
        WHERE id = rule_id
        RETURNING id into _updated_id;
       
         --Update the DC to Store Strategy Rule for the changes on the name.

         UPDATE "inventory_smart".dc_store_strategy_rule 
         SET rule_def = (
            SELECT jsonb_agg(
                CASE
                    WHEN (rule->>'rule_id')::INT  = rule_id THEN jsonb_build_object(
                        'rule_id', rule_id,
                        'name',_name,
                        'display_name',_display_name,
                        'strategy', rule->>'strategy',
                        'strategy_value',rule->>'strategy_value',
                        'is_deleted',rule->>'is_deleted'
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
            'message', 'Dc to store rule record updated',
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
        WHEN OTHERS then
        	 
             result := jsonb_build_object(
                'status', false,
                'message', 'Error: ' || SQLERRM
            );		
 
    END;
   
    RETURN result;
END;
$$ LANGUAGE plpgsql;  