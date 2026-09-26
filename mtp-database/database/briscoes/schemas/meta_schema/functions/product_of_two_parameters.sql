--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:product_of_two_parameters_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:Update_product
--comment: product_of_two_parameters function initial changes used in listing
--rollback: SELECT 1
DROP FUNCTION IF EXISTS meta_schema.product_of_two_parameters(float8, float8);
CREATE OR REPLACE FUNCTION meta_schema.product_of_two_parameters(input_value double precision, divisor double precision)
 RETURNS double precision
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN input_value * divisor;
END;
$function$
;
