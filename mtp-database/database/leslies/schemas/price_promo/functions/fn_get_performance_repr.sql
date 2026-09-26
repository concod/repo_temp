--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_get_performance_repr runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_get_performance_repr

drop function if exists price_promo.fn_get_performance_repr;
CREATE OR REPLACE FUNCTION price_promo.fn_get_performance_repr(
    performance_value NUMERIC
)
RETURNS TEXT AS $$
DECLARE
    PERFORMANCE_COMPARISON_VALUE NUMERIC := 5;
BEGIN
    IF performance_value IS NULL THEN
        RETURN NULL;
    ELSIF performance_value < -PERFORMANCE_COMPARISON_VALUE THEN
        RETURN 'Dilutive';
    ELSIF performance_value BETWEEN -PERFORMANCE_COMPARISON_VALUE AND PERFORMANCE_COMPARISON_VALUE THEN
        RETURN 'Average';
    ELSE
        RETURN 'Good';
    END IF;
END;
$$ LANGUAGE plpgsql;