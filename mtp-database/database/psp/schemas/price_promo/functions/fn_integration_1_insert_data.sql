--liquibase formatted sql
--changeset nikhil.shet@impactanalytics.co:integration_insert_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:integration
--comment: Function to insert promotion data into partitioned integration tables

DROP FUNCTION IF EXISTS price_promo.fn_integration_1_insert_data;

CREATE OR REPLACE FUNCTION price_promo.fn_integration_1_insert_data(_integration_id INTEGER)
RETURNS TABLE (success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
/*
Purpose: Main function that handles data insertion for both execute and withdraw actions.
         Creates partitions dynamically by integration_id and processes promotions based on action type.

Example: SELECT price_promo.fn_integration_1_insert_data(123);

Other Functions Used:
- price_promo.fn_integration_2_execute: For retrieving execution data with discounts
- price_promo.fn_integration_3_withdraw: For retrieving withdrawal data with original prices

Tables Used:
- price_promo.tb_integration_logs: For tracking integration requests and statuses
- price_promo.tb_integration_data: For storing the actual price file data

Behavior:
1. For execute actions: Processes promotions individually in a loop for better tracking
2. For withdraw actions: Processes all promotions in bulk without looping
3. Creates partitions dynamically by integration_id
4. Updates integration status throughout the process

Returns: Boolean indicating success (TRUE) or failure (FALSE)
*/
DECLARE
    _promo_ids INTEGER[]; _priority_number INTEGER; _created_by INTEGER; _action TEXT;
    _partition_name TEXT; _promo_id INTEGER;
    _status TEXT := 'in_progress'; _message TEXT := 'Generating price file data'; _result BOOLEAN := TRUE;
BEGIN
    -- Get promo_ids and other details from integration_logs
    SELECT il.promo_ids, il.priority_number, il.created_by, il.action_type
    INTO _promo_ids, _priority_number, _created_by, _action
    FROM price_promo.tb_integration_logs il WHERE il.integration_id = _integration_id;
        
    -- Update integration status to in_progress
    UPDATE price_promo.tb_integration_logs
    SET status = _status, message = _message, updated_at = CURRENT_TIMESTAMP
    WHERE integration_id = _integration_id;
    
    -- Create partition directly (will not error if it already exists with IF NOT EXISTS)
    _partition_name := 'price_promo.tb_integration_data_' || _integration_id::text;
    EXECUTE 'CREATE TABLE IF NOT EXISTS ' || _partition_name || ' PARTITION OF price_promo.tb_integration_data FOR VALUES IN (' || _integration_id::text || ')';
    
    BEGIN
        -- For execute action, generate and insert price file data
        IF _action = 'execute' THEN
            -- Process each promo_id individually in a loop
            FOREACH _promo_id IN ARRAY _promo_ids
            LOOP
                INSERT INTO price_promo.tb_integration_data (
                    integration_id, "action", created_at, priority_number,
                    promo_id, event_id, event_name, offer_name, 
                    "price start date", "price end date", brand, productcode, 
                    brandsku, productprice, saleprice, currency,
                    "user", "user mail", module, offer_type, "offer value"
                )
                SELECT
                    _integration_id, _action, CURRENT_TIMESTAMP, _priority_number,
                    data.promo_id, data.event_id, data.event_name, data.offer_name, 
                    data.price_start_date, data.price_end_date, data.brand, data.productcode, 
                    data.brandsku, data.productprice, data.saleprice, data.currency, 
                    data."user", data.user_mail, data.module, data.offer_type, data.offer_value
                FROM price_promo.fn_integration_2_execute(_promo_id) data;
            END LOOP;
                
        -- For withdraw action, set saleprice equal to productprice (no discount)
        ELSIF _action = 'withdraw' THEN
            -- Insert data for all promo_ids with withdrawn prices using the data retrieval function
            INSERT INTO price_promo.tb_integration_data (
                integration_id, "action", created_at, priority_number,
                promo_id, event_id, event_name, offer_name, "price start date", "price end date", brand,
                productcode, brandsku, productprice, saleprice, currency,
                "user", "user mail", module, offer_type, "offer value"
            )
            SELECT
                _integration_id, _action, CURRENT_TIMESTAMP, _priority_number,
                data.promo_id, data.event_id, data.event_name, data.offer_name, 
                data.price_start_date, data.price_end_date, data.brand, data.productcode, 
                data.brandsku, data.productprice, data.saleprice, data.currency, 
                data."user", data.user_mail, data.module, data.offer_type, data.offer_value
            FROM price_promo.fn_integration_3_withdraw(_promo_ids) data;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- Update status to failed if any error occurs
        UPDATE price_promo.tb_integration_logs
        SET status = 'failed', message = 'Error processing integration: ' || SQLERRM, updated_at = CURRENT_TIMESTAMP
        WHERE integration_id = _integration_id;
            
        _result := FALSE;
        RETURN QUERY SELECT _result, SQLERRM;
        RETURN;
    END;
    
    -- Update status to completed if all went well
    UPDATE price_promo.tb_integration_logs
    SET status = 'completed', message = 'Successfully generated price file data for ' || array_length(_promo_ids, 1) || ' promotion(s)', updated_at = CURRENT_TIMESTAMP
    WHERE integration_id = _integration_id;
    
    RETURN QUERY SELECT _result, NULL;
    RETURN;
EXCEPTION WHEN OTHERS THEN
    -- Update status to failed if any error occurs at function level
    UPDATE price_promo.tb_integration_logs
    SET status = 'failed', message = 'Error in fn_integration_1_insert_data: ' || SQLERRM, updated_at = CURRENT_TIMESTAMP
    WHERE integration_id = _integration_id;
        
    _result := FALSE;
    RETURN QUERY SELECT _result, SQLERRM;
    RETURN;
END;
$function$;