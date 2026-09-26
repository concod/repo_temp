--liquibase formatted sql
--changeset narendren.saravanan@impactanalytics.co:fn_apply_promo_excel_step3_edit_20 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add fn_apply_promo_excel_step3_edit function

DROP FUNCTION IF EXISTS price_promo.fn_apply_promo_excel_step3_edit;

CREATE OR REPLACE FUNCTION price_promo.fn_apply_promo_excel_step3_edit(p_session_id character varying, p_user_id integer, p_scenario_order_id integer, p_session_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    update_count INTEGER := 0;
    error_count INTEGER := 0;
    result JSONB;
    current_promo_id INTEGER;
    current_scenario_id INTEGER;
    current_scenario_name VARCHAR(255);
    current_scenario_order_id INTEGER;
    row_count INTEGER;
    is_vendor_portal_request BOOLEAN := FALSE;
BEGIN
    -- Get promo_id from root level of session data
    current_promo_id := (p_session_data->>'promo_id')::INTEGER;
    if p_session_data->>'scenario_order_id' is not null then
        current_scenario_order_id := (p_session_data->>'scenario_order_id')::INTEGER;
    else
        current_scenario_order_id := p_scenario_order_id;
    end if;
    is_vendor_portal_request := (p_session_data->>'is_vendor_portal_request')::BOOLEAN;
    
    -- Fetch the actual scenario_id from scenario_master based on promo_id and scenario_order_id
    SELECT scenario_id, scenario_name INTO current_scenario_id, current_scenario_name
    FROM price_promo.scenario_master 
    WHERE promo_id = current_promo_id 
    AND scenario_order_id = current_scenario_order_id;
    
    -- Validate that we found the scenario
    IF current_scenario_id IS NULL THEN
        INSERT INTO price_promo.scenario_master
        (promo_id,scenario_name,scenario_order_id,created_by,updated_at)
        VALUES
        (current_promo_id,'Scenario ' || current_scenario_order_id,current_scenario_order_id,p_user_id, now() at time zone 'UTC')
        RETURNING scenario_id into current_scenario_id;
        RAISE NOTICE 'Created new scenario for promo_id % and scenario_order_id %', current_promo_id, current_scenario_order_id;
    END IF;
    
    RAISE NOTICE 'Found scenario_id % for promo_id % and scenario_order_id %', current_scenario_id, current_promo_id, current_scenario_order_id;
    
    BEGIN
        -- Step 0: Identify new primary UPCs and their respective product IDs (products not already in current promo)
        -- Also capture the offer type information for existing scenarios
        CREATE TEMP TABLE temp_new_products AS 
        SELECT DISTINCT
            pu->>'primaryupc' as primaryupc,
            pm.product_id,
            pm.product_name,
            pm.promo_base_price as base_price,
            (pu->>'offer_type_id')::INTEGER as current_offer_type_id,
            pu->'scenario_data'->>'offer_type' as current_offer_type
        FROM jsonb_array_elements(p_session_data->'promo_updates') AS pu
        INNER JOIN price_promo.product_master pm ON pm.primaryupc = pu->>'primaryupc'
        WHERE pm.product_id NOT IN (
            SELECT DISTINCT product_id 
            FROM price_promo.promo_product 
            WHERE promo_id = current_promo_id
        );
        
        RAISE NOTICE 'Debug: Found % new products for promo_id %', (SELECT COUNT(*) FROM temp_new_products), current_promo_id;
        
        -- Step 1: Capture existing scenario data before deletion
        CREATE TEMP TABLE temp_existing_scenario_data AS 
        SELECT 
            (tprd.product_level_value->>'product_id')::INTEGER as product_id,
            psd.scenario_data,
            psd.ia_recommended_data
        FROM price_promo.ps_scenario_discounts psd
        INNER JOIN price_promo.tb_promo_product_reco_details tprd 
            ON psd.product_level_id = tprd.product_level_id
        WHERE psd.promo_id = current_promo_id;

        -- Step 1.5: Capture existing scenario offer types at scenario level
        CREATE TEMP TABLE temp_existing_scenario_offer_types AS
        SELECT DISTINCT
            sm.scenario_order_id,
            sm.scenario_id,
            sm.scenario_name,
            (psd.scenario_data->(sm.scenario_order_id::text)->>'offer_type_id')::INTEGER as offer_type_id,
            psd.scenario_data->(sm.scenario_order_id::text)->>'offer_type' as offer_type
        FROM price_promo.scenario_master sm
        INNER JOIN price_promo.ps_scenario_discounts psd ON psd.promo_id = sm.promo_id
        WHERE sm.promo_id = current_promo_id
        AND psd.scenario_data->(sm.scenario_order_id::text)->>'offer_type_id' IS NOT NULL;

        -- Step 2: Remove all existing product-related records (as before)
        DELETE FROM price_promo.included_products WHERE promo_id = current_promo_id;
        DELETE FROM price_promo.promo_product WHERE promo_id = current_promo_id;
        DELETE FROM price_promo.tb_discount_level_products WHERE product_level_id IN (
            SELECT product_level_id FROM price_promo.tb_promo_product_reco_details WHERE promo_id = current_promo_id
        );
        DELETE FROM price_promo.tb_promo_store_reco_details WHERE promo_id = current_promo_id;
        DELETE FROM price_promo.tb_promo_product_reco_details WHERE promo_id = current_promo_id;
        DELETE FROM price_promo.ps_scenario_discounts WHERE promo_id = current_promo_id;
        
        -- Update discount_type_id and discount_type in ps_rules table using offer_type from session data
        WITH discount_data AS (
            SELECT DISTINCT (pu->>'offer_type_id')::INTEGER as new_discount_type_id
            FROM jsonb_array_elements(p_session_data->'promo_updates') AS pu 
            WHERE pu->>'offer_type_id' IS NOT NULL
            LIMIT 1
        )
        UPDATE price_promo.ps_rules 
        SET 
            discount_type_id = dd.new_discount_type_id,
            discount_type = tom.name
        FROM discount_data dd
        LEFT JOIN price_promo.tb_offer_master tom ON tom.id = dd.new_discount_type_id
        WHERE promo_id = current_promo_id;
        
        -- Bulk insert all products for this promo_id
        INSERT INTO price_promo.included_products (
            promo_id,
            product_id,
            product_name
        )
        with event_products_cte as (
            select ep.product_id 
            from 
                price_promo.event_product ep
            inner join 
                price_promo.promo_master p on p.event_id = ep.event_id
            where 
                p.promo_id = current_promo_id
        )
        SELECT 
            current_promo_id,
            pm.product_id,
            pm.product_name
        FROM jsonb_array_elements(p_session_data->'promo_updates') AS pu
        INNER JOIN price_promo.product_master pm ON pm.primaryupc = pu->>'primaryupc'
        INNER JOIN event_products_cte ep ON ep.product_id = pm.product_id;

        -- Populate data in promo_product and promo_product_hierarchy
        perform price_promo.fn_save_promo_final_products(current_promo_id, p_user_id);
        perform price_promo.fn_save_promo_final_hierarchy(current_promo_id, p_user_id);

        -- Populate user metadata into promo_product for this promo_id

        UPDATE price_promo.promo_product
        SET
            user_metadata = pu->'user_metadata'
        FROM jsonb_array_elements(p_session_data->'promo_updates') AS pu
        INNER JOIN price_promo.product_master pm ON pm.primaryupc = pu->>'primaryupc'
        WHERE price_promo.promo_product.promo_id = current_promo_id 
        AND price_promo.promo_product.product_id = pm.product_id;

        -- Update products_count and conditionally vendor_portal_status in promo_master
        UPDATE price_promo.promo_master
        SET
            products_count = (SELECT COUNT(*) FROM price_promo.promo_product WHERE promo_id = current_promo_id),
            vendor_portal_status = CASE WHEN is_vendor_portal_request THEN 0 ELSE vendor_portal_status END,
            step_count = 3
        WHERE promo_id = current_promo_id;
        
        -- Bulk insert all promo product recommendation details for this promo_id
        INSERT INTO price_promo.tb_promo_product_reco_details (
            promo_id,
            product_level_value
        )
        SELECT 
            current_promo_id,
            jsonb_build_object(
                'product_id', pm.product_id,
                'product_description', pm.product_description
            )
        FROM jsonb_array_elements(p_session_data->'promo_updates') AS pu
        INNER JOIN price_promo.product_master pm ON pm.primaryupc = pu->>'primaryupc';

        -- Step 1.6: Create product level to base price lookup table
        CREATE TEMP TABLE temp_product_base_prices AS
        SELECT 
            tprd.product_level_id,
            tnp.base_price
        FROM price_promo.tb_promo_product_reco_details tprd
        INNER JOIN temp_new_products tnp 
            ON tnp.product_id = (tprd.product_level_value->>'product_id')::INTEGER
        WHERE tprd.promo_id = current_promo_id;

        -- Insert promo store reco details for this promo_id
        INSERT INTO price_promo.tb_promo_store_reco_details (
            promo_id,
            store_level_value
        )
        VALUES (
            current_promo_id,
            NULL
        );
        
        -- Insert product_level_ids into tb_discount_level_products
        INSERT INTO price_promo.tb_discount_level_products (
            product_level_id,
            product_id
        )
        SELECT 
            tprd.product_level_id,
            pm.product_id
        FROM jsonb_array_elements(p_session_data->'promo_updates') AS pu
        INNER JOIN price_promo.product_master pm ON pm.primaryupc = pu->>'primaryupc'
        INNER JOIN price_promo.tb_promo_product_reco_details tprd ON tprd.promo_id = current_promo_id 
            AND (tprd.product_level_value->>'product_id')::INTEGER = pm.product_id;

        -- Step 3: Insert scenario discounts with merge logic using temp table
        INSERT INTO price_promo.ps_scenario_discounts (
            promo_id,
            product_level_id,
            store_level_id,
            scenario_data,
            created_at,
            created_by,
            ia_recommended_data
        )
        SELECT 
            current_promo_id,
            tprd.product_level_id,
            tpsrd.store_level_id,
            COALESCE(esd.scenario_data, '{}'::jsonb) || jsonb_build_object(
                current_scenario_order_id::text, 
                 (pu->'scenario_data') || jsonb_build_object(
                    'scenario_id', current_scenario_id, 
                    'scenario_order_id', current_scenario_order_id,
                    'scenario_name', current_scenario_name,
                    'offer_type', pr.discount_type,
                    'offer_type_id', pr.discount_type_id,
                    'offer_value', price_promo.get_offer_description_v2(
                        pr.discount_type::text, 
                        (pu->'scenario_data'->>'offer_x_value')::numeric, 
                        pu->'scenario_data'->>'offer_x_type',
                        (pu->'scenario_data'->>'offer_y_value')::numeric, 
                        pu->'scenario_data'->>'offer_y_type',
                        (pu->'scenario_data'->>'offer_z_value')::numeric,
                        (pu->'scenario_data'->>'tier_id')::numeric,
                        pu->'scenario_data'->'special_offer_data'
                    )::text,
                    'created_by', p_user_id,
                    'updated_by', p_user_id
                )
            ),
            NOW(),
            p_user_id,
            esd.ia_recommended_data
        FROM jsonb_array_elements(p_session_data->'promo_updates') AS pu
        INNER JOIN price_promo.product_master pm ON pm.primaryupc = pu->>'primaryupc'
        INNER JOIN price_promo.tb_promo_product_reco_details tprd ON tprd.promo_id = current_promo_id 
            AND (tprd.product_level_value->>'product_id')::INTEGER = pm.product_id
        INNER JOIN price_promo.ps_rules pr ON pr.promo_id = current_promo_id
        INNER JOIN price_promo.tb_promo_store_reco_details tpsrd ON tpsrd.promo_id = current_promo_id
        INNER JOIN price_promo.promo_product pp ON pp.promo_id = current_promo_id and pp.product_id = pm.product_id
        LEFT JOIN temp_existing_scenario_data esd ON esd.product_id = pm.product_id;
        
        -- Debug: Show the count of records inserted
        GET DIAGNOSTICS row_count = ROW_COUNT;
        RAISE NOTICE 'Debug: Inserted % records into ps_scenario_discounts for promo_id %', row_count, current_promo_id;

        -- For new products: Copy scenario data from current scenario to all other scenarios
        -- 1. If offer type matches, copy the scenario data
        -- 2. If offer type doesn't match, use default logic
        UPDATE price_promo.ps_scenario_discounts 
        SET scenario_data = scenario_data || COALESCE((
            SELECT jsonb_object_agg(
                other_scenario.scenario_order_id::text,
                CASE 
                    -- 1. If offer types match, copy the scenario data
                    WHEN other_scenario.offer_type_id = (
                        SELECT current_offer_type_id
                        FROM temp_new_products 
                        LIMIT 1
                    ) THEN
                        scenario_data->(current_scenario_order_id::text) || jsonb_build_object(
                            'scenario_id', other_scenario.scenario_id, 
                            'scenario_order_id', other_scenario.scenario_order_id,
                            'scenario_name', other_scenario.scenario_name,
                            'created_by', p_user_id,
                            'updated_by', p_user_id
                        )
                    -- 2. If offer types don't match, use default logic based on offer type
                    ELSE
                        scenario_data->(current_scenario_order_id::text) || 
                        jsonb_build_object(
                            'scenario_id', other_scenario.scenario_id,
                            'scenario_order_id', other_scenario.scenario_order_id,
                            'scenario_name', other_scenario.scenario_name,
                            'offer_type', other_scenario.offer_type,
                            'offer_type_id', other_scenario.offer_type_id,
                            'created_by', p_user_id,
                            'updated_by', p_user_id
                        ) || 
                        price_promo.fn_get_default_scenario_data(
                            other_scenario.offer_type,
                            COALESCE((
                                SELECT tpbp.base_price::NUMERIC 
                                FROM temp_product_base_prices tpbp
                                WHERE tpbp.product_level_id = ps_scenario_discounts.product_level_id
                            ), 0)
                        )
                END
            )
            FROM temp_existing_scenario_offer_types other_scenario
            WHERE other_scenario.scenario_order_id != current_scenario_order_id
        ), '{}'::jsonb)
        WHERE promo_id = current_promo_id
        AND product_level_id IN (
            SELECT tprd.product_level_id 
            FROM price_promo.tb_promo_product_reco_details tprd
            INNER JOIN temp_new_products tnp ON tnp.product_id = (tprd.product_level_value->>'product_id')::INTEGER
        );

        -- Clean up temp tables
        DROP TABLE temp_existing_scenario_data;
        DROP TABLE temp_existing_scenario_offer_types;
        DROP TABLE temp_new_products;
        DROP TABLE temp_product_base_prices;
                
        update_count := 1;
        
    EXCEPTION WHEN OTHERS THEN
        error_count := 1;
        RAISE NOTICE 'Error processing promo_id %: %', current_promo_id, SQLERRM;
        
        -- Return error result instead of re-raising
        result := jsonb_build_object(
            'success', false,
            'updated_count', update_count,
            'error_count', error_count,
            'session_id', p_session_id,
            'promo_id', current_promo_id,
            'error_message', SQLERRM,
            'message', format('Failed to update promo %s: %s', current_promo_id, SQLERRM)
        );
        
        RETURN result;
    END;
    
    -- Return success result
    result := jsonb_build_object(
        'success', true,
        'updated_count', update_count,
        'error_count', error_count,
        'session_id', p_session_id,
        'promo_id', current_promo_id,
        'message', format('Successfully updated promo %s', current_promo_id)
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Function error for session_id %: %', p_session_id, SQLERRM;
    
    -- Return error result for outer exception
    result := jsonb_build_object(
        'success', false,
        'updated_count', 0,
        'error_count', 1,
        'session_id', p_session_id,
        'promo_id', COALESCE(current_promo_id, 0),
        'error_message', SQLERRM,
        'message', format('Function error for session %s: %s', p_session_id, SQLERRM)
    );
    
    RETURN result;
END;
$function$
;
