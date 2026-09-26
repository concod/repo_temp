--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_get_max_usage_period runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_get_max_usage_period

drop function if exists price_promo.fn_get_max_usage_period;
CREATE OR REPLACE FUNCTION price_promo.fn_get_max_usage_period(
    p_start_date DATE, 
    p_end_date DATE, 
    p_return_key TEXT
)
RETURNS INT AS $$
DECLARE
    _days_used_start_year INT;
    _days_used_end_year INT;
BEGIN
    IF p_return_key = 'month' THEN
        IF EXTRACT(DAY FROM p_start_date) >= EXTRACT(DAY FROM p_end_date) THEN
            RETURN EXTRACT(MONTH FROM p_start_date)::INT;
        ELSE
            RETURN EXTRACT(MONTH FROM p_end_date)::INT;
        END IF;
    ELSIF p_return_key = 'year' THEN
        _days_used_start_year := price_promo.fn_get_days_used_in_year(p_start_date);
        _days_used_end_year := price_promo.fn_get_days_used_in_year(p_end_date);
        IF _days_used_start_year >= _days_used_end_year THEN
            RETURN EXTRACT(YEAR FROM p_start_date)::INT;
        ELSE
            RETURN EXTRACT(YEAR FROM p_end_date)::INT;
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid return_key. Use ''month'' or ''year''.';
    END IF;
END;
$$ LANGUAGE plpgsql;
