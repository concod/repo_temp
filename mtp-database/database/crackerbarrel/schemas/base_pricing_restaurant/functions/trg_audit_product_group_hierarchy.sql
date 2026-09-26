--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:trg_audit_product_group_hierarchy stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.trg_audit_product_group_hierarchy

DROP FUNCTION IF EXISTS base_pricing_restaurant.trg_audit_product_group_hierarchy;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.trg_audit_product_group_hierarchy()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    changed_fields_json JSONB := '{}';
    old_values_json JSONB := '{}';
    new_values_json JSONB := '{}';
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        -- Check which fields have changed
        IF OLD.hierarchy_level IS DISTINCT FROM NEW.hierarchy_level THEN
            changed_fields_json = changed_fields_json || '["hierarchy_level"]';
            old_values_json = old_values_json || jsonb_build_object('hierarchy_level', OLD.hierarchy_level);
            new_values_json = new_values_json || jsonb_build_object('hierarchy_level', NEW.hierarchy_level);
        END IF;
        
        IF OLD.hierarchy_value IS DISTINCT FROM NEW.hierarchy_value THEN
            changed_fields_json = changed_fields_json || '["hierarchy_value"]';
            old_values_json = old_values_json || jsonb_build_object('hierarchy_value', OLD.hierarchy_value);
            new_values_json = new_values_json || jsonb_build_object('hierarchy_value', NEW.hierarchy_value);
        END IF;
        
        IF OLD.is_deleted IS DISTINCT FROM NEW.is_deleted THEN
            changed_fields_json = changed_fields_json || '["is_deleted"]';
            old_values_json = old_values_json || jsonb_build_object('is_deleted', OLD.is_deleted);
            new_values_json = new_values_json || jsonb_build_object('is_deleted', NEW.is_deleted);
        END IF;
        
        -- Only insert if something actually changed
        IF jsonb_array_length(changed_fields_json) > 0 THEN
            INSERT INTO base_pricing_restaurant.bp_audit_trail(
                table_name, record_id, operation_type, 
                changed_fields, old_values, new_values, 
                changed_by, changed_at
            ) VALUES (
                'bp_product_group_hierarchy', NEW.pg_id, 'UPDATE',
                changed_fields_json, old_values_json, new_values_json,
                0, NOW()
            );
        END IF;
        
    ELSIF (TG_OP = 'INSERT') THEN
        -- For inserts, capture all fields
        changed_fields_json = '["record"]';
        new_values_json = jsonb_build_object(
            'pg_id', NEW.pg_id,
            'hierarchy_level', NEW.hierarchy_level,
            'hierarchy_value', NEW.hierarchy_value,
            'is_deleted', NEW.is_deleted
        );
        
        INSERT INTO base_pricing_restaurant.bp_audit_trail(
            table_name, record_id, operation_type, 
            changed_fields, old_values, new_values, 
            changed_by, changed_at
        ) VALUES (
            'bp_product_group_hierarchy', NEW.pg_id, 'INSERT',
            changed_fields_json, NULL, new_values_json,
            0, NOW()
        );
        
    ELSIF (TG_OP = 'DELETE') THEN
        -- For deletes, capture the entire record
        changed_fields_json = '["record"]';
        old_values_json = jsonb_build_object(
            'pg_id', OLD.pg_id,
            'hierarchy_level', OLD.hierarchy_level,
            'hierarchy_value', OLD.hierarchy_value,
            'is_deleted', OLD.is_deleted
        );
        
        INSERT INTO base_pricing_restaurant.bp_audit_trail(
            table_name, record_id, operation_type, 
            changed_fields, old_values, new_values, 
            changed_by, changed_at
        ) VALUES (
            'bp_product_group_hierarchy', OLD.pg_id, 'DELETE',
            changed_fields_json, old_values_json, NULL,
            0, NOW()
        );
    END IF;
    
    RETURN NULL;
END;
$function$
;