--liquibase formatted sql
--changeset chandra.nil.ghosh:Added_update_offcycle_aggr_data_v4 runOnChange:true stripComments:false splitStatements:false context:MTP-56850 labels:filter_data_by_draft_helper
--comment: Created update_offcycle_aggr_data function
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_offcycle_aggr_data(text, jsonb, jsonb, jsonb, jsonb);


CREATE OR REPLACE FUNCTION inventory_smart.update_offcycle_aggr_data(
    draft_id text,
    updated_data jsonb,
    product_attribute_query jsonb,
    date_filter jsonb,
    store_attribute_query jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    v_draft_id_int int4;
    v_fiscal_week TEXT;
    v_new_value NUMERIC;
    v_old_aggregated_value NUMERIC;
    v_scaling_factor NUMERIC;
    v_updated_count int4 := 0;
    v_total_updated int4 := 0;
    v_result jsonb := '{}'::jsonb;
    v_pa_query TEXT := '';
    v_sa_query TEXT := '';
    v_key TEXT;
    v_values jsonb;
    v_query TEXT;
    v_record_count int4 := 0;
    v_distributed_value NUMERIC;
BEGIN
    --------------------------------------------------------------------
    -- VALIDATION
    --------------------------------------------------------------------
    IF draft_id IS NULL OR draft_id = '' THEN
        RAISE EXCEPTION 'draft_id is mandatory';
    END IF;
    
    IF updated_data IS NULL OR updated_data = '{}'::jsonb THEN
        RAISE EXCEPTION 'updated_data is mandatory and cannot be empty';
    END IF;
    
    v_draft_id_int := draft_id::int4;

    --------------------------------------------------------------------
    -- BUILD PRODUCT ATTRIBUTE QUERY
    --------------------------------------------------------------------
    IF product_attribute_query IS NOT NULL
        AND jsonb_typeof(product_attribute_query) = 'object' THEN
        FOR v_key, v_values IN
            SELECT key, value
            FROM jsonb_each(product_attribute_query)
        LOOP
            -- Extract the values array
            IF jsonb_typeof(v_values->0->'values') = 'array'
            AND jsonb_array_length(v_values->0->'values') > 0 THEN
                v_pa_query := v_pa_query || ' AND ocr.' || v_key || ' IN (';
                v_pa_query := v_pa_query || (
                    SELECT string_agg(quote_literal(val), ',')
                    FROM jsonb_array_elements_text(v_values->0->'values') AS t(val)
                );
                v_pa_query := v_pa_query || ')';
            ELSE
                -- Skip empty or invalid lists
                CONTINUE;
            END IF;
        END LOOP;
    END IF;

    --------------------------------------------------------------------
    -- BUILD STORE ATTRIBUTE QUERY
    --------------------------------------------------------------------
    IF store_attribute_query IS NOT NULL
        AND jsonb_typeof(store_attribute_query) = 'object' THEN
        FOR v_key, v_values IN
            SELECT key, value
            FROM jsonb_each(store_attribute_query)
        LOOP
            -- Extract the values array
            IF jsonb_typeof(v_values->0->'values') = 'array'
            AND jsonb_array_length(v_values->0->'values') > 0 THEN
                v_sa_query := v_sa_query || ' AND ocr.' || v_key || ' IN (';
                v_sa_query := v_sa_query || (
                    SELECT string_agg(quote_literal(val), ',')
                    FROM jsonb_array_elements_text(v_values->0->'values') AS t(val)
                );
                v_sa_query := v_sa_query || ')';
            ELSE
                -- Skip empty or invalid lists
                CONTINUE;
            END IF;
        END LOOP;
    END IF;

    --------------------------------------------------------------------
    -- MAIN LOOP: Process each fiscal week
    --------------------------------------------------------------------
    FOR v_fiscal_week, v_new_value IN 
        SELECT key, (value::text)::NUMERIC
        FROM jsonb_each_text(updated_data)
    LOOP
        IF v_new_value IS NULL THEN
            CONTINUE;
        END IF;

        ----------------------------------------------------------------
        -- STEP 1: Get old aggregated value (dynamic SQL)
        ----------------------------------------------------------------
        v_query := '
            SELECT COALESCE(SUM(ocr.raw_roq_cof), 0)
            FROM inventory_smart.oms_cof_orders_recommended ocr
            WHERE is_approved = FALSE
              AND ocr.draft_id = $1
              AND ocr.receipt_fiscal_year_week = $2
            ' || v_pa_query || '
            ' || v_sa_query || '
        ';

        EXECUTE v_query
        INTO v_old_aggregated_value
        USING v_draft_id_int, v_fiscal_week::int4;

        ----------------------------------------------------------------
        -- STEP 2: Handle zero sum case
        ----------------------------------------------------------------
        IF v_old_aggregated_value IS NULL OR v_old_aggregated_value = 0 THEN
            -- Handle case when SUM(raw_roq_cof) = 0
            -- Get count of records to distribute the new value
            v_query := '
                SELECT COUNT(*)
                FROM inventory_smart.oms_cof_orders_recommended ocr
                WHERE ocr.draft_id = $1
                  AND ocr.is_approved = FALSE
                  AND ocr.receipt_fiscal_year_week = $2
                  AND ocr.order_quantity_cof IS NOT NULL
                ' || v_pa_query || '
                ' || v_sa_query || '
            ';
            
            EXECUTE v_query
            INTO v_record_count
            USING v_draft_id_int, v_fiscal_week::int4;
            
            IF v_record_count > 0 THEN
                -- Distribute the new value using CEIL
                v_distributed_value := CEIL(v_new_value / v_record_count);
                
                v_query := '
                    UPDATE inventory_smart.oms_cof_orders_recommended ocr
                    SET order_quantity_cof = GREATEST(ocr.order_quantity_cof, $3)
                    WHERE ocr.draft_id = $1
                      AND ocr.is_approved = FALSE
                      AND ocr.receipt_fiscal_year_week = $2
                      AND ocr.order_quantity_cof IS NOT NULL
                    ' || v_pa_query || '
                    ' || v_sa_query || '
                ';
                
                EXECUTE v_query
                USING v_draft_id_int, v_fiscal_week::int4, v_distributed_value;
                
                GET DIAGNOSTICS v_updated_count = ROW_COUNT;
                v_total_updated := v_total_updated + v_updated_count;
                
                -- Store results (matching original format)
                v_result := v_result || jsonb_build_object(
                    v_fiscal_week,
                    jsonb_build_object(
                        'old_aggregated_value', v_old_aggregated_value,
                        'new_value',           v_new_value,
                        'scaling_factor',      NULL,
                        'records_updated',     v_updated_count
                    )
                );
            END IF;
        ELSE
            ----------------------------------------------------------------
            -- STEP 2: Compute scaling factor
            ----------------------------------------------------------------
            v_scaling_factor := v_new_value / v_old_aggregated_value;

            ----------------------------------------------------------------
            -- STEP 3: Update order_quantity_cof (dynamic SQL)
            ----------------------------------------------------------------
            v_query := '
                UPDATE inventory_smart.oms_cof_orders_recommended ocr
                SET order_quantity_cof = COALESCE(ocr.raw_roq_cof, 0) * $3
                WHERE ocr.draft_id = $1
                  AND ocr.is_approved = FALSE
                  AND ocr.receipt_fiscal_year_week = $2
                  AND ocr.order_quantity_cof IS NOT NULL
                ' || v_pa_query || '
                ' || v_sa_query || '
            ';

            EXECUTE v_query
            USING v_draft_id_int, v_fiscal_week::int4, v_scaling_factor;

            GET DIAGNOSTICS v_updated_count = ROW_COUNT;
            v_total_updated := v_total_updated + v_updated_count;

            ----------------------------------------------------------------
            -- STEP 4: Store results
            ----------------------------------------------------------------
            v_result := v_result || jsonb_build_object(
                v_fiscal_week,
                jsonb_build_object(
                    'old_aggregated_value', v_old_aggregated_value,
                    'new_value',           v_new_value,
                    'scaling_factor',      v_scaling_factor,
                    'records_updated',     v_updated_count
                )
            );
        END IF;
    END LOOP;

    --------------------------------------------------------------------
    -- FINAL RETURN
    --------------------------------------------------------------------
    RETURN jsonb_build_object(
        'status', 'success',
        'total_records_updated', v_total_updated,
        'fiscal_weeks_processed', v_result
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error updating offcycle aggregated data: %', SQLERRM;
END;
$function$;
