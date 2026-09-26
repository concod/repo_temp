--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pc_update_pg_effected_strategies_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pc_update_pg_effected_strategies_1

DROP PROCEDURE if exists pricesmart.pc_update_pg_effected_strategies;


CREATE OR REPLACE PROCEDURE pricesmart.pc_update_pg_effected_strategies(IN _selected_strategies integer[], IN _new_pg_id integer, IN _edit_pg_id integer, IN _user_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    p_strategy_id INT;
    strategy_pg_ids INT[] DEFAULT ARRAY[]::INT[];
    strategy_record price_markdown.tb_strategy_master%ROWTYPE;
    _product_ids INT[];
    _store_ids INT[];
    edit_strategy_result INTEGER;  -- updated here
    start_time TIMESTAMP;
    end_time TIMESTAMP;
BEGIN
    IF array_length(_selected_strategies, 1) > 0 THEN
        start_time := clock_timestamp();
        
        FOR p_strategy_id IN SELECT unnest(_selected_strategies)
        LOOP
            -- Get updated strategy_pg_ids
            SELECT array_remove(array_append(ids, _new_pg_id), _edit_pg_id)
            INTO strategy_pg_ids
            FROM (
                SELECT array_agg(product_group_id) AS ids
                FROM price_markdown.tb_strategy_product_groups
                WHERE strategy_id = p_strategy_id
            ) AS strategy_pg;

            RAISE NOTICE 'Updated strategy_pg_ids: %', strategy_pg_ids;
            RAISE NOTICE 'Strategy edit started for strategy_id: %', p_strategy_id;

            -- Fetch strategy record
            SELECT * INTO strategy_record
            FROM price_markdown.tb_strategy_master
            WHERE strategy_id = p_strategy_id;

            -- If allow_only_with_inv = true, check inventory availability
            IF strategy_record.allow_only_with_inv THEN
                SELECT ARRAY(
                    SELECT DISTINCT pm.product_id
                    FROM pricesmart.tb_pg_product tpg
                    JOIN price_markdown.product_master pm ON pm.product_id = tpg.product_id
                    WHERE tpg.pg_id = ANY(strategy_pg_ids)
                      AND pm.clearance_indicator = 0
                      AND pm.is_active = 1
                ) INTO _product_ids;

                SELECT ARRAY(
                    SELECT DISTINCT store_id
                    FROM price_markdown.tb_strategy_sku_store_mapping
                    WHERE strategy_id = p_strategy_id
                      AND store_id IS NOT NULL
                ) INTO _store_ids;

                IF NOT price_markdown.fn_check_inventory_availability(_product_ids, _store_ids) THEN
                    RAISE NOTICE 'Inventory is not sufficient. Skipping edit for strategy_id: %', p_strategy_id;
                    CONTINUE;
                END IF;
            END IF;

            -- Call edit strategy function
            SELECT price_markdown.fn_v3_edit_strategy_step_1(
                p_strategy_id,
                ARRAY(
                    SELECT DISTINCT pm.product_id
                    FROM pricesmart.tb_pg_product tpg
                    JOIN price_markdown.product_master pm ON pm.product_id = tpg.product_id
                    WHERE tpg.pg_id = ANY(strategy_pg_ids)
                      AND pm.clearance_indicator = 0
                      AND pm.is_active = 1
                ),
                ARRAY(
                    SELECT DISTINCT store_id
                    FROM price_markdown.tb_strategy_sku_store_mapping
                    WHERE strategy_id = p_strategy_id
                ),
                TRUE,
                NULL::jsonb,
                NULL::jsonb,
                strategy_record.configured_by_sku_store_mapping,
                strategy_pg_ids,
                ARRAY(
                    SELECT DISTINCT store_group_id
                    FROM price_markdown.tb_strategy_store_groups
                    WHERE strategy_id = p_strategy_id
                ),
                strategy_record.allow_only_with_inv,
                _user_id
            ) INTO edit_strategy_result;

            RAISE NOTICE 'Strategy edit done. Result: %', edit_strategy_result;
        END LOOP;

        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken to update effected strategies: %', end_time - start_time;
    END IF;
END;
$procedure$
;
