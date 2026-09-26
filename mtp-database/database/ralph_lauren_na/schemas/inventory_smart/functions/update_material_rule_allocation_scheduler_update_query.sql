--liquibase formatted sql
--changeset liquibase:update_material_rule_allocation_scheduler_update_query runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_material_rule_allocation_scheduler_update_query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_material_rule_allocation_scheduler_update_query(refcursor, jsonb, jsonb, jsonb, int, int);
CREATE OR REPLACE FUNCTION inventory_smart.update_material_rule_allocation_scheduler_update_query(
    result_cursor refcursor, 
    product_attribute_query jsonb, 
    store_attribute_query jsonb, 
    meta_query jsonb, 
    input_values jsonb, 
    logged_in_user_id int
)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    data_query text := '';
    insert_query text := '';
    is_scheduler_mapping boolean := false;
    select_all boolean := false;
    _channel text[] := inventory_smart.get_channel_from_input_new(store_attribute_query);
    update_query text := '';
    _channel_and_prefix_condition text := '';
    update_store_query text := '';
BEGIN
    data_query := inventory_smart.update_material_rule_allocation_scheduler_data_query(product_attribute_query, store_attribute_query, meta_query, input_values, logged_in_user_id);
    _channel_and_prefix_condition = FORMAT('AND channel IN (%L)', array_to_string(_channel, ''',''', ''));
    
    select_all := input_values->>'select_all';
    is_scheduler_mapping := input_values->>'is_scheduler_mapping';
    IF select_all THEN
        update_query := 'UPDATE inventory_smart.ph_scheduler_mapping SET is_active = false';
        update_store_query := 'UPDATE inventory_smart.ph_scheduler_store_mapping SET is_active = false';
    ELSE
        update_query := FORMAT('
            UPDATE inventory_smart.ph_scheduler_mapping SET is_active = false
            WHERE article IN (SELECT article FROM (%s) foo) %s
        ', data_query, _channel_and_prefix_condition);
        update_store_query := FORMAT('
            UPDATE inventory_smart.ph_scheduler_store_mapping SET is_active = false
            WHERE article IN (SELECT article FROM (%s) foo) %s
        ', data_query, _channel_and_prefix_condition);
    END IF;
    BEGIN
        RAISE NOTICE '%', update_query;
        RAISE NOTICE '%', update_store_query;
        EXECUTE update_query;
        EXECUTE update_store_query;
        IF is_scheduler_mapping THEN
            insert_query := FORMAT('
                INSERT INTO inventory_smart.ph_scheduler_mapping(ph_code, article, channel, l0_name, scheduler_code, created_by, updated_by)
                %s
            ', data_query);
            RAISE NOTICE '%', insert_query;
            EXECUTE insert_query;
        END IF;
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