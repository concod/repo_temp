--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_passive_final_prices_update_pam stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: changeset for base_pricing_restaurant.sp_passive_final_prices_update_pam

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_passive_final_prices_update_pam;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_passive_final_prices_update_pam()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    segment_codes text[];
    final_price_selection text := '';
    seg text;
BEGIN
    start_time := clock_timestamp();
    -- Fetch active segment codes
    SELECT array_agg(segment_code) INTO segment_codes
    FROM base_pricing_restaurant.bp_customer_segment_master
    WHERE is_active IS TRUE;
    -- Validate active segments
    IF segment_codes IS NULL OR array_length(segment_codes, 1) = 0 THEN
        RAISE NOTICE 'No active segments found. Procedure exiting.';
        RETURN;
    END IF;
    -- Final price selection string
    FOREACH seg IN ARRAY segment_codes LOOP
        final_price_selection := final_price_selection ||
        format(
    '
            WHEN attr->>''attribute_name'' = ''%s_price_final'' AND pfpfd.%s_price_final IS NOT NULL
                THEN jsonb_set(
                    jsonb_set(attr, ''{attribute_value,current}'', to_jsonb(pfpfd.%s_price_final), false),
                    ''{attribute_value,initial}'', to_jsonb(pfpfd.%s_price_final), false
                )'
            , seg, seg, seg, seg
        );
    END LOOP;
    sql_query := format(
$query$
-- DATA UPDATE
UPDATE base_pricing_restaurant.bp_product_attributes_mapping pam
SET attributes = (
    SELECT jsonb_agg(
        CASE
            %s
            ELSE attr
        END
    )
    FROM
        jsonb_array_elements(pam.attributes) AS attr
        INNER JOIN base_pricing_restaurant.temp_passive_final_prices_final_data pfpfd
            ON pam.product_id = pfpfd.product_id
)
WHERE EXISTS (
    SELECT 1
    FROM base_pricing_restaurant.temp_passive_final_prices_final_data pfpfd
    WHERE pam.product_id = pfpfd.product_id
);
$query$,
    final_price_selection
);
    RAISE NOTICE 'Updating bp_product_attributes_mapping : %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating bp_product_attributes_mapping : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, 'sp_passive_final_prices_update_pam', start_time, end_time, end_time - start_time);
END;
$procedure$
;
