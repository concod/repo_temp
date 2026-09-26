--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.add_season_code liquibase:add_season_code runOnChange:true stripComments:false splitStatements:false context:add_season_code labels:liquibase_project_start
--comment: Adding season_code column to line_plan_image_upload table
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
            auc,
            air,
            season_code
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
            NULLIF(record->>'auc', 'null')::float,
            NULLIF(record->>'air', 'null')::float,
            NULLIF(record->>'season_code', 'null')::int4

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
            auc = EXCLUDED.auc,
            air = EXCLUDED.air,
            season_code = EXCLUDED.season_code,
            updated_at = CURRENT_TIMESTAMP;

        RAISE NOTICE 'Line plan image upload processed for article: %, style_id: %', 
            record->>'article', record->>'style_id';
    END LOOP;
    
    RAISE NOTICE 'Function completed successfully';
END;
$function$
;
