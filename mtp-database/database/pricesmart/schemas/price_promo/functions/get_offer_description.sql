--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:get_offer_description_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for get_offer_description


-- DROP FUNCTION price_promo.get_offer_description(int4);
Drop function if exists price_promo.get_offer_description();

CREATE OR REPLACE FUNCTION price_promo.get_offer_description(
    discounting_level INTEGER,
    offer_type TEXT,
    offer_x_value NUMERIC,
    offer_x_type TEXT,
    offer_y_value NUMERIC,
    offer_y_type TEXT,
    offer_z_value NUMERIC,
    _tier_id NUMERIC DEFAULT NULL::NUMERIC
)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    description TEXT;
BEGIN
    -- Generate description based on offer type and values
    CASE offer_type
        WHEN 'percent_off' THEN
            description := offer_x_value || '% off';

        WHEN 'extra_amount_off' THEN
            description := '$' || offer_x_value || ' off';

        WHEN 'fixed_price' THEN
            description := 'At $' || offer_x_value;

        WHEN 'bxgy' THEN
            description := 'Buy ' || offer_x_value::INT || ' ' ||
                           ' Get ' || offer_y_value::INT || ' Free';

        WHEN 'bxgy_percent_off' THEN
            description := 'Buy ' || offer_x_value::INT || ' ' ||
                           ' Get ' || offer_y_value::INT || ' At ' || offer_z_value || '% off';

        WHEN 'bmsm' THEN
            CASE
                WHEN offer_x_type = 'unit' AND offer_y_type = 'percent_off' THEN
                    description := 'Buy ' || offer_x_value::INT ||
                                   ' At ' || offer_y_value || '% off';

                WHEN offer_x_type = 'unit' AND offer_y_type = 'dollar_off' THEN
                    description := 'Buy ' || offer_x_value::INT ||
                                   ' Get $' || offer_y_value || ' off';

                WHEN offer_x_type = 'unit' AND offer_y_type = 'dollar' THEN
                    description := 'Buy ' || offer_x_value::INT ||
                                   ' At $' || offer_y_value;

                WHEN offer_x_type = 'dollar' AND offer_y_type = 'percent_off' THEN
                    description := 'Buy $' || offer_x_value ||
                                   ' At ' || offer_y_value || '% off';

                WHEN offer_x_type = 'dollar' AND offer_y_type = 'dollar_off' THEN
                    description := 'Buy $' || offer_x_value ||
                                   ' Get $' || offer_y_value || ' off';

                ELSE
                    description := 'Invalid BMSM combination';
            END CASE;

        WHEN 'tiered_offer' THEN
            description := 'Tiered offer';

        ELSE
            description := 'Invalid offer type';
    END CASE;

    RETURN description;
END;
$function$;
