--liquibase formatted sql
--changeset build_dynamic_kpi_columns_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-130922 labels:MTP-130922
--comment: MTP-130922 standalone function to build dynamic KPI column fragments
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.build_dynamic_kpi_columns(jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.build_dynamic_kpi_columns(dynamic_kpi_config jsonb DEFAULT '[]'::jsonb)
 RETURNS TABLE (
    kpi_columns TEXT,
    kpi_agg_columns_store TEXT,
    kpi_agg_columns_dc TEXT,
    kpi_select_columns TEXT
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
    _dynamic_kpi_columns TEXT := '';
    _dynamic_kpi_agg_columns_store TEXT := '';
    _dynamic_kpi_agg_columns_dc TEXT := '';
    _dynamic_kpi_select_columns TEXT := '';
    _kpi_rec RECORD;
BEGIN
    -- Build dynamic KPI columns with proper aggregation based on location_type
    -- location_type: 'STORE' (stores only), 'WHS' (warehouse/DC only), 'ALL' (both combined)
    IF dynamic_kpi_config IS NOT NULL AND jsonb_array_length(dynamic_kpi_config) > 0 THEN
        FOR _kpi_rec IN 
            SELECT DISTINCT ON (regexp_replace(lower(kc.kpi_name), '[^a-z0-9]+', '_', 'g'))
                regexp_replace(lower(kc.kpi_name), '[^a-z0-9]+', '_', 'g') AS column_name,
                COALESCE(kmm.aggregate_function, 'Sum') AS aggregate_function,
                COALESCE(kmm.location_type, 'STORE') AS location_type
            FROM inventory_smart.kpi_config kc
            JOIN inventory_smart.kpi_module_mapping kmm ON kc.kpi_id = kmm.kpi_id
            JOIN inventory_smart.module_component_mapping mcm ON kmm.module_component_id = mcm.mapping_id
            WHERE mcm.table_name ILIKE '%article_inventory_dashboard%'
              AND kc.is_active = TRUE
              AND DATE(kc.created_at) < CURRENT_DATE
              AND regexp_replace(lower(kc.kpi_name), '[^a-z0-9]+', '_', 'g') IN (SELECT jsonb_array_elements_text(dynamic_kpi_config))
            ORDER BY regexp_replace(lower(kc.kpi_name), '[^a-z0-9]+', '_', 'g')
        LOOP
            -- Build column for aid CTE (raw column)
            _dynamic_kpi_columns := _dynamic_kpi_columns || ', ' || quote_ident(_kpi_rec.column_name);
            
            -- Build aggregation expression based on aggregate_function
            DECLARE
                _agg_expr TEXT;
            BEGIN
                _agg_expr := CASE LOWER(_kpi_rec.aggregate_function)
                    WHEN 'sum' THEN 
                        'CAST(ROUND(SUM(COALESCE(' || quote_ident(_kpi_rec.column_name) || ', 0))) AS INTEGER) AS ' || quote_ident(_kpi_rec.column_name)
                    WHEN 'avg' THEN 
                        'ROUND(AVG(COALESCE(' || quote_ident(_kpi_rec.column_name) || ', 0))::numeric, 2) AS ' || quote_ident(_kpi_rec.column_name)
                    WHEN 'count' THEN 
                        'COUNT(' || quote_ident(_kpi_rec.column_name) || ') AS ' || quote_ident(_kpi_rec.column_name)
                    WHEN 'max' THEN 
                        'MAX(COALESCE(' || quote_ident(_kpi_rec.column_name) || ', 0)) AS ' || quote_ident(_kpi_rec.column_name)
                    WHEN 'min' THEN 
                        'MIN(COALESCE(' || quote_ident(_kpi_rec.column_name) || ', 0)) AS ' || quote_ident(_kpi_rec.column_name)
                    ELSE 
                        'CAST(ROUND(SUM(COALESCE(' || quote_ident(_kpi_rec.column_name) || ', 0))) AS INTEGER) AS ' || quote_ident(_kpi_rec.column_name)
                END;

                -- Add to appropriate CTE based on location_type
                IF _kpi_rec.location_type IN ('STORE', 'ALL') THEN
                    _dynamic_kpi_agg_columns_store := _dynamic_kpi_agg_columns_store || ', ' || _agg_expr;
                END IF;

                IF _kpi_rec.location_type IN ('WHS', 'ALL') THEN
                    _dynamic_kpi_agg_columns_dc := _dynamic_kpi_agg_columns_dc || ', ' || _agg_expr;
                END IF;

                -- Build select for final query based on location_type
                IF _kpi_rec.location_type = 'STORE' THEN
                    -- STORE only: select from str_metrics (b)
                    _dynamic_kpi_select_columns := _dynamic_kpi_select_columns || ', COALESCE(b.' || quote_ident(_kpi_rec.column_name) || ', 0) AS ' || quote_ident(_kpi_rec.column_name);
                ELSIF _kpi_rec.location_type = 'WHS' THEN
                    -- WHS only: select from dc_metrics (c)
                    _dynamic_kpi_select_columns := _dynamic_kpi_select_columns || ', COALESCE(c.' || quote_ident(_kpi_rec.column_name) || ', 0) AS ' || quote_ident(_kpi_rec.column_name);
                ELSE
                    -- ALL: combine store + dc values
                    _dynamic_kpi_select_columns := _dynamic_kpi_select_columns || ', COALESCE(b.' || quote_ident(_kpi_rec.column_name) || ', 0) + COALESCE(c.' || quote_ident(_kpi_rec.column_name) || ', 0) AS ' || quote_ident(_kpi_rec.column_name);
                END IF;
            END;
        END LOOP;
    END IF;

    RAISE NOTICE 'Dynamic KPI columns (aid) --> %', _dynamic_kpi_columns;
    RAISE NOTICE 'Dynamic KPI agg columns (str_metrics) --> %', _dynamic_kpi_agg_columns_store;
    RAISE NOTICE 'Dynamic KPI agg columns (dc_metrics) --> %', _dynamic_kpi_agg_columns_dc;
    RAISE NOTICE 'Dynamic KPI select columns (final) --> %', _dynamic_kpi_select_columns;

    kpi_columns := _dynamic_kpi_columns;
    kpi_agg_columns_store := _dynamic_kpi_agg_columns_store;
    kpi_agg_columns_dc := _dynamic_kpi_agg_columns_dc;
    kpi_select_columns := _dynamic_kpi_select_columns;
    RETURN NEXT;
END;
$function$;
