--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_process_product_store_updates_detailed stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_process_product_store_updates_detailed

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_process_product_store_updates_detailed;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_process_product_store_updates_detailed(p_product_updates jsonb DEFAULT NULL::jsonb, p_product_segment_updates jsonb DEFAULT NULL::jsonb, p_product_store_ids integer[] DEFAULT NULL::integer[])
 RETURNS TABLE(processed_records integer, total_processing_time interval, product_updates_processed integer, segment_updates_processed integer, store_updates_processed integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_start_time timestamptz := clock_timestamp();
    v_total_processed int := 0;
    v_product_processed int := 0;
    v_segment_processed int := 0;
    v_store_processed int := 0;
    v_product_details JSONB;
    v_result_count int;
BEGIN
    -- Process product-level updates in bulk
    IF p_product_updates IS NOT NULL AND jsonb_array_length(p_product_updates) > 0 THEN
        WITH update_results AS (
            SELECT base_pricing_restaurant.fn_update_product_store_attributes(p_product_updates, 'product') AS result
        )
        SELECT COUNT(*) INTO v_product_processed FROM update_results;
        
        v_total_processed := v_total_processed + v_product_processed;
        RAISE NOTICE 'Product updates: % records processed', v_product_processed;
    END IF;

    -- Process product-segment-level updates in bulk
    IF p_product_segment_updates IS NOT NULL AND jsonb_array_length(p_product_segment_updates) > 0 THEN
        WITH update_results AS (
            SELECT base_pricing_restaurant.fn_update_product_store_attributes(p_product_segment_updates, 'product-segment') AS result
        )
        SELECT COUNT(*) INTO v_segment_processed FROM update_results;
        
        v_total_processed := v_total_processed + v_segment_processed;
        RAISE NOTICE 'Product-segment updates: % records processed', v_segment_processed;
    END IF;

    -- Process product-store-level updates
    IF p_product_store_ids IS NOT NULL AND array_length(p_product_store_ids, 1) > 0 THEN
        -- Calculate costs in bulk
        SELECT jsonb_agg(
            jsonb_build_object(
                'product_id', product_id,
                'store_id', store_id,
                'additional_cost', additional_cost::text,
                'total_cost', total_cost::text
            )
        ) INTO v_product_details
        FROM base_pricing_restaurant.fn_calculate_product_store_costs(p_product_store_ids);

        -- Update product-store attributes in bulk
        IF v_product_details IS NOT NULL AND jsonb_array_length(v_product_details) > 0 THEN
            WITH update_results AS (
                SELECT base_pricing_restaurant.fn_update_product_store_attributes(v_product_details, 'product-store') AS result
            )
            SELECT COUNT(*) INTO v_store_processed FROM update_results;
            
            v_total_processed := v_total_processed + v_store_processed;
            RAISE NOTICE 'Product-store updates: % records processed', v_store_processed;
        END IF;
    END IF;

    -- Return comprehensive results
    processed_records := v_total_processed;
    total_processing_time := clock_timestamp() - v_start_time;
    product_updates_processed := v_product_processed;
    segment_updates_processed := v_segment_processed;
    store_updates_processed := v_store_processed;
    
    RETURN NEXT;
END;
$function$
;