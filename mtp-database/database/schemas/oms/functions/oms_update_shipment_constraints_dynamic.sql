--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:oms_update_shipment_constraints_dynamic_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-127833 labels:oms_update_shipment_constraints_dynamic1
--comment: Dynamic configuration-driven SP for shipment constraint updates - backend provides config as JSONB parameter from oms_sp_update_config table

DROP FUNCTION IF EXISTS oms.oms_update_shipment_constraints_dynamic(jsonb, jsonb, jsonb, integer, jsonb);
CREATE OR REPLACE FUNCTION oms.oms_update_shipment_constraints_dynamic(
    _product_filters jsonb,
    _selections jsonb,
    _values jsonb,
    _updated_by integer,
    sp_config jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $function$
/*
  Dynamic Shipment Constraint Update SP (Backend-Driven Config)
  
  Configuration Source: Backend reads from oms.oms_sp_update_config table

  Parameters:
    $1: _product_filters - JSONB with product attribute filters (for bulk updates)
    $2: _selections - JSONB array with record IDs to update (empty for bulk update)
    $3: _values - JSONB array with updated values
    $4: _updated_by - User ID performing the update
    $5: sp_config - JSONB with configuration (fetched by backend from oms_sp_update_config)
        {
          "updatable_columns": ["min_replenishment_quantity", "max_replenishment_quantity", "order_multiple", "moq_tolerance"],
          "product_code_source": "paf.product_code" or "paf.l4_name",
          "paf_filter": "optional SQL fragment appended after form_main_table_filters (e.g. AND paf.active = true)"
        }
        
        Note: schema_name, table_name, id_column are hardcoded in SP (same across all clients)

  Usage:
    SELECT oms.oms_update_shipment_constraints_dynamic(
      '{"l0_name": [{"type": "list","operator": "in", "values": ["SHOES"]}]}'::jsonb,
      '[]'::jsonb,
      '[{"min_replenishment_quantity": 10}]'::jsonb,
      123,
      '{"schema_name": "oms", ...}'::jsonb
    );
*/
DECLARE
    _shipment_id int;
    _column_value int := NULL;
    _values_object jsonb;
    _pa_query text := '';
    _update_cols text := '';
    _update_count int;
    -- Hardcoded constants (same across all clients)
    v_schema_name text := 'oms';
    v_table_name text := 'oms_constraints_shipment';
    v_id_column text := 'id';
    v_full_table_name text := 'oms.oms_constraints_shipment';
    -- Dynamic configuration from sp_config
    v_updatable_columns jsonb;
    v_product_code_source text;
    v_paf_filter text := '';
    v_column_name text;
    v_set_clauses text[];
    v_set_clause text;
    v_update_sql text;
    v_column_updated_list text[];
    v_gen_random_uuid TEXT := gen_random_uuid()::varchar;
    v_error_message TEXT;
BEGIN
    IF sp_config IS NULL OR sp_config = 'null'::jsonb THEN
        RAISE EXCEPTION 'SP configuration is required (must be provided by backend)';
    END IF;

    -- Extract only the truly dynamic configuration components
    v_updatable_columns := COALESCE(sp_config->'updatable_columns', '["min_replenishment_quantity", "max_replenishment_quantity", "order_multiple","moq_tolerance"]'::jsonb);
    v_product_code_source := COALESCE(sp_config->>'product_code_source', 'paf.product_code');
    v_paf_filter := COALESCE(sp_config->>'paf_filter', '');

    RAISE NOTICE 'Using configuration: columns=%, product_code_source=%, paf_filter=%', v_updatable_columns, v_product_code_source, v_paf_filter;

    _pa_query := global.form_main_table_filters('product_attributes_filter', _product_filters);

    -- Build column updated list for logging
    FOR i IN 0..jsonb_array_length(v_updatable_columns)-1 LOOP
        v_column_updated_list := array_append(v_column_updated_list, v_updatable_columns->>i);
    END LOOP;
    _update_cols := array_to_string(v_column_updated_list, ', ');

    -- Validate that _selections are provided
    IF jsonb_array_length(_selections) = 0 THEN
        RAISE NOTICE 'Bulk update mode: updating all records based on product filter';
        
        -- Build SET clauses dynamically for bulk update
        v_set_clauses := ARRAY[]::text[];
        
        FOR i IN 0..jsonb_array_length(v_updatable_columns)-1 LOOP
            v_column_name := v_updatable_columns->>i;
            
            -- Check if value exists in first element of _values
            IF jsonb_array_length(_values) > 0 AND (_values->0 ? v_column_name) THEN
                v_set_clauses := array_append(
                    v_set_clauses,
                    format('%I = COALESCE($%s, %I)', 
                        v_column_name, 
                        i + 1,
                        v_column_name
                    )
                );
            END IF;
        END LOOP;

        IF array_length(v_set_clauses, 1) IS NULL OR array_length(v_set_clauses, 1) = 0 THEN
            RAISE NOTICE 'No columns to update';
            RETURN;
        END IF;

        v_set_clause := array_to_string(v_set_clauses, ', ');

        -- Build and execute dynamic UPDATE query for bulk update
        v_update_sql := format('
            WITH filtered_products AS (
                SELECT %s as product_code
                FROM global.product_attributes_filter paf %s %s
            )
            UPDATE %s cs
            SET %s,
                updated_by = $%s,
                updated_at = NOW(),
                column_updated = $%s
            FROM filtered_products fp
            WHERE cs.product_code = fp.product_code',
            v_product_code_source,
            _pa_query,
            CASE WHEN v_paf_filter != '' THEN ' ' || v_paf_filter ELSE '' END,
            v_full_table_name,
            v_set_clause,
            jsonb_array_length(v_updatable_columns) + 1,
            jsonb_array_length(v_updatable_columns) + 2
        );

        RAISE NOTICE 'Bulk update SQL: %', v_update_sql;

        -- Prepare parameters for EXECUTE USING
        DECLARE
            v_params text[] := ARRAY[]::text[];  -- was: v_params anyarray;
            v_value_int int;
        BEGIN
            -- Build parameter array
            FOR i IN 0..jsonb_array_length(v_updatable_columns)-1 LOOP
                v_column_name := v_updatable_columns->>i;
                
                IF jsonb_array_length(_values) > 0 AND (_values->0 ? v_column_name) THEN
                    v_value_int := (_values->0->>v_column_name)::int;
                ELSE
                    v_value_int := NULL;
                END IF;
                
                v_params := array_append(v_params, v_value_int::text);
            END LOOP;
            
            -- Add updated_by and column_updated
            v_params[jsonb_array_length(v_updatable_columns) + 1] := _updated_by;
            v_params[jsonb_array_length(v_updatable_columns) + 2] := _update_cols;

            -- Execute with dynamic parameters
            CASE jsonb_array_length(v_updatable_columns)
                WHEN 3 THEN
                    EXECUTE v_update_sql USING v_params[1]::int, v_params[2]::int, v_params[3]::int, v_params[4]::int, v_params[5];
                WHEN 4 THEN
                    EXECUTE v_update_sql USING  v_params[1]::int, v_params[2]::int, v_params[3]::int, v_params[4]::int, v_params[5]::int, v_params[6];
                ELSE
                    RAISE EXCEPTION 'Unsupported number of updatable columns: %', jsonb_array_length(v_updatable_columns);
            END CASE;
        END;

        GET DIAGNOSTICS _update_count = ROW_COUNT;
        RAISE NOTICE 'Updated % records based on product filter', _update_count;
    
    ELSE
        RAISE NOTICE 'Individual update mode: updating % records', jsonb_array_length(_selections);
        
        -- Iterate over each shipment_id in _selections
        FOR i IN 0..jsonb_array_length(_selections)-1 LOOP
            IF NOT (_selections->i ? v_id_column) THEN
                RAISE EXCEPTION 'Missing % in _selections at index %', v_id_column, i;
            END IF;

            -- Extract the shipment_id from _selections
            _shipment_id := (_selections->i->>v_id_column)::int;

            -- Find the corresponding _values object for the current _shipment_id
            _values_object := NULL;
            FOR j IN 0..jsonb_array_length(_values)-1 LOOP
                IF (_values->j->>v_id_column)::int = _shipment_id THEN
                    _values_object := _values->j;
                    EXIT;
                END IF;
            END LOOP;

            -- If no matching _values object found for the shipment_id, skip this iteration
            IF _values_object IS NULL THEN
                RAISE NOTICE 'No matching attribute values found for shipment_id %', _shipment_id;
                CONTINUE;
            END IF;

            -- Build SET clauses dynamically for individual update
            v_set_clauses := ARRAY[]::text[];
            
            FOR k IN 0..jsonb_array_length(v_updatable_columns)-1 LOOP
                v_column_name := v_updatable_columns->>k;
                
                IF _values_object ? v_column_name THEN
                    _column_value := (_values_object->>v_column_name)::int;
                    v_set_clauses := array_append(
                        v_set_clauses,
                        format('%I = COALESCE(%L, %I)', 
                            v_column_name, 
                            _column_value,
                            v_column_name
                        )
                    );
                END IF;
            END LOOP;

            IF array_length(v_set_clauses, 1) IS NULL OR array_length(v_set_clauses, 1) = 0 THEN
                RAISE NOTICE 'No columns to update for shipment_id %', _shipment_id;
                CONTINUE;
            END IF;

            v_set_clause := array_to_string(v_set_clauses, ', ');

            -- Build and execute dynamic UPDATE query for individual record
            v_update_sql := format('
                UPDATE %s
                SET %s,
                    updated_by = %L,
                    updated_at = NOW(),
                    column_updated = %L
                WHERE %I = %L',
                v_full_table_name,
                v_set_clause,
                _updated_by,
                _update_cols,
                v_id_column,
                _shipment_id
            );

            RAISE DEBUG 'Individual update SQL: %', v_update_sql;

            EXECUTE v_update_sql;

            -- Check if the update affected any rows
            GET DIAGNOSTICS _update_count = ROW_COUNT;
            IF _update_count = 0 THEN
                RAISE NOTICE 'No rows updated for shipment_id %', _shipment_id;
            END IF;
        END LOOP;
    END IF;

    -- Log execution for audit trail
    PERFORM global.sp_log(
        v_gen_random_uuid, 
        'oms.oms_update_shipment_constraints_dynamic', 
        'Execution completed',
        'Updated ' || COALESCE(_update_count, 0)::text || ' records',
        jsonb_build_object(
            'product_filters', _product_filters, 
            'selections_count', jsonb_array_length(_selections),
            'config_provided', sp_config IS NOT NULL
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;
        
        -- Log error
        PERFORM global.sp_log(
            v_gen_random_uuid, 
            'oms.oms_update_shipment_constraints_dynamic', 
            'ERROR',
            v_error_message,
            jsonb_build_object(
                'product_filters', _product_filters, 
                'selections_count', jsonb_array_length(_selections),
                'sqlstate', SQLSTATE
            )
        );
        
        -- Re-raise with context
        RAISE EXCEPTION 'Dynamic update SP failed: % (SQLSTATE: %)', 
            v_error_message, SQLSTATE;
END;
$function$
;
