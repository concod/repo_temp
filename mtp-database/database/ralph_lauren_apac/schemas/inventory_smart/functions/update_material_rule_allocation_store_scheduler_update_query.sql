--liquibase formatted sql
--changeset liquibase:update_material_rule_allocation_store_scheduler_update_query_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-70613
--comment: Add l0_name in conflict MTP-70613
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_material_rule_allocation_store_scheduler_update_query(input refcursor, jsonb, jsonb, integer, text, jsonb, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.update_material_rule_allocation_store_scheduler_update_query(
    result_cursor refcursor, 
    product_attribute_query jsonb,
    store_attribute_query jsonb, 
    application_code integer,
    client_columns text,
    meta_query jsonb,
    product_rule_attribute_query jsonb,
    input_values jsonb, 
    logged_in_user_id int
)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    data_query text := '';
    query text := '';
    is_scheduler_mapping boolean := false;
BEGIN
    data_query := inventory_smart.update_material_rule_allocation_store_scheduler_data_query(product_attribute_query, store_attribute_query, application_code, client_columns, meta_query, product_rule_attribute_query, input_values, logged_in_user_id);
    is_scheduler_mapping := input_values->>'is_scheduler_mapping';
    BEGIN
        IF is_scheduler_mapping THEN
            query := FORMAT('
                INSERT INTO inventory_smart.ph_scheduler_store_mapping(ph_code, article, channel, store_code, l0_name, scheduler_code, created_by, updated_by, is_active)
                (%s)
                ON CONFLICT (article, channel, store_code, l0_name) DO UPDATE
                SET 
                scheduler_code = EXCLUDED.scheduler_code,
                updated_by = EXCLUDED.updated_by,
                updated_at = NOW()::timestamptz,
                is_active = true;
            ', data_query);
        ELSE 
            query := FORMAT('
                UPDATE inventory_smart.ph_scheduler_store_mapping pssm SET is_active = false
                FROM (%s) data_table
                WHERE data_table.article = pssm.article AND data_table.channel = pssm.channel AND data_table.store_code = pssm.store_code
            ', data_query);
        END IF;
        
        RAISE NOTICE '%', query;
        EXECUTE query;
        OPEN result_cursor FOR SELECT 'ok' as results;
        RETURN result_cursor;
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback transaction in case of error
            RAISE NOTICE 'Transaction failed: %', SQLERRM;
            RAISE EXCEPTION 'Failed to run queries. %', SQLERRM;
    END;
END;
$function$;