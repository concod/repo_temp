--liquibase formatted sql
--changeset narendren.saravanan@impactanalytics.co:fn_apply_promos_excel_bulk_edit_20 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add fn_apply_promos_excel_bulk_edit function

DROP FUNCTION IF EXISTS price_promo.fn_apply_promos_excel_bulk_edit;

CREATE OR REPLACE FUNCTION price_promo.fn_apply_promos_excel_bulk_edit(p_session_id character varying, p_user_id integer, p_session_data jsonb, p_product_identifier_column character varying)
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
    v_sql TEXT;
    v_product_discounting_level TEXT := '';
    v_selected_product_levels INTEGER[];
BEGIN
        
    -- Process each promo group (grouped by promo_id)
    FOR promo_group IN 
        SELECT DISTINCT
            (pu->>'promo_id')::INTEGER AS promo_id
        FROM jsonb_array_elements(p_session_data->'promo_updates') AS pu
    LOOP
        current_promo_id := promo_group.promo_id;
        
        BEGIN
            -- Step 0: Identify new products and their respective product IDs (products not already in current promo)
            v_sql := format('
                CREATE TEMP TABLE temp_new_products AS 
                SELECT DISTINCT
                    pu->>%L as %I,
                    pm.product_name,
                    pm.promo_base_price as base_price
                FROM jsonb_array_elements($1->%L) AS pu
                INNER JOIN price_promo.product_master pm ON pm.%I::text = pu->>%L
                WHERE (pu->>%L)::INTEGER = $2
                AND pm.product_id NOT IN (
                    SELECT DISTINCT product_id 
                    FROM price_promo.promo_product 
                    WHERE promo_id = $2
                )', p_product_identifier_column, p_product_identifier_column, 'promo_updates', p_product_identifier_column, p_product_identifier_column, 'promo_id');
            EXECUTE v_sql USING p_session_data, current_promo_id;
            
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
            
            -- Remove all existing records for this promo_id
            DELETE FROM price_promo.ps_scenario_discounts WHERE promo_id = current_promo_id;
            DELETE FROM price_promo.included_products WHERE promo_id = current_promo_id;
            DELETE FROM price_promo.promo_product WHERE promo_id = current_promo_id;
            DELETE FROM price_promo.tb_discount_level_products WHERE product_level_id IN (
                SELECT product_level_id FROM price_promo.tb_promo_product_reco_details WHERE promo_id = current_promo_id
            );
            DELETE FROM price_promo.tb_promo_store_reco_details WHERE promo_id = current_promo_id;
            DELETE FROM price_promo.tb_promo_product_reco_details WHERE promo_id = current_promo_id;

            
            -- Bulk insert all products for this promo_id
            v_sql := format('
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
                        p.promo_id = $2
                )
                SELECT 
                    $2,
                    pm.product_id,
                    pm.product_name
                FROM jsonb_array_elements($1->%L) AS pu
                INNER JOIN price_promo.product_master pm ON pm.%I::text = pu->>%L
                INNER JOIN event_products_cte ep on ep.product_id = pm.product_id
                WHERE (pu->>%L)::INTEGER = $2', 'promo_updates', p_product_identifier_column, p_product_identifier_column, 'promo_id');
            EXECUTE v_sql USING p_session_data, current_promo_id;

            -- Populate data in promo_product and promo_product_hierarchy
            perform price_promo.fn_save_promo_final_products(current_promo_id, p_user_id);
            perform price_promo.fn_save_promo_final_hierarchy(current_promo_id, p_user_id);


            -- Update products_count in promo_master
            UPDATE price_promo.promo_master
            SET
                products_count = (SELECT COUNT(*) FROM price_promo.promo_product WHERE promo_id = current_promo_id)
            WHERE promo_id = current_promo_id;

            -- Populate user metadata into promo_product for this promo_id

            v_sql := format('
                UPDATE price_promo.promo_product
                SET
                    user_metadata = pu->%L
                FROM jsonb_array_elements($1->%L) AS pu
                INNER JOIN price_promo.product_master pm ON pm.%I::text = pu->>%L
                WHERE price_promo.promo_product.promo_id = $2 
                AND price_promo.promo_product.product_id = pm.product_id', 'user_metadata', 'promo_updates', p_product_identifier_column, p_product_identifier_column);
            EXECUTE v_sql USING p_session_data, current_promo_id;

            -- Get product discount levels for this promo_id
            SELECT product_discount_level INTO v_selected_product_levels 
            FROM price_promo.ps_rules 
            WHERE promo_id = current_promo_id;
            
            -- Build product discounting level configuration dynamically
            v_product_discounting_level := '';
            IF v_selected_product_levels IS NOT NULL AND v_selected_product_levels != ARRAY[-100] THEN
                SELECT array_to_string(
                    array_agg(
                        format(
                            '''%1$s'',pm.%1$s,
                            ''%2$s'',pm.%2$s',
                            dlc.id_key,
                            dlc.value_key
                        )
                    ),
                    ','
                )
                INTO v_product_discounting_level
                FROM price_promo.discount_level_config dlc
                WHERE dlc.discount_level_id = ANY(v_selected_product_levels)
                AND dlc.category = 'product'
                AND dlc.discount_level_id != -200;
            END IF;
            
            -- If no discount level config found, use default (product_id and product_description)
            IF v_product_discounting_level = '' OR v_product_discounting_level IS NULL THEN
                v_product_discounting_level := format('''product_id'',pm.product_id,
                            ''product_description'',pm.product_description');
            END IF;

            -- Bulk insert all promo product recommendation details for this promo_id
            v_sql := format('
                INSERT INTO price_promo.tb_promo_product_reco_details (
                    promo_id,
                    product_level_value
                )
                SELECT 
                    $2,
                    jsonb_build_object(
                        %s
                    )
                FROM jsonb_array_elements($1->%L) AS pu
                INNER JOIN price_promo.product_master pm ON pm.%I::text = pu->>%L
                WHERE (pu->>%L)::INTEGER = $2', v_product_discounting_level, 'promo_updates', p_product_identifier_column, p_product_identifier_column, 'promo_id');
            EXECUTE v_sql USING p_session_data, current_promo_id;

            -- Step 1.6: Create product level to base price lookup table
            v_sql := format('
                CREATE TEMP TABLE temp_product_base_prices AS
                SELECT 
                    tprd.product_level_id,
                    tnp.base_price
                FROM price_promo.tb_promo_product_reco_details tprd
                INNER JOIN temp_new_products tnp 
                    ON tnp.%I::text = tprd.product_level_value->>%L
                WHERE tprd.promo_id = $1', p_product_identifier_column, p_product_identifier_column);
            EXECUTE v_sql USING current_promo_id;
            
            -- Insert product_level_ids into tb_discount_level_products
            v_sql := format('
                INSERT INTO price_promo.tb_discount_level_products (
                    product_level_id,
                    product_id
                )
                SELECT 
                    tprd.product_level_id,
                    pm.product_id
                FROM jsonb_array_elements($1->%L) AS pu
                INNER JOIN price_promo.product_master pm ON pm.%I::text = pu->>%L
                INNER JOIN price_promo.tb_promo_product_reco_details tprd ON tprd.promo_id = $2 AND (tprd.product_level_value->>%L)::text = pm.%I::text
                WHERE (pu->>%L)::INTEGER = $2', 'promo_updates', p_product_identifier_column, p_product_identifier_column, p_product_identifier_column, p_product_identifier_column, 'promo_id');
            EXECUTE v_sql USING p_session_data, current_promo_id;

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
            v_sql := format('
                INSERT INTO price_promo.ps_scenario_discounts (
                    promo_id,
                    product_level_id,
                    store_level_id,
                    scenario_data,
                    created_at,
                    created_by
                )
                SELECT 
                    $2,
                    tprd.product_level_id,
                    tpsrd.store_level_id,
                    COALESCE(esd.scenario_data, %L::jsonb) || jsonb_build_object(
                        sm.scenario_order_id::text, 
                        (pu->%L) || jsonb_build_object(
                            %L, prom.last_approved_scenario_id, 
                            %L, sm.scenario_order_id,
                            %L, sm.scenario_name,
                            %L, tasm.name,
                            %L, tasm.id,
                            %L, price_promo.get_offer_description_v2(
                                tasm.name, 
                                (pu->%L->>%L)::numeric, 
                                pu->%L->>%L,
                                (pu->%L->>%L)::numeric, 
                                pu->%L->>%L,
                                (pu->%L->>%L)::numeric,
                                (pu->%L->>%L)::numeric,
                                pu->%L->%L
                            )::text,
                            %L, $3,
                            %L, $3
                        )
                    ),
                    NOW(),
                    $3
                FROM jsonb_array_elements($1->%L) AS pu
                INNER JOIN price_promo.product_master pm ON pm.%I::text = pu->>%L
                INNER JOIN price_promo.tb_promo_product_reco_details tprd ON tprd.promo_id = $2 AND (tprd.product_level_value->>%L)::text = pm.%I::text
                INNER JOIN price_promo.promo_master prom ON prom.promo_id = $2
                INNER JOIN price_promo.scenario_master sm ON sm.scenario_id = prom.last_approved_scenario_id
                INNER JOIN price_promo.tb_promo_store_reco_details tpsrd ON tpsrd.promo_id = $2
                INNER JOIN metaschema.tb_app_sub_master tasm ON tasm.id = (pu->>%L)::INTEGER
                INNER JOIN price_promo.promo_product pp ON pp.promo_id = $2 and pp.product_id = pm.product_id
                LEFT JOIN temp_existing_scenario_data esd ON esd.product_id = pm.product_id
                WHERE (pu->>%L)::INTEGER = $2 
                AND pu->%L IS NOT NULL', 
                '{}', 'scenario_data', 'scenario_id', 'scenario_order_id', 'scenario_name', 'offer_type', 'offer_type_id', 'offer_value',
                'scenario_data', 'offer_x_value', 'scenario_data', 'offer_x_type',
                'scenario_data', 'offer_y_value', 'scenario_data', 'offer_y_type',
                'scenario_data', 'offer_z_value', 'scenario_data', 'tier_id', 'scenario_data', 'special_offer_data',
                'created_by', 'updated_by',
                'promo_updates', p_product_identifier_column, p_product_identifier_column, p_product_identifier_column, p_product_identifier_column, 'offer_type_id', 'promo_id', 'scenario_data');
            EXECUTE v_sql USING p_session_data, current_promo_id, p_user_id;

            -- For new products: Copy scenario data from approved scenario to all other scenarios
            -- 1. If offer type matches, copy the scenario data
            -- 2. If offer type doesn't match, use default logic
            v_sql := format('
                WITH approved_scenario AS (
                    SELECT sm.scenario_order_id
                    FROM price_promo.scenario_master sm
                    INNER JOIN price_promo.promo_master prom ON prom.promo_id = $1
                    WHERE sm.scenario_id = prom.last_approved_scenario_id
                )
                UPDATE price_promo.ps_scenario_discounts 
                SET scenario_data = scenario_data || COALESCE((
                    SELECT jsonb_object_agg(
                        other_scenario.scenario_order_id::text,
                        CASE 
                            -- 1. If offer types match, copy the scenario data
                            WHEN other_scenario.offer_type_id = (
                                SELECT DISTINCT (pu->>''offer_type_id'')::INTEGER
                                FROM jsonb_array_elements($2->''promo_updates'') AS pu 
                                WHERE (pu->>''promo_id'')::INTEGER = $1
                                AND pu->>''offer_type_id'' IS NOT NULL
                                LIMIT 1
                            ) THEN
                                scenario_data->(approved_scenario.scenario_order_id::text) || jsonb_build_object(
                                    ''scenario_id'', other_scenario.scenario_id, 
                                    ''scenario_order_id'', other_scenario.scenario_order_id,
                                    ''scenario_name'', other_scenario.scenario_name,
                                    ''created_by'', $3,
                                    ''updated_by'', $3
                                )
                            -- 2. If offer types don''t match, use default logic based on offer type
                            ELSE
                                scenario_data->(approved_scenario.scenario_order_id::text) || 
                                jsonb_build_object(
                                    ''scenario_id'', other_scenario.scenario_id,
                                    ''scenario_order_id'', other_scenario.scenario_order_id,
                                    ''scenario_name'', other_scenario.scenario_name,
                                    ''offer_type'', other_scenario.offer_type,
                                    ''offer_type_id'', other_scenario.offer_type_id,
                                    ''created_by'', $3,
                                    ''updated_by'', $3
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
                ), ''{}''::jsonb)
                WHERE promo_id = $1
                AND product_level_id IN (
                    SELECT tprd.product_level_id 
                    FROM price_promo.tb_promo_product_reco_details tprd
                    INNER JOIN temp_new_products tnp ON tnp.%I::text = tprd.product_level_value->>%L
                )', p_product_identifier_column, p_product_identifier_column);
            EXECUTE v_sql USING current_promo_id, p_session_data, p_user_id;
            
            update_count := update_count + 1;
            processed_promo_ids := array_append(processed_promo_ids, current_promo_id);

            -- Clean up temp tables
            DROP TABLE temp_existing_scenario_data;
            DROP TABLE temp_existing_scenario_offer_types;
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
