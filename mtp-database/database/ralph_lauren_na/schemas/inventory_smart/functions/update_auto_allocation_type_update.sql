--liquibase formatted sql
--changeset liquibase:set_all runOnChange:true stripComments:false splitStatements:false context:Release_2_2 labels:MTP-51967 Approval Type and Threshold _1
--comment: MTP-51967 Approval Type and Threshold updated_at and updated_by added to the query
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_auto_allocation_type_update(refcursor, jsonb, jsonb, jsonb, jsonb, int4);

CREATE OR REPLACE FUNCTION inventory_smart.update_auto_allocation_type_update(result_cursor refcursor, product_attribute_query jsonb, store_attribute_query jsonb, meta_query jsonb, input_values jsonb, logged_in_user_id integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    data_query text := '';
    update_query text := '';
BEGIN
    data_query := inventory_smart.update_auto_allocation_type_data(product_attribute_query, store_attribute_query, meta_query, input_values, logged_in_user_id);

    update_query := 'INSERT INTO inventory_smart.ph_auto_alloc_rule_mapping(ph_code, article, channel, l0_name, created_by, updated_by';
    
    -- Adding optional columns based on data_query
    IF data_query ~* 'approval_type' THEN
        update_query := update_query || ', approval_type';
    END IF;
    
    IF data_query ~* 'threshold' THEN
        update_query := update_query || ', threshold';
    END IF;

    update_query := update_query || FORMAT(') %s  
        ON CONFLICT (article, channel) DO update SET 
            approval_type = COALESCE(EXCLUDED.approval_type, inventory_smart.ph_auto_alloc_rule_mapping.approval_type),
            threshold = COALESCE(EXCLUDED.threshold, inventory_smart.ph_auto_alloc_rule_mapping.threshold),
            updated_at = NOW()::timestamptz,
			updated_by = EXCLUDED.updated_by
            ', data_query);
    BEGIN
        
        RAISE NOTICE '%', update_query;

        EXECUTE update_query;

        OPEN result_cursor FOR SELECT 'ok' as results;

        RETURN result_cursor;

    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Transaction failed: %', SQLERRM;
            RAISE EXCEPTION 'Failed to run queries. %', SQLERRM;
    END;
END;
$function$
;