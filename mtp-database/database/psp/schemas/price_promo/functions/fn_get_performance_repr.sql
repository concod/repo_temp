--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_get_performance_repr runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_get_performance_repr

drop function if exists price_promo.fn_get_performance_repr;
CREATE OR REPLACE FUNCTION price_promo.fn_get_performance_repr(
    performance_value NUMERIC
)
RETURNS TEXT AS $$
DECLARE
BEGIN
    IF performance_value IS NULL THEN
        RETURN NULL;
    ELSIF performance_value < 0 THEN
        RETURN 'Dilutive';
    ELSIF performance_value >= 0 AND performance_value < 1 THEN
        RETURN 'Neutral';
    ELSE
        RETURN 'Good';
    END IF;
END;
$$ LANGUAGE plpgsql;