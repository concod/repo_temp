--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_passive_final_prices_product_filter stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: changeset for base_pricing_restaurant.sp_passive_final_prices_product_filter

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_passive_final_prices_product_filter;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_passive_final_prices_product_filter(IN table_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    check_condition text;
BEGIN
    start_time := clock_timestamp();
    -- SET logical condition
    IF table_type = 'active'
        THEN check_condition := 'active IS TRUE AND usable IS TRUE';
        ELSE check_condition := 'active IS FALSE OR usable IS FALSE';
    END IF;
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing_restaurant.temp_passive_final_prices_product_filter_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_passive_final_prices_product_filter_%s AS
SELECT
    bpm.product_id
FROM
    base_pricing_restaurant.bp_product_master bpm
WHERE
    %s;
-- INDEX creation
CREATE INDEX idx_temp_passive_final_prices_product_filter_%s_id1
    ON base_pricing_restaurant.temp_passive_final_prices_product_filter_%s (product_id);
$query$,
    -- TABLE
    table_type,
    table_type,
    check_condition,
    -- INDEX
    table_type,
    table_type
);
    RAISE NOTICE 'Creating temp_passive_final_prices_products_filter_% : %', table_type, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating temp_passive_final_prices_product_filter_% : %', table_type, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, 'sp_passive_final_prices_product_filter - ' || table_type, start_time, end_time, end_time - start_time);
END;
$procedure$
;