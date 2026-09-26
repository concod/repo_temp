--liquibase formatted sql
--changeset narendren.saravanan@impactanalytics.co:fn_apply_promos_excel_bulk_edit_20 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add fn_apply_promos_excel_bulk_edit function

DROP FUNCTION IF EXISTS price_promo.fn_apply_promos_excel_bulk_edit;

CREATE OR REPLACE FUNCTION price_promo.fn_apply_promos_excel_bulk_edit(p_session_id character varying, p_user_id integer, p_session_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    promo_group RECORD;
    update_count INTEGER := 0;
    error_count INTEGER := 0;
    result JSONB;
    current_promo_id INTEGER;
    processed_promo_ids INTEGER[] := ARRAY[]::INTEGER[];
    failed_promo_ids INTEGER[] := ARRAY[]::INTEGER[];
    row_count INTEGER;
BEGIN
        
    -- Process each promo group (grouped by promo_id)
    FOR promo_group IN 
        SELECT DISTINCT
            (pu->>'promo_id')::INTEGER AS promo_id
        FROM jsonb_array_elements(p_session_data->'promo_updates') AS pu
    LOOP
        current_promo_id := promo_group.promo_id;
        
        BEGIN
            -- Step 0: Identify new primary UPCs and their respective product IDs (products not already in current promo)
            CREATE TEMP TABLE temp_new_products AS 
            SELECT DISTINCT
                pu->>'primaryupc' as primaryupc,
                pm.product_id,
                pm.product_name,
                pm.promo_base_price as base_price
            FROM jsonb_array_elements(p_session_data->'promo_updates') AS pu
            INNER JOIN price_promo.product_master pm ON pm.primaryupc = pu->>'primaryupc'
            WHERE (pu->>'promo_id')::INTEGER = current_promo_id
            AND pm.product_id NOT IN (
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

            CREATE TEMP TABLE temp_existing_promo_product_user_metadata AS
            SELECT product_id, user_metadata
            FROM price_promo.promo_product
            WHERE promo_id = current_promo_id;
            
            -- Remove all existing records for this promo_id
            DELETE FROM price_promo.ps_scenario_discounts WHERE promo_id = current_promo_id;
            DELETE FROM price_promo.included_products WHERE promo_id = current_promo_id;
            DELETE FROM price_promo.promo_product WHERE promo_id = current_promo_id;
            DELETE FROM price_promo.tb_discount_level_products WHERE product_level_id IN (
                SELECT product_level_id FROM price_promo.tb_promo_product_reco_details WHERE promo_id = current_promo_id
            );
            DELETE FROM price_promo.tb_promo_store_reco_details WHERE promo_id = current_promo_id;
            DELETE FROM price_promo.tb_promo_product_reco_details WHERE promo_id = current_promo_id;

            
            -- Update discount_type_id and discount_type in ps_rules table using offer_type_id and offer_type from session data
            WITH discount_data AS (
                SELECT DISTINCT (pu->>'offer_type_id')::INTEGER as new_discount_type_id
                FROM jsonb_array_elements(p_session_data->'promo_updates') AS pu 
                WHERE (pu->>'promo_id')::INTEGER = current_promo_id 
                AND pu->>'offer_type_id' IS NOT NULL
                LIMIT 1
            )
            UPDATE price_promo.ps_rules 
            SET 
                discount_type_id = dd.new_discount_type_id,
                discount_type = tasm.name,
                updated_at = NOW(),
                updated_by = p_user_id
            FROM discount_data dd
            LEFT JOIN metaschema.tb_app_sub_master tasm ON tasm.id = dd.new_discount_type_id
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
            INNER JOIN event_products_cte ep on ep.product_id = pm.product_id
            WHERE (pu->>'promo_id')::INTEGER = current_promo_id;

            -- Populate data in promo_product and promo_product_hierarchy
            perform price_promo.fn_save_promo_final_products(current_promo_id, p_user_id);
            perform price_promo.fn_save_promo_final_hierarchy(current_promo_id, p_user_id);


            -- Update products_count in promo_master
            UPDATE price_promo.promo_master
            SET
                products_count = (SELECT COUNT(*) FROM price_promo.promo_product WHERE promo_id = current_promo_id)
            WHERE promo_id = current_promo_id;

            -- Populate user metadata into promo_product for this promo_id

            UPDATE price_promo.promo_product
            SET
                user_metadata = COALESCE(prev.user_metadata, '{}'::jsonb) || COALESCE(pu->'user_metadata', '{}'::jsonb)
            FROM jsonb_array_elements(p_session_data->'promo_updates') AS pu
            INNER JOIN price_promo.product_master pm ON pm.primaryupc = pu->>'primaryupc'
            LEFT JOIN temp_existing_promo_product_user_metadata prev ON prev.product_id = pm.product_id
            WHERE price_promo.promo_product.promo_id = current_promo_id 
            AND price_promo.promo_product.product_id = pm.product_id
            AND (pu->>'promo_id')::INTEGER = current_promo_id;

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
            INNER JOIN price_promo.product_master pm ON pm.primaryupc = pu->>'primaryupc'
            WHERE (pu->>'promo_id')::INTEGER = current_promo_id;

            -- Step 1.6: Create product level to base price lookup table
            CREATE TEMP TABLE temp_product_base_prices AS
            SELECT 
                tprd.product_level_id,
                tnp.base_price
            FROM price_promo.tb_promo_product_reco_details tprd
            INNER JOIN temp_new_products tnp 
                ON tnp.product_id = (tprd.product_level_value->>'product_id')::INTEGER
            WHERE tprd.promo_id = current_promo_id;
            
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
            INNER JOIN price_promo.tb_promo_product_reco_details tprd ON tprd.promo_id = current_promo_id AND (tprd.product_level_value->>'product_id')::INTEGER = pm.product_id
            WHERE (pu->>'promo_id')::INTEGER = current_promo_id;

            -- Insert promo store reco details for this promo_id
            INSERT INTO price_promo.tb_promo_store_reco_details (
                promo_id,
                store_level_value
            )
            VALUES (
                current_promo_id,
                NULL
            );
            
            -- Bulk insert all scenario discounts for this promo_id with merge logic
            INSERT INTO price_promo.ps_scenario_discounts (
                promo_id,
                product_level_id,
                store_level_id,
                scenario_data,
                created_at,
                created_by
            )
            SELECT 
                current_promo_id,
                tprd.product_level_id,
                tpsrd.store_level_id,
                COALESCE(esd.scenario_data, '{}'::jsonb) || jsonb_build_object(
                    sm.scenario_order_id::text, 
                    (pu->'scenario_data') || jsonb_build_object(
                        'scenario_id', prom.last_approved_scenario_id, 
                        'scenario_order_id', sm.scenario_order_id,
                        'scenario_name', sm.scenario_name,
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
                p_user_id
            FROM jsonb_array_elements(p_session_data->'promo_updates') AS pu
            INNER JOIN price_promo.product_master pm ON pm.primaryupc = pu->>'primaryupc'
            INNER JOIN price_promo.tb_promo_product_reco_details tprd ON tprd.promo_id = current_promo_id AND (tprd.product_level_value->>'product_id')::INTEGER = pm.product_id
            INNER JOIN price_promo.promo_master prom ON prom.promo_id = current_promo_id
            INNER JOIN price_promo.scenario_master sm ON sm.scenario_id = prom.last_approved_scenario_id
            INNER JOIN price_promo.ps_rules pr ON pr.promo_id = current_promo_id
            INNER JOIN price_promo.tb_promo_store_reco_details tpsrd ON tpsrd.promo_id = current_promo_id
            INNER JOIN price_promo.promo_product pp ON pp.promo_id = current_promo_id and pp.product_id = pm.product_id
            LEFT JOIN temp_existing_scenario_data esd ON esd.product_id = pm.product_id
            WHERE (pu->>'promo_id')::INTEGER = current_promo_id 
            AND pu->'scenario_data' IS NOT NULL;
            
            -- Debug: Show the count of records inserted
            GET DIAGNOSTICS row_count = ROW_COUNT;
            RAISE NOTICE 'Debug: Inserted % records into ps_scenario_discounts for promo_id %', row_count, current_promo_id;

            -- For new products: Copy scenario data from approved scenario to all other scenarios
            -- 1. If offer type matches, copy the scenario data
            -- 2. If offer type doesn't match, use default logic
            WITH approved_scenario AS (
                SELECT sm.scenario_order_id
                FROM price_promo.scenario_master sm
                INNER JOIN price_promo.promo_master prom ON prom.promo_id = current_promo_id
                WHERE sm.scenario_id = prom.last_approved_scenario_id
            )
            UPDATE price_promo.ps_scenario_discounts 
            SET scenario_data = scenario_data || COALESCE((
                SELECT jsonb_object_agg(
                    other_scenario.scenario_order_id::text,
                    CASE 
                        -- 1. If offer types match, copy the scenario data
                        WHEN other_scenario.offer_type_id = (
                            SELECT DISTINCT (pu->>'offer_type_id')::INTEGER
                            FROM jsonb_array_elements(p_session_data->'promo_updates') AS pu 
                            WHERE (pu->>'promo_id')::INTEGER = current_promo_id
                            AND pu->>'offer_type_id' IS NOT NULL
                            LIMIT 1
                        ) THEN
                            scenario_data->(approved_scenario.scenario_order_id::text) || jsonb_build_object(
                                'scenario_id', other_scenario.scenario_id, 
                                'scenario_order_id', other_scenario.scenario_order_id,
                                'scenario_name', other_scenario.scenario_name,
                                'created_by', p_user_id,
                                'updated_by', p_user_id
                            )
                        -- 2. If offer types don't match, use default logic based on offer type
                        ELSE
                            scenario_data->(approved_scenario.scenario_order_id::text) || 
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
                INNER JOIN approved_scenario ON true
                WHERE other_scenario.scenario_order_id != approved_scenario.scenario_order_id
            ), '{}'::jsonb)
            WHERE promo_id = current_promo_id
            AND product_level_id IN (
                SELECT tprd.product_level_id 
                FROM price_promo.tb_promo_product_reco_details tprd
                INNER JOIN temp_new_products tnp ON tnp.product_id = (tprd.product_level_value->>'product_id')::INTEGER
            );
            
            update_count := update_count + 1;
            processed_promo_ids := array_append(processed_promo_ids, current_promo_id);

            -- Clean up temp tables
            DROP TABLE temp_existing_scenario_data;
            DROP TABLE temp_existing_scenario_offer_types;
            DROP TABLE temp_existing_promo_product_user_metadata;
            DROP TABLE temp_new_products;
            DROP TABLE temp_product_base_prices;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            failed_promo_ids := array_append(failed_promo_ids, current_promo_id);
            RAISE NOTICE 'Error processing promo_id %: %', current_promo_id, SQLERRM;
        END;
    END LOOP;
    
    -- Return result
    result := jsonb_build_object(
        'success', true,
        'updated_count', update_count,
        'error_count', error_count,
        'session_id', p_session_id,
        'processed_promo_ids', processed_promo_ids,
        'failed_promo_ids', failed_promo_ids,
        'message', format('Successfully updated %s promos with %s errors', update_count, error_count)
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Function error for session_id %: %', p_session_id, SQLERRM;
    
    -- Return error result instead of re-raising
    result := jsonb_build_object(
        'success', false,
        'updated_count', update_count,
        'error_count', error_count,
        'session_id', p_session_id,
        'processed_promo_ids', processed_promo_ids,
        'failed_promo_ids', failed_promo_ids,
        'error_message', SQLERRM,
        'message', format('Function error for session %s: %s', p_session_id, SQLERRM)
    );
    
    RETURN result;
END;
$function$;
