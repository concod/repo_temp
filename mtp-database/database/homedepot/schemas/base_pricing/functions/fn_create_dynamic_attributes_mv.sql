--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:fn_create_dynamic_attributes_mv_new_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_create_dynamic_attributes_mv_new_v1

DROP FUNCTION IF EXISTS base_pricing.fn_create_dynamic_attributes_mv();

CREATE OR REPLACE FUNCTION base_pricing.fn_create_dynamic_attributes_mv()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    case_statements text := '';
    attr_record record;
    mv_sql text;
BEGIN
    RAISE NOTICE 'Starting function execution - building dynamic CASE statements';
    
    -- Build dynamic CASE statements in the exact requested format
    FOR attr_record IN 
        SELECT 
            attribute_name,
            data_type,
            frontend_display_name
        FROM base_pricing.bp_product_store_attributes_metadata
        WHERE is_active = true
        ORDER BY attribute_id
    LOOP
        RAISE NOTICE 'Processing attribute: % (Type: %)', 
                     attr_record.attribute_name, 
                     attr_record.data_type;
        
        -- Handle special case for product_status which has nested CASE
        IF attr_record.attribute_name = 'product_status' THEN
            case_statements := case_statements || format(
                E'\n        CASE\n            WHEN max(\n            CASE\n                WHEN (ea.attribute ->> ''attribute_name''::text) = ''%s''::text THEN (ea.attribute -> ''attribute_value''::text) ->> ''current''::text\n                ELSE NULL::text\n            END)::boolean = true THEN ''Active''::text\n            ELSE ''Inactive''::text\n        END AS %s,',
                attr_record.attribute_name,
                lower(regexp_replace(attr_record.frontend_display_name, '[^a-zA-Z0-9]+', '_', 'g'))
            );
        ELSE
            -- Determine the appropriate casting based on data_type
            CASE attr_record.data_type
                WHEN 'bool' THEN
                    case_statements := case_statements || format(
                        E'\n    max(\n        CASE\n            WHEN (ea.attribute ->> ''attribute_name''::text) = ''%s''::text THEN (ea.attribute -> ''attribute_value''::text) ->> ''current''::text\n            ELSE NULL::text\n        END)::boolean AS %s,',
                        attr_record.attribute_name,
                        lower(regexp_replace(attr_record.frontend_display_name, '[^a-zA-Z0-9]+', '_', 'g'))
                    );
                WHEN 'int4' THEN
                    case_statements := case_statements || format(
                        E'\n    max(\n        CASE\n            WHEN (ea.attribute ->> ''attribute_name''::text) = ''%s''::text THEN ((ea.attribute -> ''attribute_value''::text) ->> ''current''::text)::integer\n            ELSE NULL::integer\n        END) AS %s,',
                        attr_record.attribute_name,
                        lower(regexp_replace(attr_record.frontend_display_name, '[^a-zA-Z0-9]+', '_', 'g'))
                    );
                WHEN 'float8' THEN
                    case_statements := case_statements || format(
                        E'\n    max(\n        CASE\n            WHEN (ea.attribute ->> ''attribute_name''::text) = ''%s''::text THEN ((ea.attribute -> ''attribute_value''::text) ->> ''current''::text)::double precision\n            ELSE NULL::double precision\n        END) AS %s,',
                        attr_record.attribute_name,
                        lower(regexp_replace(attr_record.frontend_display_name, '[^a-zA-Z0-9]+', '_', 'g'))
                    );
                WHEN 'text' THEN
                    case_statements := case_statements || format(
                        E'\n    max(\n        CASE\n            WHEN (ea.attribute ->> ''attribute_name''::text) = ''%s''::text THEN (ea.attribute -> ''attribute_value''::text) ->> ''current''::text\n            ELSE NULL::text\n        END) AS %s,',
                        attr_record.attribute_name,
                        lower(regexp_replace(attr_record.frontend_display_name, '[^a-zA-Z0-9]+', '_', 'g'))
                    );
                ELSE
                    case_statements := case_statements || format(
                        E'\n    max(\n        CASE\n            WHEN (ea.attribute ->> ''attribute_name''::text) = ''%s''::text THEN (ea.attribute -> ''attribute_value''::text) ->> ''current''::text\n            ELSE NULL::text\n        END) AS %s,',
                        attr_record.attribute_name,
                        lower(regexp_replace(attr_record.frontend_display_name, '[^a-zA-Z0-9]+', '_', 'g'))
                    );
            END CASE;
        END IF;
    END LOOP;

    -- Remove trailing comma from the last CASE statement
    IF length(case_statements) > 0 THEN
        case_statements := left(case_statements, length(case_statements) - 1);
    END IF;

    RAISE NOTICE 'Generated CASE statements: %', case_statements;
    
    -- Drop existing MV if exists
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS base_pricing.mv_aggregated_attributes_master';
    
    -- Construct the full MV SQL
    mv_sql := 'CREATE MATERIALIZED VIEW base_pricing.mv_aggregated_attributes_master AS
    WITH active_segments AS (
        SELECT 
            segment_id,
            segment_code,
            segment_name
        FROM base_pricing.bp_customer_segment_master
        WHERE is_active = true
    ),
    product_store_segments AS (
        SELECT 
            pm.product_id,
            sm.store_id,
            seg.segment_id,
            seg.segment_code,
            seg.segment_name,
            sm.s1_name AS channel,
            sm.s1_id AS channel_id,
            pm.l2_cid,
            pm.l4_cid
        FROM base_pricing.bp_product_master pm
        CROSS JOIN base_pricing.bp_store_master sm
        CROSS JOIN active_segments seg
    ),
    valid_product_store_segments AS (
        SELECT 
            pss.product_id,
            pss.store_id,
            pss.segment_id,
            pss.segment_code,
            pss.segment_name,
            pss.channel,
            pss.channel_id,
            pss.l2_cid,
            pss.l4_cid,
            bpsam.zone_structure,
            bpsam.price_zone,
            bpsam.effective_price_zone,
            bpsam.attributes
        FROM product_store_segments pss
        JOIN base_pricing.bp_product_store_attributes_mapping bpsam 
            ON pss.product_id = bpsam.product_id 
            AND pss.store_id = bpsam.store_id
    ),
    extracted_attributes AS (
        SELECT 
            vps.product_id,
            vps.store_id,
            vps.segment_id,
            vps.segment_code,
            vps.segment_name,
            vps.zone_structure,
            vps.price_zone,
            vps.channel_id,
            vps.effective_price_zone,
            jsonb_array_elements(vps.attributes) AS attribute
        FROM valid_product_store_segments vps
    )
    SELECT 
        ea.product_id,
        ea.store_id,
        ea.segment_id,
        ea.segment_code,
        ea.segment_name,
        ea.zone_structure,
        ea.price_zone,
        max(zs.zone_structure_id) AS zone_structure_id,
        max(z.zone_id) AS price_zone_id,
        ea.channel_id,
        ea.effective_price_zone,' || 
        case_statements || '
    FROM extracted_attributes ea
    LEFT JOIN base_pricing.bp_zones z 
        ON ea.price_zone::text = z.zone_name::text AND z.active = true
    LEFT JOIN base_pricing.bp_zone_structure zs 
        ON z.zone_structure_id = zs.zone_structure_id AND zs.active = true
    GROUP BY 
        ea.product_id, 
        ea.store_id, 
        ea.segment_id, 
        ea.segment_code, 
        ea.segment_name,
        ea.zone_structure, 
        ea.price_zone, 
        ea.channel_id, 
        ea.effective_price_zone
    WITH DATA';

    RAISE NOTICE 'Executing MV creation...';
    
    -- Create the new MV
	RAISE NOTICE 'Executing MV creation with SQL (truncated): %', mv_sql;
    BEGIN
        EXECUTE mv_sql;
        RAISE NOTICE 'Materialized view created successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating MV: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    END;
    EXECUTE 'DROP INDEX IF EXISTS base_pricing.idx_product_store_segment_id';
    EXECUTE 'DROP INDEX IF EXISTS base_pricing.unique_product_store_segment_id';
    -- Create indexes
    EXECUTE 'CREATE INDEX idx_product_store_segment_id ON base_pricing.mv_aggregated_attributes_master 
             USING btree (product_id, store_id, segment_id)';
             
    EXECUTE 'CREATE UNIQUE INDEX unique_product_store_segment_id ON base_pricing.mv_aggregated_attributes_master 
             USING btree (product_id, store_id, segment_id)';
             
    RAISE NOTICE 'Function completed successfully';
END;
$function$
;
