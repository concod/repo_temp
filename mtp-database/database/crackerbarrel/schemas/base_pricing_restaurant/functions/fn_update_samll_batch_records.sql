--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_update_samll_batch_records stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_update_samll_batch_records

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_update_samll_batch_records;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_update_samll_batch_records(p_table_name text, p_set_columns text[], p_where_columns text[], p_batch_data jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_update_query TEXT;
    v_total_updated INTEGER := 0;
    v_set_clauses TEXT[] := '{}';
    v_where_conditions TEXT[] := '{}';
    v_record JSONB;
    v_column TEXT;
BEGIN
    RAISE NOTICE '🚀 Building dynamic bulk CASE update for % records', jsonb_array_length(p_batch_data);
    
    -- 🎯 Build SET clauses with CASE for each column
    FOREACH v_column IN ARRAY p_set_columns
    LOOP
        DECLARE
            v_case_parts TEXT[] := '{}';
            v_has_data BOOLEAN := false;
        BEGIN
            -- Build CASE conditions for this specific column
            FOR v_record IN SELECT * FROM jsonb_array_elements(p_batch_data)
            LOOP
                -- Only include if this record has data for this column
                IF v_record ? v_column AND v_record->>v_column IS NOT NULL THEN
                    v_has_data := true;
                    
                    -- Build WHERE condition for this specific record
                    DECLARE
                        v_where_condition TEXT := (
                            SELECT string_agg(
                                format('%I = %L', wc, v_record->>wc), 
                                ' AND '
                            ) 
                            FROM unnest(p_where_columns) AS wc
                        );
                    BEGIN
                        v_case_parts := array_append(
                            v_case_parts,
                            format('WHEN %s THEN %L', v_where_condition, v_record->>v_column)
                        );
                    END;
                END IF;
            END LOOP;
            
            -- Only add CASE clause if we found data for this column
            IF v_has_data THEN
                v_set_clauses := array_append(
                    v_set_clauses,
                    format('%I = CASE %s ELSE %I END', 
                           v_column, 
                           array_to_string(v_case_parts, ' '),
                           v_column)
                );
                RAISE NOTICE '   ✅ Built CASE for column: % (% conditions)', v_column, array_length(v_case_parts, 1);
            ELSE
                RAISE NOTICE '   ⏭️  Skipping column: % (no data in batch)', v_column;
            END IF;
        END;
    END LOOP;

    -- 🎯 Build WHERE conditions (OR all records together)
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_batch_data)
    LOOP
        DECLARE
            v_where_condition TEXT := (
                SELECT string_agg(
                    format('%I = %L', wc, v_record->>wc), 
                    ' AND '
                ) 
                FROM unnest(p_where_columns) AS wc
            );
        BEGIN
            v_where_conditions := array_append(v_where_conditions, '(' || v_where_condition || ')');
        END;
    END LOOP;

    -- 🎯 Build the final dynamic UPDATE query
    v_update_query := format(
        'UPDATE base_pricing_restaurant.%I SET %s WHERE %s',
        p_table_name,
        array_to_string(v_set_clauses, ', '),
        array_to_string(v_where_conditions, ' OR ')
    );

    RAISE NOTICE '📝 Final Query: %', v_update_query;
    
    -- 🎯 Execute single bulk UPDATE
    EXECUTE v_update_query;
    GET DIAGNOSTICS v_total_updated = ROW_COUNT;

    RAISE NOTICE '✅ Updated % rows', v_total_updated;
    
    RETURN v_total_updated;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
        RAISE NOTICE '   Query: %', v_update_query;
        RETURN 0;
END;
$function$
;