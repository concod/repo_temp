--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:fn_create_strategy_sku_store_mapping_9 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added store grade ids to the function input parameters
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_create_strategy_sku_store_mapping;


CREATE OR REPLACE FUNCTION price_markdown.fn_create_strategy_sku_store_mapping(p_strategy_id integer, p_product_ids bigint[], p_store_ids bigint[], store_grade_ids int[], p_selected_all_flag boolean, p_selected_sku_store_ids jsonb, p_unselected_sku_store_ids jsonb, _allow_only_with_inv boolean DEFAULT true)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    DECLARE
        query text;
    BEGIN
        RAISE NOTICE 'strategy_id: %, store_grade_ids: %', p_strategy_id, store_grade_ids;

        -- Partition creation
        query := format('CREATE TABLE IF NOT EXISTS price_markdown.tb_strategy_sku_store_mapping_%1$s PARTITION OF price_markdown.tb_strategy_sku_store_mapping FOR VALUES IN (%1$L)', p_strategy_id);
        RAISE NOTICE 'partition query ----   %', query;
        EXECUTE query;

        query := format('CREATE INDEX IF NOT EXISTS strategy_sku_store_mapping_%1$s_idx ON price_markdown.tb_strategy_sku_store_mapping_%1$s USING btree
            (strategy_id ASC NULLS LAST, product_id ASC NULLS LAST, store_id ASC NULLS LAST)', p_strategy_id);
        RAISE NOTICE 'index query ----   %', query;
        EXECUTE query;

        RAISE NOTICE 'Inserting strategy mappings with optimized logic';

        -- Single INSERT statement with dynamic logic using CTEs and conditional filtering
        INSERT INTO price_markdown.tb_strategy_sku_store_mapping(strategy_id, product_id, store_id, channel_info, price, "cost", currency_id, price_with_vat)
        WITH source_data AS (
            -- Specific product-store combinations from JSON
            SELECT sku_stores.product_id, sku_stores.store_id
            FROM jsonb_to_recordset(p_selected_sku_store_ids) AS sku_stores(product_id integer, store_id integer)
            WHERE p_selected_all_flag IS FALSE AND p_selected_sku_store_ids IS NOT NULL

            UNION ALL

            -- All product-store combinations (cross join for remaining scenarios)
            SELECT products.product_id, stores.store_id
            FROM (SELECT unnest(p_product_ids) AS product_id) AS products
            CROSS JOIN (SELECT unnest(p_store_ids) AS store_id) AS stores
            WHERE (p_selected_all_flag IS TRUE)
               OR (p_selected_all_flag IS FALSE AND p_selected_sku_store_ids IS NULL)
        ),
        unselected_data AS (
            -- Get unselected combinations when needed
            SELECT product_id, store_id
            FROM jsonb_to_recordset(p_unselected_sku_store_ids) AS sku_stores(product_id integer, store_id integer)
            WHERE p_unselected_sku_store_ids IS NOT NULL
        )
        SELECT
            p_strategy_id AS strategy_id,
            pm.product_id,
            sm.store_id,
            'Omni' AS channel_info,
            tpsp.msrp AS price,
            tpsp."cost",
            tpsp.currency_id,
            tpsp.msrp_with_vat AS price_with_vat
        FROM source_data sd
        INNER JOIN price_markdown.tb_store_master sm ON sm.store_id = sd.store_id
        INNER JOIN price_markdown.product_master pm ON pm.product_id = sd.product_id
        LEFT JOIN price_markdown.tb_product_store_price tpsp ON tpsp.product_id = sd.product_id AND tpsp.store_id = sd.store_id
        -- Join inventory when needed for either inventory filtering OR store grade filtering
        LEFT JOIN global.tb_latest_inventory inv ON (_allow_only_with_inv IS TRUE OR store_grade_ids IS NOT NULL)
            AND inv.product_id = pm.product_id 
            AND inv.store_id = sm.store_id 
            AND (_allow_only_with_inv IS FALSE OR COALESCE(inv.total_inventory, 0) > 0)
            AND (
                COALESCE(array_length(store_grade_ids, 1), 0) = 0
                OR (inv.store_grade_id IS NOT NULL AND inv.store_grade_id = ANY(store_grade_ids))
            )
        -- Exclude unselected combinations when applicable
        LEFT JOIN unselected_data ud ON ud.product_id = pm.product_id AND ud.store_id = sm.store_id
        WHERE 
            -- Include inventory check only when required, store grade filtering is handled in JOIN
            ((COALESCE(array_length(store_grade_ids, 1), 0) = 0 AND _allow_only_with_inv IS FALSE) OR inv.product_id IS NOT NULL)
            -- Exclude unselected items when applicable
            AND (p_unselected_sku_store_ids IS NULL OR ud.product_id IS NULL);

        -- Insert into tb_strategy_sku_store_count
        INSERT INTO price_markdown.tb_strategy_sku_store_count
        SELECT strategy_id, COUNT(DISTINCT product_id) AS sku_count, COUNT(DISTINCT store_id) AS store_count
        FROM price_markdown.tb_strategy_sku_store_mapping
        WHERE strategy_id = p_strategy_id
        GROUP BY strategy_id;

        -- Insert/update SKU and store hierarchy in tb_strategy_hierarchy
        CALL price_markdown.pc_insert_product_store_hierarchy(p_strategy_id::integer);

        RETURN p_strategy_id;
    END;
$function$
;
