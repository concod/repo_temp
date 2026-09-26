--liquibase formatted sql
--changeset narendren.saravanan@impactanalytics.co:fn_get_default_scenario_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add fn_get_default_scenario_data function for offer type default logic

DROP FUNCTION IF EXISTS price_promo.fn_get_default_scenario_data;

CREATE OR REPLACE FUNCTION price_promo.fn_get_default_scenario_data(
    p_offer_type VARCHAR,
    product_base_price NUMERIC
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    v_offer_x_value NUMERIC;
    v_offer_x_type VARCHAR;
    v_offer_y_value NUMERIC;
    v_offer_y_type VARCHAR;
    v_offer_z_value NUMERIC;
    v_offer_z_type VARCHAR;
    v_offer_value TEXT;
    v_result JSONB;
BEGIN

    raise notice 'p_offer_type: %', p_offer_type;
    raise notice 'product_base_price: %', product_base_price;

    -- Initialize all values to null (common default)
    v_offer_x_value := null;
    v_offer_x_type := null;
    v_offer_y_value := null;
    v_offer_y_type := null;
    v_offer_z_value := null;
    v_offer_z_type := null;
    
    -- Set specific values based on offer type
    CASE p_offer_type            
        WHEN 'percent_off', 'reg_price', 'extra_amount_off' THEN
            v_offer_x_value := 0;
            
        WHEN 'fixed_price' THEN
            v_offer_x_value := product_base_price;
            
        WHEN 'bxgy' THEN
            v_offer_x_value := 2;
            v_offer_x_type := 'unit';
            v_offer_y_value := 1;
            v_offer_y_type := 'unit';
            
        WHEN 'bxgy_percent_off' THEN
            v_offer_x_value := 2;
            v_offer_x_type := 'unit';
            v_offer_y_value := 1;
            v_offer_y_type := 'unit';
            v_offer_z_value := 50;
            
        WHEN 'bmsm' THEN
            v_offer_x_value := 2;
            v_offer_x_type := 'unit';
            v_offer_y_value := 5;
            v_offer_y_type := 'percent_off';
    END CASE;
    
    -- Generate offer value description using get_offer_description_v2
    v_offer_value := price_promo.get_offer_description_v2(
        p_offer_type,
        v_offer_x_value,
        v_offer_x_type,
        v_offer_y_value,
        v_offer_y_type,
        v_offer_z_value,
        null, -- tier_id
        null  -- special_offer_data
    );
    
    -- Build the result JSON object
    v_result := jsonb_build_object(
        'offer_type', p_offer_type,
        'offer_value', v_offer_value,
        'offer_x_type', v_offer_x_type,
        'offer_x_value', v_offer_x_value,
        'offer_y_type', v_offer_y_type,
        'offer_y_value', v_offer_y_value,
        'offer_z_type', v_offer_z_type,
        'offer_z_value', v_offer_z_value
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Raise error and return empty JSON
        RAISE EXCEPTION 'Error in fn_get_default_scenario_data: %', SQLERRM;
END;
$function$;
