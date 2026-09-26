--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_update_competitor_attributes_v4_parallel_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_update_competitor_attributes_v4_parallel_2

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_update_competitor_attributes_v4_parallel;


CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_update_competitor_attributes_v4_parallel()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _set_clause TEXT;
    _pivot_cols TEXT;
BEGIN
    SELECT
        string_agg(
            format('%I = src.%I', database_column, database_column),
            ', '
        ) || ', updated_at = CURRENT_TIMESTAMP',
        string_agg(
            format(
                'MAX(CASE WHEN LOWER(TRIM(competitor)) = %L THEN comp_base_price END)::numeric(18,2) AS %I',
                LOWER(TRIM(attribute_name)),
                database_column
            ),
            ', '
        )
    INTO _set_clause, _pivot_cols
    FROM base_pricing_restaurant.bp_competitor_attributes_metadata
    WHERE is_active = TRUE;

    IF _set_clause IS NULL THEN
        RAISE EXCEPTION 'No active competitor attributes found';
    END IF;

    EXECUTE format($sql$
        UPDATE base_pricing_restaurant.bp_product_store_attributes_mapping_v4 v4
        SET %s
        FROM (
            SELECT
                product_id,
                store_id,
                %s
            FROM base_pricing_restaurant.bp_competitor_attributes
            GROUP BY product_id, store_id
        ) src
        WHERE v4.product_id = src.product_id
          AND v4.store_id   = src.store_id
          AND v4.segment_id = 10001;
    $sql$, _set_clause, _pivot_cols);

    RAISE NOTICE 'Competitor attributes + updated_at updated successfully';
END;
$procedure$
;
