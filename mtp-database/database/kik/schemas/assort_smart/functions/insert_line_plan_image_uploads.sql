--liquibase formatted sql
--changeset rishabh@impactanalytics.co:MTP-124941 runOnChange:true stripComments:false splitStatements:false context:rename_image_name_url_to_tableau_image_link labels:rename_columns
--comment: Rename image_name_url to tableau_image_link to match frontend configuration
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.insert_line_plan_image_uploads(jsonb);

CREATE OR REPLACE FUNCTION assort_smart.insert_line_plan_image_uploads(json_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    record JSONB;
BEGIN
    RAISE NOTICE 'Function called with data: %', json_data;

    FOR record IN SELECT * FROM jsonb_array_elements(json_data) AS r LOOP
        RAISE NOTICE 'Processing record: %', record;

        INSERT INTO assort_smart.line_plan_image_upload(
            hierarchy_code, 
            style_id, 
            style_color,
            article, 
            tableau_image_link, 
            attributes, 
            min_per_order, 
            relevant_size,
            size_range_type, 
            marketing,
            channel,
            color_name,
            style_name,
            color_id,
            aic,
            air,
            product_type,
            existing_rebel_id,
            wholesale_cost,
            expected_launch_date,
            notes,
            launch_date_embargo,
            half_sizes_available,
            range,
            fit,
            width,
            season,
            license,
            pattern,
            material,
            down_ratio,
            season_year,
            thread_count,
            value_stream,
            color_family,
            country_of_origin,
            price_architecture,
            available_size_range,
            material_composition,
            sustainability
        )
        VALUES (
            (record->>'hierarchy_code')::TEXT,
            NULLIF((record->>'style_id')::TEXT, 'null'),
            NULLIF((record->>'style_color')::TEXT, 'null'),
            NULLIF((record->>'article')::TEXT, 'null'),
            (record->>'tableau_image_link')::TEXT,
            (record->>'attributes')::JSONB,
            NULLIF((record->>'min_per_order')::TEXT, 'null'), 
            NULLIF((record->>'relevant_size')::TEXT, 'null'), 
            NULLIF((record->>'size_range_type')::TEXT, 'null'),
            NULLIF((record->>'marketing')::TEXT, 'null'),
            NULLIF((record->>'channel')::TEXT, 'null'),
            NULLIF((record->>'color_name')::TEXT, 'null'), 
            NULLIF((record->>'style_name')::TEXT, 'null'), 
            NULLIF((record->>'color_id')::TEXT, 'null'),
            ROUND(NULLIF(record->>'aic', 'null')::numeric, 2),
            ROUND(NULLIF(record->>'air', 'null')::numeric, 2),
            NULLIF((record->>'product_type')::TEXT, 'null'),
            NULLIF((record->>'existing_rebel_id')::TEXT, 'null'),
            NULLIF(record->>'wholesale_cost', 'null')::float8,
            NULLIF((record->>'expected_launch_date')::TEXT, 'null')::TIMESTAMP,
            NULLIF((record->>'notes')::TEXT, 'null'),
            NULLIF((record->>'launch_date_embargo')::TEXT, 'null')::TIMESTAMP,
            NULLIF((record->>'half_sizes_available')::TEXT, 'null')::BOOLEAN,
            NULLIF((record->>'range')::TEXT, 'null'),
            NULLIF((record->>'fit')::TEXT, 'null'),
            NULLIF((record->>'width')::TEXT, 'null'),
            NULLIF((record->>'season')::TEXT, 'null'),
            NULLIF((record->>'license')::TEXT, 'null'),
            NULLIF((record->>'pattern')::TEXT, 'null'),
            NULLIF((record->>'material')::TEXT, 'null'),
            NULLIF((record->>'down_ratio')::TEXT, 'null'),
            NULLIF((record->>'season_year')::TEXT, 'null'),
            NULLIF((record->>'thread_count')::TEXT, 'null'),
            NULLIF((record->>'value_stream')::TEXT, 'null'),
            NULLIF((record->>'color_family')::TEXT, 'null'),
            NULLIF((record->>'country_of_origin')::TEXT, 'null'),
            NULLIF((record->>'price_architecture')::TEXT, 'null'),
            NULLIF((record->>'available_size_range')::TEXT, 'null'),
            NULLIF((record->>'material_composition')::TEXT, 'null'),
            NULLIF((record->>'sustainability')::TEXT, 'null')
        )
        ON CONFLICT (style_color, hierarchy_code)
        DO UPDATE SET 
            tableau_image_link = EXCLUDED.tableau_image_link,
            style_id = EXCLUDED.style_id,
            min_per_order = EXCLUDED.min_per_order,
            relevant_size = EXCLUDED.relevant_size,
            size_range_type = EXCLUDED.size_range_type,
            marketing = EXCLUDED.marketing,
            attributes = EXCLUDED.attributes,
            color_name = EXCLUDED.color_name,
            style_name = EXCLUDED.style_name,
            color_id = EXCLUDED.color_id,
            channel = EXCLUDED.channel,
            aic = EXCLUDED.aic,
            air = EXCLUDED.air,
            updated_at = CURRENT_TIMESTAMP,
            product_type = EXCLUDED.product_type,
            existing_rebel_id = EXCLUDED.existing_rebel_id,
            wholesale_cost = EXCLUDED.wholesale_cost,
            expected_launch_date = EXCLUDED.expected_launch_date,
            notes = EXCLUDED.notes,
            launch_date_embargo = EXCLUDED.launch_date_embargo,
            half_sizes_available = EXCLUDED.half_sizes_available,
            range = EXCLUDED.range,
            fit = EXCLUDED.fit,
            width = EXCLUDED.width,
            season = EXCLUDED.season,
            license = EXCLUDED.license,
            pattern = EXCLUDED.pattern,
            material = EXCLUDED.material,
            down_ratio = EXCLUDED.down_ratio,
            season_year = EXCLUDED.season_year,
            thread_count = EXCLUDED.thread_count,
            value_stream = EXCLUDED.value_stream,
            color_family = EXCLUDED.color_family,
            country_of_origin = EXCLUDED.country_of_origin,
            price_architecture = EXCLUDED.price_architecture,
            available_size_range = EXCLUDED.available_size_range,
            material_composition = EXCLUDED.material_composition,
            sustainability = EXCLUDED.sustainability;

        RAISE NOTICE 'Line plan image upload processed for article: %, style_id: %', 
            record->>'article', record->>'style_id';
    END LOOP;
    
    RAISE NOTICE 'Function completed successfully';
END;
$function$
;
