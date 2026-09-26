--liquibase formatted sql
--changeset nikhil.shet@impactanalytics.co:get_offer_description_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for get_offer_description_v2

-- Purpose: Formats promotional offer descriptions into human-readable text based on offer type and parameters
--
-- Example:
--   SELECT price_promo.get_offer_description_v2(
--     offer_type => 'bxgy_percent_off',
--     offer_x_value => 2,
--     offer_x_type => 'unit',
--     offer_y_value => 1,
--     offer_y_type => 'unit',
--     offer_z_value => 50,
--     _tier_id => NULL,
--     special_offer_data => NULL
--   ); -- Returns: 'Buy 2 Get 1 At 50% off'
--
-- Returns: TEXT containing formatted offer description supporting:
--   Standard offers (percent/amount off, fixed price),
--   Complex offers (BXGY, BMSM, tiered),
--   Special offers (from special_offer_data JSON)

DROP FUNCTION IF EXISTS price_promo.get_offer_description_v2(text, numeric, text, numeric, text, numeric, numeric, jsonb);

CREATE OR REPLACE FUNCTION price_promo.get_offer_description_v2(offer_type text, offer_x_value numeric, offer_x_type text, offer_y_value numeric, offer_y_type text, offer_z_value numeric, _tier_id numeric DEFAULT NULL::numeric, special_offer_data jsonb DEFAULT NULL::jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    description TEXT;
    reach TEXT := '';
    redemption TEXT := '';
    special_name TEXT := NULL;
    special_type TEXT := NULL;
    special_value TEXT := NULL;
BEGIN
    -- Handle special_offer_data if present
    IF special_offer_data IS NOT NULL THEN
        special_name := special_offer_data->>'name';
        special_type := special_offer_data->>'discount_type';
        special_value := special_offer_data->>'discount_value';

        IF special_name IS NOT NULL AND special_type IS NOT NULL AND special_value IS NOT NULL THEN
            description := special_name || ' - ' || 
                CASE 
                    WHEN special_type = 'percent_off' THEN special_value || '% off'
                    WHEN special_type = 'dollar_off' THEN '$' || special_value || ' off'
                    WHEN special_type = 'fixed_price' THEN 'At $' || special_value
                    ELSE special_value
                END;
            RETURN description;
        END IF;
    END IF;

    -- Fallback to standard offer types
    CASE offer_type
        WHEN 'reg_price' then
            description := 'Reg Price';

        WHEN 'percent_off' THEN
            description := offer_x_value || '% off';
        
        WHEN 'upto_x_percent_off' THEN
            description := offer_x_value || '% off';
        
        WHEN 'extra_amount_off' THEN
            description := '$' || offer_x_value || ' off';

        WHEN 'fixed_price' THEN
            description := 'At $' || offer_x_value;

        WHEN 'bxgy' THEN
            description := 'Buy ' || offer_x_value::INT || ' Get ' || offer_y_value::INT || ' Free';

        WHEN 'bxgx' THEN
            description := 'Buy ' || offer_x_value::INT || ' Get ' || offer_y_value::INT || ' Free';

        WHEN 'bxgy_percent_off' THEN
            description := 'Buy ' || offer_x_value::INT || ' Get ' || offer_y_value::INT || ' At ' || offer_z_value || '% off';

        WHEN 'bxgx_percent_off' THEN
            description := 'Buy ' || offer_x_value::INT || ' Get ' || offer_y_value::INT || ' At ' || offer_z_value || '% off';

        WHEN 'bmsm' THEN
            CASE
                WHEN offer_x_type = 'unit' AND offer_y_type = 'percent_off' THEN
                    description := 'Buy ' || offer_x_value::INT || ' At ' || offer_y_value || '% off';

                WHEN offer_x_type = 'unit' AND offer_y_type = 'dollar_off' THEN
                    description := 'Buy ' || offer_x_value::INT || ' Get $' || offer_y_value || ' off';

                WHEN offer_x_type = 'unit' AND offer_y_type = 'at_dollar' THEN
                    description := 'Buy ' || offer_x_value::INT || ' At $' || offer_y_value;

                WHEN offer_x_type = 'dollar' AND offer_y_type = 'percent_off' THEN
                    description := 'Buy $' || offer_x_value || ' At ' || offer_y_value || '% off';

                WHEN offer_x_type = 'dollar' AND offer_y_type = 'dollar_off' THEN
                    description := 'Buy $' || offer_x_value || ' Get $' || offer_y_value || ' off';

                ELSE
                    description := 'Invalid BMSM combination';
            END CASE;

        WHEN 'bmsm_fixed_quantity' THEN
            CASE
                WHEN offer_x_type = 'unit' AND offer_y_type = 'percent_off' THEN
                    description := 'Buy ' || offer_x_value::INT || ' At ' || offer_y_value || '% off';

                WHEN offer_x_type = 'unit' AND offer_y_type = 'dollar_off' THEN
                    description := 'Buy ' || offer_x_value::INT || ' Get $' || offer_y_value || ' off';

                WHEN offer_x_type = 'unit' AND offer_y_type = 'at_dollar' THEN
                    description := 'Buy ' || offer_x_value::INT || ' At $' || offer_y_value;

                ELSE
                    description := 'Invalid BMSM Fixed Quantity combination';
            END CASE;

        WHEN 'bmsm_transaction_discount' THEN
            CASE
                WHEN offer_x_type = 'dollar' AND offer_y_type = 'percent_off' THEN
                    description := 'Buy $' || offer_x_value || ' At ' || offer_y_value || '% off';

                WHEN offer_x_type = 'dollar' AND offer_y_type = 'dollar_off' THEN
                    description := 'Buy $' || offer_x_value || ' Get $' || offer_y_value || ' off';

                ELSE
                    description := 'Invalid BMSM Transaction Discount combination';
            END CASE;

		WHEN 'kit_offer' THEN
		    DECLARE
		        ko_record RECORD;
		        kot_display TEXT;
		        unit_list TEXT := '';
		        unit_rec RECORD;
		    BEGIN
		        SELECT ko.kit_offer_id,
		               ko.total_number_of_units,
		               ko.discount_value,
		               ko.kit_offer_type_id,
		               kot.display_name
		        INTO ko_record
		        FROM price_promo.tb_kit_offer ko
		        JOIN price_promo.tb_kit_offer_type kot USING (kit_offer_type_id)
		        WHERE ko.kit_offer_id = offer_x_value::INT;
		
		        FOR unit_rec IN
		            SELECT unit_name, units_count
		            FROM price_promo.tb_kit_offer_units
		            WHERE kit_offer_id = offer_x_value::INT
		            ORDER BY unit_name
		        LOOP
		            unit_list := unit_list ||
		                CASE WHEN unit_list = '' THEN '' ELSE ' and ' END ||
		                unit_rec.units_count || ' Product ' || unit_rec.unit_name;
		        END LOOP;
		
		        description := 'Buy ' || unit_list || ' ' ||
		            CASE 
		                WHEN ko_record.kit_offer_type_id IN (1, 2) THEN 
		                    'At ' || ko_record.discount_value || ko_record.display_name
		                ELSE 
		                    ko_record.display_name || ko_record.discount_value
		            END;
		    END;

        WHEN 'tiered_offer' THEN
            description := 'Tiered offer';

        ELSE
            description := 'Invalid offer type';
    END CASE;

    RETURN description;
END;
$function$
;
