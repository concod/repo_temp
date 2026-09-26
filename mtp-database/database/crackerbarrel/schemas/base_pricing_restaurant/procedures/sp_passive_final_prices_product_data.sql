--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_passive_final_prices_product_data stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: changeset for base_pricing_restaurant.sp_passive_final_prices_product_data

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_passive_final_prices_product_data;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_passive_final_prices_product_data(IN table_type text, IN table_suffix text DEFAULT ''::text)
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
    -- Final price selection string
    FOREACH seg IN ARRAY segment_codes LOOP
        final_price_selection := final_price_selection ||
        format(
    ',
    (
        SELECT attr->''attribute_value''->>''current''
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>''attribute_name'' = ''%s_price_final''
    )::numeric AS %s_price_final'
            , seg, seg
        );
    END LOOP;
    -- Source price selection string
    IF table_type = 'inactive' THEN
        FOREACH seg IN ARRAY segment_codes LOOP
            source_price_selection := source_price_selection ||
            format(
    ',
    (
        SELECT attr->''attribute_value''->>''current''
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>''attribute_name'' = ''%s_price''
    )::numeric AS %s_price'
                , seg, seg
            );
        END LOOP;
    END IF;
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing_restaurant.temp_passive_final_prices_product_data%s_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_passive_final_prices_product_data%s_%s AS
SELECT
    bpam.product_id,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'line_group'
    )::text AS line_group,
    -- locks attributes
    COALESCE((
        SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'pre_price'
    )::boolean, false)::boolean AS pre_price,
    COALESCE((
        SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'price_freeze'
    )::boolean, false)::boolean AS price_freeze
    -- FINAL PRICES
    %s
    -- SOURCE PRICES
    %s
FROM
    base_pricing_restaurant.bp_product_attributes_mapping bpam
    INNER JOIN base_pricing_restaurant.temp_passive_final_prices_product_filter_%s pfppf
        USING (product_id);
-- INDEX creation
CREATE INDEX idx_temp_passive_final_prices_product_data%s_%s_id1
    ON base_pricing_restaurant.temp_passive_final_prices_product_data%s_%s (product_id);
CREATE INDEX idx_temp_passive_final_prices_product_data%s_%s_id2
    ON base_pricing_restaurant.temp_passive_final_prices_product_data%s_%s (line_group);
$query$,
    -- TABLE
    table_suffix,
    table_type,
    table_suffix,
    table_type,
    final_price_selection,
    source_price_selection,
    table_type,
    -- INDEX
    table_suffix,
    table_type,
    table_suffix,
    table_type,
    table_suffix,
    table_type,
    table_suffix,
    table_type
);
    RAISE NOTICE 'Creating temp_passive_final_prices_product_data%_% : %', table_suffix, table_type, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating temp_passive_final_prices_product_data%_% : %', table_suffix, table_type, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, 'sp_passive_final_prices_product_data - ' || table_type, start_time, end_time, end_time - start_time);
END;
$procedure$
;