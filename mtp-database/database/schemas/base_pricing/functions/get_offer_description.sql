--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:get_offer_description runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for get_offer_description


-- DROP FUNCTION base_pricing.get_offer_description(int4);
Drop function if exists base_pricing.get_offer_description();

CREATE OR REPLACE FUNCTION base_pricing.get_offer_description(discounting_level integer, offer_type text, offer_x_value numeric, offer_x_type text, offer_y_value numeric, offer_y_type text, offer_z_value numeric, _tier_id numeric DEFAULT NULL::numeric)
 RETURNS text
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
            description := 'Buy ' || offer_x_value::int || ' ' ||
                           CASE WHEN offer_x_value = 1 THEN 'unit' ELSE 'units' END ||
                           ' Get ' || offer_y_value::int || ' ' ||
                           CASE WHEN offer_y_value = 1 THEN 'unit' ELSE 'units' END || ' for free';
        WHEN 'bxgy_percent_off' THEN
            description := 'Buy ' || offer_x_value::int || ' ' ||
                           CASE WHEN offer_x_value = 1 THEN 'unit' ELSE 'units' END ||
                           ' Get ' || offer_y_value::int || ' ' ||
                           CASE WHEN offer_y_value = 1 THEN 'unit' ELSE 'units' END ||
                           ' At ' || offer_z_value || '% off';
        WHEN 'bmsm' THEN
            CASE
                WHEN offer_x_type = 'unit' AND offer_y_type = 'percent_off' THEN
                    description := 'Buy ' || offer_x_value::int || ' unit' ||
                                   CASE WHEN offer_x_value > 1 THEN 's' ELSE '' END ||
                                   ' at ' || offer_y_value || '% off';
                WHEN offer_x_type = 'unit' AND offer_y_type = 'extra_amount_off' THEN
                    description := 'Buy ' || offer_x_value::int || ' unit' ||
                                   CASE WHEN offer_x_value > 1 THEN 's' ELSE '' END ||
                                   ' get $' || offer_y_value || ' off';
                WHEN offer_x_type = 'unit' AND offer_y_type = 'fixed_price' THEN
                    description := 'Buy ' || offer_x_value::int || ' unit' ||
                                   CASE WHEN offer_x_value > 1 THEN 's' ELSE '' END ||
                                   ' at $' || offer_y_value;
                WHEN offer_x_type = 'dollar' AND offer_y_type = 'percent_off' THEN
                    description := 'Buy $' || offer_x_value ||
                                   ' at ' || offer_y_value || '% off';
                WHEN offer_x_type = 'dollar' AND offer_y_type = 'extra_amount_off' THEN
                    description := 'Buy $' || offer_x_value ||
                                   ' get $' || offer_y_value|| ' off';
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
$function$
;
