--liquibase formatted sql
--changeset saran.srirama@impactanalytics.co:division_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-31143
--comment: division function initial changes used in listing
--rollback: SELECT 1
DROP FUNCTION IF EXISTS meta_schema.division(float8, float8);
CREATE OR REPLACE FUNCTION meta_schema.division(a double precision, b double precision)
 RETURNS double precision
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF b = 0 THEN
RETURN NULLIF(a / NULLIF(b, 0), NULL);
    ELSE
        RETURN a / b;
    END IF;
END;
$function$
;
