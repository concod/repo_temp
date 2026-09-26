--liquibase formatted sql
--changeset nikhil.shet@impactanalytics.co:integration_create_request runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:integration
--comment: Function to create integration requests for promotions

DROP FUNCTION IF EXISTS price_promo.fn_integration_0_create_request;

CREATE OR REPLACE FUNCTION price_promo.fn_integration_0_create_request(
    _action_type TEXT,
    _input_promo_ids INTEGER[],
    _created_by INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $function$
/*
Purpose: Step 0 of the integration workflow - filters promotions by priority 1 and creates an integration log entry.
         Takes action_type and promo_ids from frontend and filters by priority.

Example: SELECT price_promo.fn_integration_0_create_request('execute', ARRAY[123, 124, 125], 1);

Parameters:
- _action_type: 'execute' or 'withdraw'
- _input_promo_ids: Array of promotion IDs from frontend
- _created_by: User ID who initiated the request

Returns: The integration_id of the created integration log
*/
DECLARE
    _priority_promo_ids INTEGER[];
    _integration_id INTEGER;
BEGIN    
    -- Filter promotions by priority 1
    SELECT ARRAY_AGG(DISTINCT promo_id)
    INTO _priority_promo_ids
    FROM price_promo.ps_rules
    WHERE promo_id = ANY(_input_promo_ids)
    AND priority_number = 1;
    
    -- Check if we have any priority 1 promotions
    IF _priority_promo_ids IS NULL OR array_length(_priority_promo_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'No priority 1 promotions found in the provided list';
    END IF;
    
    -- Log the filtered promotions
    RAISE NOTICE 'Filtered % promotions to % priority 1 promotions', 
        array_length(_input_promo_ids, 1), 
        array_length(_priority_promo_ids, 1);
    
    -- Create integration log entry
    INSERT INTO price_promo.tb_integration_logs 
        (promo_ids, action_type, created_by, priority_number, status, message)
    VALUES 
        (_priority_promo_ids, _action_type, _created_by, 1, 'pending', 
         format('Integration request created for %s action with %s priority 1 promotions', 
                _action_type, array_length(_priority_promo_ids, 1)))
    RETURNING integration_id INTO _integration_id;
    
    -- Return the integration ID
    RETURN _integration_id;
END;
$function$;
