--liquibase formatted sql
--changeset bingimalla.divyasree@impactanalytics.co:fn_promo_txn_max_date runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes for fn_promo_txn_max_date

DROP FUNCTION if exists price_promo_opt.fn_promo_txn_max_date;

CREATE OR REPLACE FUNCTION price_promo_opt.fn_promo_txn_max_date()
 RETURNS TABLE(max_date date)
 LANGUAGE plpgsql
AS $function$
DECLARE
    partition_name TEXT;
BEGIN
    -- Find the latest non-empty partition
    SELECT child.relname
    INTO partition_name
    FROM pg_inherits
    JOIN pg_class parent ON parent.oid = inhparent
    JOIN pg_class child ON child.oid = inhrelid
    WHERE parent.relname = 'promo_txn'
      AND parent.relnamespace = 'price_promo_opt'::regnamespace
      AND child.reltuples > 0
    ORDER BY child.relname DESC
    LIMIT 1;

    -- If a partition exists, get its max date_id
    IF partition_name IS NOT NULL THEN
        RETURN QUERY EXECUTE format(
            'SELECT MAX(date_id)::date AS max_date FROM price_promo_opt.%I',
            partition_name
        );
    ELSE
        RETURN QUERY SELECT NULL::date AS max_date;
    END IF;
END;
$function$
;