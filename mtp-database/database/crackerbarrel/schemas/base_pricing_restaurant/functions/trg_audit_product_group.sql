--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:trg_audit_product_group stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.trg_audit_product_group

DROP FUNCTION IF EXISTS base_pricing_restaurant.trg_audit_product_group;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.trg_audit_product_group()
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
        IF OLD.pg_name IS DISTINCT FROM NEW.pg_name THEN
            changed_fields_json = changed_fields_json || '["pg_name"]';
            old_values_json = old_values_json || jsonb_build_object('pg_name', OLD.pg_name);
            new_values_json = new_values_json || jsonb_build_object('pg_name', NEW.pg_name);
        END IF;
        
        IF OLD.pg_grouping_type IS DISTINCT FROM NEW.pg_grouping_type THEN
            changed_fields_json = changed_fields_json || '["pg_grouping_type"]';
            old_values_json = old_values_json || jsonb_build_object('pg_grouping_type', OLD.pg_grouping_type);
            new_values_json = new_values_json || jsonb_build_object('pg_grouping_type', NEW.pg_grouping_type);
        END IF;
        
        IF OLD.is_deleted IS DISTINCT FROM NEW.is_deleted THEN
            changed_fields_json = changed_fields_json || '["is_deleted"]';
            old_values_json = old_values_json || jsonb_build_object('is_deleted', OLD.is_deleted);
            new_values_json = new_values_json || jsonb_build_object('is_deleted', NEW.is_deleted);
        END IF;
        
        IF OLD.products_count IS DISTINCT FROM NEW.products_count THEN
            changed_fields_json = changed_fields_json || '["products_count"]';
            old_values_json = old_values_json || jsonb_build_object('products_count', OLD.products_count);
            new_values_json = new_values_json || jsonb_build_object('products_count', NEW.products_count);
        END IF;
        
        -- Only insert if something actually changed
        IF jsonb_array_length(changed_fields_json) > 0 THEN
            INSERT INTO base_pricing_restaurant.bp_audit_trail(
                table_name, record_id, operation_type, 
                changed_fields, old_values, new_values, 
                changed_by, changed_at
            ) VALUES (
                'bp_product_group', NEW.pg_id, 'UPDATE',
                changed_fields_json, old_values_json, new_values_json,
                COALESCE(NEW.updated_by, 0), NOW()
            );
        END IF;
        
    ELSIF (TG_OP = 'INSERT') THEN
        -- For inserts, capture all non-null fields
        changed_fields_json = '["record"]';
        new_values_json = jsonb_build_object(
            'pg_id', NEW.pg_id,
            'pg_name', NEW.pg_name,
            'pg_grouping_type', NEW.pg_grouping_type,
            'is_deleted', NEW.is_deleted,
            'products_count', NEW.products_count
        );
        
        INSERT INTO base_pricing_restaurant.bp_audit_trail(
            table_name, record_id, operation_type, 
            changed_fields, old_values, new_values, 
            changed_by, changed_at
        ) VALUES (
            'bp_product_group', NEW.pg_id, 'INSERT',
            changed_fields_json, NULL, new_values_json,
            COALESCE(NEW.created_by, 0), NOW()
        );
        
    ELSIF (TG_OP = 'DELETE') THEN
        -- For deletes, capture the entire record being deleted
        changed_fields_json = '["record"]';
        old_values_json = jsonb_build_object(
            'pg_id', OLD.pg_id,
            'pg_name', OLD.pg_name,
            'pg_grouping_type', OLD.pg_grouping_type,
            'is_deleted', OLD.is_deleted,
            'products_count', OLD.products_count
        );
        
        INSERT INTO base_pricing_restaurant.bp_audit_trail(
            table_name, record_id, operation_type, 
            changed_fields, old_values, new_values, 
            changed_by, changed_at
        ) VALUES (
            'bp_product_group', OLD.pg_id, 'DELETE',
            changed_fields_json, old_values_json, NULL,
            0, NOW()
        );
    END IF;
    
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$function$
;