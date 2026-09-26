--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_passive_final_prices_product_data_updated stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: changeset for base_pricing_restaurant.sp_passive_final_prices_product_data_updated

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_passive_final_prices_product_data_updated;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_passive_final_prices_product_data_updated(IN table_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    segment_codes text[];
    final_price_selection text := '';
    source_price_selection text := '';
    seg text;
BEGIN
    start_time := clock_timestamp();
    -- Fetch active segment codes
    SELECT array_agg(segment_code) INTO segment_codes
    FROM base_pricing_restaurant.bp_customer_segment_master
    WHERE is_active IS TRUE;
    -- Finalized price selection string
    FOREACH seg IN ARRAY segment_codes LOOP
        final_price_selection := final_price_selection ||
        format(
    ',
    CASE WHEN pre_price = TRUE
    THEN %s_price
    ELSE %s_price_final
    END AS %s_price_final'
            , seg, seg, seg
        );
    END LOOP;
    -- Source price selection string
    IF table_type = 'inactive' THEN
        FOREACH seg IN ARRAY segment_codes LOOP
            source_price_selection := source_price_selection ||
        format(
    ',
    %s_price'
            , seg
        );
        END LOOP;
    END IF;
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing_restaurant.temp_passive_final_prices_product_data_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_passive_final_prices_product_data_%s AS
SELECT
    product_id,
    line_group,
    pre_price,
    price_freeze
    -- FINAL PRICES
    %s
    -- SOURCE PRICES
    %s
FROM
    base_pricing_restaurant.temp_passive_final_prices_product_data_raw_%s AS pfppdr;
-- INDEX creation
CREATE INDEX idx_temp_passive_final_prices_product_data_%s_id1
    ON base_pricing_restaurant.temp_passive_final_prices_product_data_%s (product_id);
CREATE INDEX idx_temp_passive_final_prices_product_data_%s_id2
    ON base_pricing_restaurant.temp_passive_final_prices_product_data_%s (line_group);
$query$,
    -- TABLE
    table_type,
    table_type,
    final_price_selection,
    source_price_selection,
    table_type,
    -- INDEX
    table_type,
    table_type,
    table_type,
    table_type
);
    RAISE NOTICE 'Creating temp_passive_final_prices_product_data_% : %', table_type, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating temp_passive_final_prices_product_data_% : %', table_type, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, 'sp_passive_final_prices_product_data_updated - ' || table_type, start_time, end_time, end_time - start_time);
END;
$procedure$
;