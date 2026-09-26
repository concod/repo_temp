--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_fetch_pricing_with_max_usage runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_fetch_pricing_with_max_usage

drop function if exists price_promo.fn_fetch_pricing_with_max_usage;
CREATE OR REPLACE FUNCTION price_promo.fn_fetch_pricing_with_max_usage(
    p_start_date DATE, 
    p_end_date DATE
)
RETURNS jsonb AS $$
DECLARE
    _month INT;
    _year INT;
    _pricing jsonb;
BEGIN
    IF EXTRACT(YEAR FROM p_start_date) = EXTRACT(YEAR FROM p_end_date) AND 
       EXTRACT(MONTH FROM p_start_date) < EXTRACT(MONTH FROM p_end_date) THEN
        _month := price_promo.fn_get_max_usage_period(p_start_date, p_end_date, 'month');
        _year := EXTRACT(YEAR FROM p_start_date)::INT;
    ELSIF EXTRACT(YEAR FROM p_start_date) = EXTRACT(YEAR FROM p_end_date) AND 
          EXTRACT(MONTH FROM p_start_date) = EXTRACT(MONTH FROM p_end_date) THEN
        _month := EXTRACT(MONTH FROM p_start_date)::INT;
        _year := EXTRACT(YEAR FROM p_start_date)::INT;
    ELSE
        _month := price_promo.fn_get_max_usage_period(p_start_date, p_end_date, 'month');
        _year := price_promo.fn_get_max_usage_period(p_start_date, p_end_date, 'year');
    END IF;

    SELECT 
        jsonb_build_object(
        'weighted_base_price',weighted_base_price, 
        'weighted_cost_price',weighted_cost_price 
        ) into _pricing
    FROM price_promo.tb_placeholder_pricing
    WHERE 
        month = _month
        AND year = _year;

    return _pricing;
END;
$$ LANGUAGE plpgsql;
