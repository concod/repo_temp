--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:trg_audit_store_group stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.trg_audit_store_group

DROP FUNCTION IF EXISTS base_pricing_restaurant.trg_audit_store_group;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.trg_audit_store_group()
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
        IF OLD.store_group_name IS DISTINCT FROM NEW.store_group_name THEN
            changed_fields_json = changed_fields_json || '["store_group_name"]';
            old_values_json = old_values_json || jsonb_build_object('store_group_name', OLD.store_group_name);
            new_values_json = new_values_json || jsonb_build_object('store_group_name', NEW.store_group_name);
        END IF;
        
        IF OLD.sg_grouping_type IS DISTINCT FROM NEW.sg_grouping_type THEN
            changed_fields_json = changed_fields_json || '["sg_grouping_type"]';
            old_values_json = old_values_json || jsonb_build_object('sg_grouping_type', OLD.sg_grouping_type);
            new_values_json = new_values_json || jsonb_build_object('sg_grouping_type', NEW.sg_grouping_type);
        END IF;
        
        IF OLD.is_deleted IS DISTINCT FROM NEW.is_deleted THEN
            changed_fields_json = changed_fields_json || '["is_deleted"]';
            old_values_json = old_values_json || jsonb_build_object('is_deleted', OLD.is_deleted);
            new_values_json = new_values_json || jsonb_build_object('is_deleted', NEW.is_deleted);
        END IF;
        
        IF OLD.stores_count IS DISTINCT FROM NEW.stores_count THEN
            changed_fields_json = changed_fields_json || '["stores_count"]';
            old_values_json = old_values_json || jsonb_build_object('stores_count', OLD.stores_count);
            new_values_json = new_values_json || jsonb_build_object('stores_count', NEW.stores_count);
        END IF;
        
        -- Only insert if something actually changed
        IF jsonb_array_length(changed_fields_json) > 0 THEN
            INSERT INTO base_pricing_restaurant.bp_audit_trail(
                table_name, record_id, operation_type, 
                changed_fields, old_values, new_values, 
                changed_by, changed_at
            ) VALUES (
                'bp_store_group', NEW.store_group_id, 'UPDATE',
                changed_fields_json, old_values_json, new_values_json,
                COALESCE(NEW.updated_by, 0), NOW()
            );
        END IF;
        
    ELSIF (TG_OP = 'INSERT') THEN
        -- For inserts, capture all fields
        changed_fields_json = '["record"]';
        new_values_json = jsonb_build_object(
            'store_group_id', NEW.store_group_id,
            'store_group_name', NEW.store_group_name,
            'sg_grouping_type', NEW.sg_grouping_type,
            'stores_count', NEW.stores_count,
            'is_deleted', NEW.is_deleted
        );
        
        INSERT INTO base_pricing_restaurant.bp_audit_trail(
            table_name, record_id, operation_type, 
            changed_fields, old_values, new_values, 
            changed_by, changed_at
        ) VALUES (
            'bp_store_group', NEW.store_group_id, 'INSERT',
            changed_fields_json, NULL, new_values_json,
            COALESCE(NEW.created_by, 0), NOW()
        );
        
    ELSIF (TG_OP = 'DELETE') THEN
        -- For deletes, capture the entire record
        changed_fields_json = '["record"]';
        old_values_json = jsonb_build_object(
            'store_group_id', OLD.store_group_id,
            'store_group_name', OLD.store_group_name,
            'sg_grouping_type', OLD.sg_grouping_type,
            'stores_count', OLD.stores_count,
            'is_deleted', OLD.is_deleted
        );
        
        INSERT INTO base_pricing_restaurant.bp_audit_trail(
            table_name, record_id, operation_type, 
            changed_fields, old_values, new_values, 
            changed_by, changed_at
        ) VALUES (
            'bp_store_group', OLD.store_group_id, 'DELETE',
            changed_fields_json, old_values_json, NULL,
            0, NOW()
        );
    END IF;
    
    RETURN NULL;
END;
$function$
;