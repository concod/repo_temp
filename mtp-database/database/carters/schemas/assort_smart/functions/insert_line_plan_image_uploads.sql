--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co_update_sp liquibase:insert_line_plan_image_uploads_added_channel runOnChange:true stripComments:false splitStatements:false context:MTP-73117 labels:liquibase_project_start
--comment: Updating SP insert_line_plan_image_uploads MTP-73117
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.insert_line_plan_image_uploads(jsonb);

CREATE OR REPLACE FUNCTION assort_smart.insert_line_plan_image_uploads(json_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    record JSONB;  -- Declare a JSONB variable to hold each JSON record
BEGIN
    RAISE NOTICE 'Function called with data: %', json_data;  -- Log the incoming data

    FOR record IN SELECT * FROM jsonb_array_elements(json_data) AS r LOOP
        RAISE NOTICE 'Processing record: %', record;  -- Log each record being processed

        -- Attempt to insert the record
        INSERT INTO assort_smart.line_plan_image_upload (hierarchy_code, style_name, color_id, style_id, article, tableau_image_link,channel, attributes)
        VALUES (
            (record->>'hierarchy_code')::TEXT,
            (record->>'style_name')::TEXT,
            NULLIF((record->>'color_id')::TEXT, 'null'),  -- Insert NULL if color_id is 'null' or not provided
            NULLIF((record->>'style_id')::TEXT, 'null'),  -- Corrected syntax for style_id
            (record->>'article')::TEXT,
            (record->>'tableau_image_link')::TEXT,
            (record->>'channel')::TEXT,
            (record->>'attributes')::JSONB
        )
        ON CONFLICT (style_id,  hierarchy_code)  -- Ensure this matches your unique constraint
        DO UPDATE SET 
            tableau_image_link = EXCLUDED.tableau_image_link,
            style_name = EXCLUDED.style_name,
            article = EXCLUDED.article,
            channel=EXCLUDED.channel,
            attributes = EXCLUDED.attributes;  -- Update existing record

        -- Log existing records check
        RAISE NOTICE 'Checking for existing records for style_id: %, color_id: %, hierarchy_code: %',
            NULLIF((record->>'style_id')::TEXT, 'null'),
            NULLIF((record->>'color_id')::TEXT, 'null'),
            (record->>'hierarchy_code')::TEXT;

        -- Check if the record already exists and matches the incoming data
        IF EXISTS (
            SELECT 1
            FROM assort_smart.line_plan_image_upload
            WHERE style_id = NULLIF((record->>'style_id')::TEXT, 'null')
              AND color_id = NULLIF((record->>'color_id')::TEXT, 'null')
              AND hierarchy_code = (record->>'hierarchy_code')::TEXT
        ) THEN
            RAISE NOTICE 'Record already exists and matches the incoming data. No action taken for style_id: %', record->>'style_id';
        ELSE
            RAISE NOTICE 'Line plan image upload insertion completed for style_id: %', record->>'style_id';
        END IF;
    END LOOP;
END;
$function$
;
