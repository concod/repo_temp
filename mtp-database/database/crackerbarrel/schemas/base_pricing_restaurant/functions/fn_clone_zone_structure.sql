--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:fn_clone_zone_structure_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_clone_zone_structure_2

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_clone_zone_structure;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_clone_zone_structure(original_zone_structure_id integer, new_structure_name character varying, new_input_type character varying, default_price_zone character varying, cell_render_params jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_zone_structure_id INT;
    original_zone RECORD;
    new_zone_id INT;
    zone_names JSONB := '[]'; -- Initialize as a JSONB array
    default_data_type text := 'text';
    orig_metadata RECORD;
BEGIN
    -- Step 1: Insert new structure into base_pricing_restaurant.bp_zone_structure
    INSERT INTO base_pricing_restaurant.bp_zone_structure (structure_name, active, input_type)
    SELECT new_structure_name, active, new_input_type
    FROM base_pricing_restaurant.bp_zone_structure
    WHERE zone_structure_id = original_zone_structure_id
    RETURNING zone_structure_id INTO new_zone_structure_id;

    -- Step 2: Clone each zone with a new ID
    FOR original_zone IN
        SELECT zone_id, zone_name, active
        FROM base_pricing_restaurant.bp_zones
        WHERE zone_structure_id = original_zone_structure_id
    LOOP
        -- Insert new zone with a unique ID
        INSERT INTO base_pricing_restaurant.bp_zones (zone_name, zone_structure_id, active)
        VALUES (original_zone.zone_name, new_zone_structure_id, original_zone.active)
        RETURNING zone_id INTO new_zone_id;

        -- Append zone name to JSONB array
        zone_names := zone_names || to_jsonb(original_zone.zone_name);

        -- Step 3: Clone store-zone mappings with the new zone_id
        INSERT INTO base_pricing_restaurant.bp_store_zone_mapping (store_id, zone_id, zone_structure_id)
        SELECT store_id, new_zone_id, new_zone_structure_id
        FROM base_pricing_restaurant.bp_store_zone_mapping
        WHERE zone_id = original_zone.zone_id
          AND zone_structure_id = original_zone_structure_id;
    END LOOP;
    SELECT
        pam.input_validation_ids,
        pam.cell_render_type,
        pam.cell_render_params
    INTO orig_metadata
    FROM base_pricing_restaurant.bp_store_attributes_metadata pam
    WHERE pam.attribute_name = (
        SELECT structure_name
        FROM base_pricing_restaurant.bp_zone_structure
        WHERE zone_structure_id = original_zone_structure_id
    );
    -- Step 4: Insert metadata for the new structure
    INSERT INTO base_pricing_restaurant.bp_store_attributes_metadata
        (attribute_name, frontend_display_name, data_type, input_type, input_values, input_validation_ids, is_static, is_dynamic, is_editable_from_app, is_editable_from_file, is_resettable, is_active, created_at, updated_at, is_filterable, cell_render_params,cell_render_type)
    VALUES
        (new_structure_name, new_structure_name, default_data_type, new_input_type, zone_names::jsonb, COALESCE(orig_metadata.input_validation_ids, ARRAY[]::integer[]), false, true, true, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true, cell_render_params
            ,CASE
                WHEN new_input_type = 'dropdown' THEN 'SELECT'
                WHEN new_input_type = 'text' THEN ''
                ELSE orig_metadata.cell_render_type
            END);

    -- Step 5: Update store attributes mapping
    UPDATE base_pricing_restaurant.bp_store_attributes_mapping
    SET attributes = attributes || jsonb_build_array(
        jsonb_build_object(
            'attribute_name', new_structure_name,
            'attribute_value', jsonb_build_object(
                'current', default_price_zone,
                'initial', default_price_zone
            )
        )
    );

    -- Return the new zone structure ID for confirmation
    RETURN new_zone_structure_id;
END;
$function$
;