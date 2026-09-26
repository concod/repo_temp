--liquibase formatted sql
--changeset chandranil.ghosh:top_line_edit_matrix_summary_4 runOnChange:true stripComments:false splitStatements:false context:MTP-91654 labels:MTP-91654
--comment: Added selected_linked_store_codes to the function

DROP FUNCTION IF EXISTS oms.oms_matrix_summary_save_and_finalize(jsonb, text, _varchar);
DROP FUNCTION IF EXISTS oms.oms_matrix_summary_save_and_finalize(jsonb, text);

/*
 * ============================================================================
 * FUNCTION: oms.oms_matrix_summary_save_and_finalize
 * ============================================================================
 *
 * PURPOSE:
 *   Saves user edits to the OMS matrix summary by updating order_quantity and
 *   order_quantity_eaches in oms.oms_orders_recommended.  Supports two modes:
 *
 *   1. TOPLINE EDIT  -- no individual article modifications; a single target
 *      value is distributed across all articles in the fiscal period using
 *      article-level weights (SUM DISTINCT of the chosen distribution column).
 *
 *   2. CELL-LEVEL EDIT -- a nested JSON tree of modifications at up to three
 *      levels:
 *        L0 = Article   (pack_id != 'WP' | pack_id = 'WP' | no pack)
 *        L1 = Location  (same three pack branches)
 *        L2 = Size/Pack (same three pack branches)
 *      Each level supports either an absolute target_quantity or a ratio
 *      multiplier.  When the existing total is zero, quantities are split
 *      equally across matching rows.
 *
 * PARAMETERS:
 *   - modifications : JSONB array of period objects, each containing:
 *       fiscal_timeperiod_id  text     -- fiscal week/month id
 *       update_level          text     -- 'Week' or 'Month' (first element only)
 *       modified              jsonb    -- array of L0 edits (empty for topline)
 *       value                 numeric  -- topline target value (topline only)
 *       distribution_method   text     -- column for topline weights
 *       product_filter        jsonb    -- product filter for topline
 *       roq_date_option       text     -- date column selector
 *   - user_id      : Text user ID (cast to integer internally)
 *   - selected_linked_store_codes : Optional varchar[] to restrict updates to given loc_codes
 *
 * RETURNS: void
 *
 * AUTHOR: OMS Team
 * ============================================================================
 */

CREATE OR REPLACE FUNCTION oms.oms_matrix_summary_save_and_finalize(
    modifications jsonb,
    user_id       text,
    selected_linked_store_codes character varying[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    -- Loop cursors
    fiscal_period  record;
    style          record;
    l0_record      record;   -- Article level
    l1_record      record;   -- Location level
    l2_record      record;   -- Size / Pack level

    -- Configuration
    update_level      text;
    timeperiod_column text;     -- 'fiscal_year_week' or 'fiscal_year_month'
    user_id_int       integer;

    -- Calculation helpers
    total_quantity        float;
    quantity_ratio        float;
    record_count          integer;
    equal_split_quantity  integer;
    query_text            text;
    total_roq_constrained float;

    -- Topline edit variables
    v_distribution_method text;
    v_distribution_column text;
    v_product_filter      jsonb;
    v_product_filter_sql  text;
    v_date_join_column    text;
    v_topline_value       numeric;
BEGIN

    -- =========================================================================
    -- INPUT VALIDATION
    -- =========================================================================

    BEGIN
        user_id_int := user_id::integer;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid user_id: %. Must be a valid integer.', user_id;
    END;

    SELECT modifications->0->>'update_level' INTO update_level;

    IF update_level IS NULL THEN
        RAISE EXCEPTION 'Missing update_level in modifications';
    END IF;

    -- Week -> fiscal_year_week, Month -> fiscal_year_month
    IF update_level = 'Week' THEN
        timeperiod_column := 'fiscal_year_week';
    ELSE
        timeperiod_column := 'fiscal_year_month';
    END IF;

    RAISE NOTICE 'Processing using time period: %', timeperiod_column;

    -- =========================================================================
    -- MAIN PROCESSING (wrapped for rollback on error)
    -- =========================================================================

    BEGIN
        -- -----------------------------------------------------------------
        -- Loop over each fiscal period in the modifications array
        -- -----------------------------------------------------------------
        FOR fiscal_period IN
            SELECT *
            FROM jsonb_to_recordset(modifications) AS (
                fiscal_timeperiod_id text,
                modified             jsonb,
                value                numeric,
                distribution_method  text,
                product_filter       jsonb,
                roq_date_option      text
            )
        LOOP
            RAISE NOTICE 'Processing timeperiod: %', fiscal_period.fiscal_timeperiod_id;

            -- =============================================================
            -- BRANCH A: TOPLINE EDIT
            -- Triggered when modified[] is empty but a target value exists.
            -- Distributes the value proportionally across all articles.
            -- =============================================================
            IF jsonb_array_length(COALESCE(fiscal_period.modified, '[]'::jsonb)) = 0
               AND fiscal_period.value IS NOT NULL THEN

                v_topline_value       := fiscal_period.value;
                v_distribution_method := COALESCE(fiscal_period.distribution_method, 'roq_constrained');
                v_product_filter      := fiscal_period.product_filter;

                v_date_join_column := CASE fiscal_period.roq_date_option
                    WHEN 'roq_receipt_date' THEN 'editable_expected_receipt_date'
                    ELSE 'order_placement_date'
                END;

                v_distribution_column := CASE v_distribution_method
                    WHEN 'raw_roq'                    THEN 'raw_roq'
                    WHEN 'ia_shipment_order_quantity'  THEN 'ia_shipment_order_quantity'
                    WHEN 'roq_unconstrained'           THEN 'roq_unconstrained'
                    WHEN 'roq_constrained'             THEN 'roq_constrained'
                    ELSE 'roq_constrained'
                END;

                v_product_filter_sql := oms.form_main_table_filters('ph_master', v_product_filter);

                -- Weight by article (SUM DISTINCT) then sub-distribute equally
                -- within each article to avoid inflating articles with more sizes.
                query_text := format('
                    WITH article_weights AS (
                        SELECT
                            oor.article,
                            SUM(DISTINCT oor.%I) AS article_weight
                        FROM oms.oms_orders_recommended oor
                        INNER JOIN global.fiscal_date_mapping fdm
                            ON oor.%I = fdm.date
                        INNER JOIN (
                            SELECT * FROM global.product_attributes_filter paf %s
                        ) paf ON paf.product_code = oor.product_code
                        WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                            AND fdm.%I::text = $1::text
                            AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR oor.loc_code = ANY($4::varchar[]))
                        GROUP BY oor.article
                    ),
                    total_weight AS (
                        SELECT COALESCE(SUM(article_weight), 0) AS total
                        FROM article_weights
                    ),
                    dist_calc AS (
                        -- Per-row pct = (article_weight / total) / rows_in_article
                        SELECT
                            oor.id,
                            CASE
                                WHEN tw.total = 0 THEN
                                    1.0 / COUNT(*) OVER ()
                                ELSE
                                    (oor.%I)::numeric / tw.total
                            END AS distribution_pct
                        FROM oms.oms_orders_recommended oor
                        INNER JOIN global.fiscal_date_mapping fdm
                            ON oor.%I = fdm.date
                        INNER JOIN (
                            SELECT * FROM global.product_attributes_filter paf %s
                        ) paf ON paf.product_code = oor.product_code
                        INNER JOIN article_weights aw ON aw.article = oor.article
                        CROSS JOIN total_weight tw
                        WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                            AND fdm.%I::text = $1::text
                            AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR oor.loc_code = ANY($4::varchar[]))
                    )
                    UPDATE oms.oms_orders_recommended oor
                    SET
                        order_quantity = CEIL($2 * dc.distribution_pct)::INTEGER,
                        order_quantity_eaches = CASE
                            WHEN oor.pack_id IS NOT NULL
                            THEN oor.pack_config * CEIL($2 * dc.distribution_pct)::INTEGER
                            ELSE CEIL($2 * dc.distribution_pct)::INTEGER
                        END,
                        order_gen_type = ''Edited'',
                        updated_by     = $3,
                        updated_at     = CURRENT_TIMESTAMP
                    FROM dist_calc dc
                    WHERE oor.id = dc.id',
                    v_distribution_column,  -- %I: oor.%I in article_weights
                    v_date_join_column,     -- %I: fdm join in article_weights
                    v_product_filter_sql,   -- %s: product filter in article_weights
                    timeperiod_column,
                    v_distribution_column,  -- %I: oor.%I in dist_calc
                    v_date_join_column,     -- %I: fdm join in dist_calc
                    v_product_filter_sql,   -- %s: product filter in dist_calc
                    timeperiod_column       -- %I: fdm.%I::text in dist_calc WHERE
                );

                EXECUTE query_text
                USING fiscal_period.fiscal_timeperiod_id, v_topline_value, user_id_int, selected_linked_store_codes;

                RAISE NOTICE 'Topline edit: distributed % across rows for period %',
                    v_topline_value, fiscal_period.fiscal_timeperiod_id;

                CONTINUE;  -- skip cell-level processing for this period
            END IF;

            -- =============================================================
            -- BRANCH B: CELL-LEVEL EDITS
            -- Process the nested modified[] array: L0 -> L1 -> L2
            -- =============================================================

            -- Resolve date join column for this period
            v_date_join_column := CASE COALESCE(fiscal_period.roq_date_option, '')
                WHEN 'roq_receipt_date' THEN 'editable_expected_receipt_date'
                ELSE 'order_placement_date'
            END;

            -- ---------------------------------------------------------
            -- L0 LOOP: Articles
            -- ---------------------------------------------------------
            FOR style IN
                SELECT * FROM jsonb_to_recordset(fiscal_period.modified) AS (l0 jsonb, name text)
            LOOP
                -- Extract L0 fields
                SELECT
                    l0->>'name'    AS p_article,
                    l0->>'pack_id' AS pack_id,
                    l0->>'value'   AS target_quantity,
                    l0->>'ratio'   AS ratio,
                    l0->>'l1'      AS l1
                INTO l0_record
                FROM (SELECT style.l0 AS l0) AS t;

                -- =====================================================
                -- L0 CASE 1: Pack (non-WP) — absolute quantity edit
                -- =====================================================
                IF l0_record.pack_id IS NOT NULL AND l0_record.pack_id != 'WP' THEN
                    IF l0_record.target_quantity IS NOT NULL AND l0_record.target_quantity != '' THEN
                        IF l0_record.p_article IS NULL OR l0_record.p_article = '' THEN
                            RAISE EXCEPTION 'Article number cannot be null or empty';
                        END IF;

                        -- Get current total order quantity (pack-level aggregation)
                        query_text := format('
                            SELECT SUM(pack_level_order_quantity)::FLOAT
                            FROM (
                                SELECT SUM(DISTINCT order_quantity) AS pack_level_order_quantity
                                FROM oms.oms_orders_recommended oor
                                WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                    AND oor.article = $1
                                    AND EXISTS (
                                        SELECT 1 FROM global.fiscal_date_mapping fdm
                                        WHERE oor.%I = fdm.date AND fdm.%I::text = $2::text
                                    )
                                    AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR oor.loc_code = ANY($3::varchar[]))
                                GROUP BY article, loc_code, pack_id, order_status_id, order_type
                            ) AS pack_level_data', v_date_join_column, timeperiod_column);

                        EXECUTE query_text INTO total_quantity
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                        IF total_quantity IS NULL THEN
                            RAISE NOTICE 'No orders found for article %', l0_record.p_article;
                            RETURN;
                        END IF;

                        -- Count unique pack-level combinations
                        query_text := format('
                            SELECT COUNT(*)
                            FROM (
                                SELECT article, loc_code, pack_id, order_status_id, order_type
                                FROM oms.oms_orders_recommended oor
                                WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                    AND oor.article = $1
                                    AND EXISTS (
                                        SELECT 1 FROM global.fiscal_date_mapping fdm
                                        WHERE oor.%I = fdm.date AND fdm.%I::text = $2::text
                                    )
                                    AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR oor.loc_code = ANY($3::varchar[]))
                                GROUP BY article, loc_code, pack_id, order_status_id, order_type
                            ) AS unique_combinations', v_date_join_column, timeperiod_column);

                        EXECUTE query_text INTO record_count
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                        IF total_quantity = 0 OR record_count = 0 THEN
                            -- Fallback: equal split when no existing quantities
                            RAISE NOTICE 'Total quantity is zero for article %. Using equal split.', l0_record.p_article;

                            IF record_count = 0 THEN
                                query_text := format('
                                    SELECT COUNT(*)
                                    FROM oms.oms_orders_recommended oor
                                    WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                        AND oor.article = $1
                                        AND EXISTS (
                                            SELECT 1 FROM global.fiscal_date_mapping fdm
                                            WHERE oor.%I = fdm.date AND fdm.%I::text = $2::text
                                        )
                                        AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR oor.loc_code = ANY($3::varchar[]))', v_date_join_column, timeperiod_column);

                                EXECUTE query_text INTO record_count
                                USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                IF record_count = 0 THEN
                                    RAISE NOTICE 'No records found for article %', l0_record.p_article;
                                    RETURN;
                                END IF;
                            END IF;

                            equal_split_quantity := CEIL(NULLIF(l0_record.target_quantity, '')::FLOAT / record_count::FLOAT)::INTEGER;

                            query_text := format('
                                UPDATE oms.oms_orders_recommended oor
                                SET order_quantity  = $1,
                                    order_gen_type  = ''Edited'',
                                    updated_by      = $4,
                                    updated_at      = CURRENT_TIMESTAMP
                                WHERE oor.article = $2
                                    AND EXISTS (
                                        SELECT 1 FROM global.fiscal_date_mapping fdm
                                        WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                    )
                                    AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', v_date_join_column, timeperiod_column);

                            EXECUTE query_text
                            USING equal_split_quantity, l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                        ELSE
                            -- Proportional distribution based on existing pack-level quantities
                            query_text := format('
                                UPDATE oms.oms_orders_recommended oor
                                SET order_quantity = CEIL(
                                        (SELECT SUM(DISTINCT oor2.order_quantity)
                                         FROM oms.oms_orders_recommended oor2
                                         INNER JOIN global.fiscal_date_mapping fdm2 ON oor2.%I = fdm2.date
                                         WHERE oor2.article          = oor.article
                                           AND oor2.pack_id          = oor.pack_id
                                           AND oor2.loc_code         = oor.loc_code
                                           AND oor2.order_type       = oor.order_type
                                           AND oor2.order_status_id  = oor.order_status_id
                                           AND fdm2.%I::text         = $5::text
                                           AND ($6::varchar[] IS NULL OR array_length($6::varchar[], 1) IS NULL OR oor2.loc_code = ANY($6::varchar[]))
                                        ) * ($1 / $2)
                                    )::INTEGER,
                                    order_gen_type = ''Edited'',
                                    updated_by     = $3,
                                    updated_at     = CURRENT_TIMESTAMP
                                WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                    AND oor.article = $4
                                    AND EXISTS (
                                        SELECT 1 FROM global.fiscal_date_mapping fdm
                                        WHERE oor.%I = fdm.date AND fdm.%I::text = $5::text
                                    )
                                    AND ($6::varchar[] IS NULL OR array_length($6::varchar[], 1) IS NULL OR oor.loc_code = ANY($6::varchar[]))', v_date_join_column, timeperiod_column, v_date_join_column, timeperiod_column);

                            EXECUTE query_text
                            USING NULLIF(l0_record.target_quantity, '')::FLOAT, total_quantity, user_id_int,
                                  l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;
                        END IF;

                        -- Recalculate order_quantity_eaches (packs * qty or just qty)
                        query_text := format('
                            UPDATE oms.oms_orders_recommended oor
                            SET order_quantity_eaches = CASE
                                    WHEN oor.pack_id IS NOT NULL THEN oor.pack_config * oor.order_quantity
                                    ELSE oor.order_quantity
                                END,
                                order_gen_type = ''Edited'',
                                updated_by     = $3,
                                updated_at     = CURRENT_TIMESTAMP
                            WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                AND oor.article = $1
                                AND EXISTS (
                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $2::text
                                )
                                AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR oor.loc_code = ANY($4::varchar[]))', v_date_join_column, timeperiod_column);

                        EXECUTE query_text
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                        RAISE NOTICE 'Successfully updated order quantities for article %', l0_record.p_article;
                    END IF;

                -- =====================================================
                -- L0 CASE 2: Without-Pack (WP) — ratio or target qty
                -- =====================================================
                ELSIF l0_record.pack_id IS NOT NULL AND l0_record.pack_id = 'WP' THEN

                    -- ----- L0 WP: Ratio edit -----
                    IF l0_record.ratio IS NOT NULL AND l0_record.ratio != '' THEN
                        query_text := format('
                            SELECT COUNT(*)
                            FROM oms.oms_orders_recommended oor
                            WHERE oor.article = $1
                                AND EXISTS (
                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $2::text
                                )
                                AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR oor.loc_code = ANY($3::varchar[]))', v_date_join_column, timeperiod_column);

                        EXECUTE query_text INTO record_count
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                        IF record_count = 0 THEN
                            RAISE NOTICE 'No orders found for article % in time period % (column: %)',
                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column;
                            RETURN;
                        END IF;

                        -- Apply ratio to roq_constrained
                        query_text := format('
                            UPDATE oms.oms_orders_recommended oor
                            SET order_quantity  = CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER,
                                order_gen_type  = ''Edited'',
                                updated_by      = $4,
                                updated_at      = CURRENT_TIMESTAMP
                            WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                AND oor.article = $2
                                AND EXISTS (
                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                )
                                AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', v_date_join_column, timeperiod_column);

                        EXECUTE query_text
                        USING NULLIF(l0_record.ratio, ''), l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                        -- Recalculate eaches
                        query_text := format('
                            UPDATE oms.oms_orders_recommended oor
                            SET order_quantity_eaches = CASE
                                    WHEN oor.pack_id IS NOT NULL THEN oor.pack_config * oor.order_quantity
                                    ELSE oor.order_quantity
                                END,
                                order_gen_type = ''Edited'',
                                updated_by     = $3,
                                updated_at     = CURRENT_TIMESTAMP
                            WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                AND oor.article = $1
                                AND EXISTS (
                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $2::text
                                )
                                AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR oor.loc_code = ANY($4::varchar[]))', v_date_join_column, timeperiod_column);

                        EXECUTE query_text
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                        RAISE NOTICE 'Successfully updated order quantities for article % in time period % using ratio %',
                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l0_record.ratio;

                    -- ----- L0 WP: Target quantity edit -----
                    ELSIF l0_record.target_quantity IS NOT NULL AND l0_record.target_quantity != '' THEN
                        -- Get total roq_constrained for proportional split
                        query_text := format('
                            SELECT SUM(COALESCE(roq_constrained, 0))::FLOAT
                            FROM oms.oms_orders_recommended oor
                            WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                AND oor.article = $1
                                AND EXISTS (
                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $2::text
                                )
                                AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR oor.loc_code = ANY($3::varchar[]))', v_date_join_column, timeperiod_column);

                        EXECUTE query_text INTO total_roq_constrained
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                        query_text := format('
                            SELECT COUNT(*)
                            FROM oms.oms_orders_recommended oor
                            WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                AND oor.article = $1
                                AND EXISTS (
                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $2::text
                                )
                                AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR oor.loc_code = ANY($3::varchar[]))', v_date_join_column, timeperiod_column);

                        EXECUTE query_text INTO record_count
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                        IF record_count = 0 THEN
                            RAISE NOTICE 'No orders found for article % in time period % (column: %)',
                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column;
                            RETURN;
                        END IF;

                        IF total_roq_constrained IS NULL OR total_roq_constrained = 0 THEN
                            -- Equal split fallback
                            RAISE NOTICE 'Total roq_constrained is zero for article % in time period %. Using equal split.',
                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id;

                            equal_split_quantity := CEIL(NULLIF(l0_record.target_quantity, '')::FLOAT / record_count::FLOAT)::INTEGER;

                            query_text := format('
                                UPDATE oms.oms_orders_recommended oor
                                SET order_quantity          = $1,
                                    order_quantity_eaches   = CASE
                                        WHEN oor.pack_id IS NOT NULL THEN oor.pack_config * $1
                                        ELSE $1
                                    END,
                                    updated_by = $4,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                    AND oor.article = $2
                                    AND EXISTS (
                                        SELECT 1 FROM global.fiscal_date_mapping fdm
                                        WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                    )
                                    AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', v_date_join_column, timeperiod_column);

                            EXECUTE query_text
                            USING equal_split_quantity, l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                        ELSE
                            -- FIX 1 (L0 WP target_quantity): CASE END before order_quantity_eaches
                            quantity_ratio := NULLIF(l0_record.target_quantity, '')::FLOAT / total_roq_constrained::FLOAT;

                            query_text := format('
                                UPDATE oms.oms_orders_recommended oor
                                SET order_quantity = CASE
                                        WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                        ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                    END,
                                    order_quantity_eaches = CASE
                                        WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                        ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                    END,
                                    order_gen_type = ''Edited'',
                                    updated_by     = $4,
                                    updated_at     = CURRENT_TIMESTAMP
                                WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                    AND oor.article = $2
                                    AND EXISTS (
                                        SELECT 1 FROM global.fiscal_date_mapping fdm
                                        WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                    )
                                    AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', v_date_join_column, timeperiod_column);

                            EXECUTE query_text
                            USING quantity_ratio, l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                        END IF;

                        -- Recalculate eaches
                        query_text := format('
                            UPDATE oms.oms_orders_recommended oor
                            SET order_quantity_eaches = CASE
                                    WHEN oor.pack_id IS NOT NULL THEN oor.pack_config * oor.order_quantity
                                    ELSE oor.order_quantity
                                END,
                                order_gen_type = ''Edited'',
                                updated_by     = $3,
                                updated_at     = CURRENT_TIMESTAMP
                            WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                AND oor.article = $1
                                AND EXISTS (
                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $2::text
                                )
                                AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR oor.loc_code = ANY($4::varchar[]))', v_date_join_column, timeperiod_column);

                        EXECUTE query_text
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                        RAISE NOTICE 'Successfully updated order quantities for article % in time period % (column: %)',
                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column;
                    END IF;

                -- =====================================================
                -- L0 CASE 3: No pack — ratio edit
                -- =====================================================
                ELSIF l0_record.ratio IS NOT NULL AND l0_record.ratio != '' THEN
                    query_text := format('
                        SELECT COUNT(*)
                        FROM oms.oms_orders_recommended oor
                        WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                            AND oor.article = $1
                            AND EXISTS (
                                SELECT 1 FROM global.fiscal_date_mapping fdm
                                WHERE oor.%I = fdm.date AND fdm.%I::text = $2::text
                            )
                            AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR oor.loc_code = ANY($3::varchar[]))', v_date_join_column, timeperiod_column);

                    EXECUTE query_text INTO record_count
                    USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                    IF record_count = 0 THEN
                        RAISE NOTICE 'No orders found for article % in time period % (column: %)',
                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column;
                        RETURN;
                    END IF;

                    query_text := format('
                        UPDATE oms.oms_orders_recommended oor
                        SET order_quantity = CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER,
                            order_quantity_eaches = CASE
                                WHEN oor.pack_id IS NOT NULL
                                THEN oor.pack_config * CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER
                                ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER
                            END,
                            order_gen_type = ''Edited'',
                            updated_by     = $4,
                            updated_at     = CURRENT_TIMESTAMP
                        WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                            AND oor.article = $2
                            AND EXISTS (
                                SELECT 1 FROM global.fiscal_date_mapping fdm
                                WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                            )
                            AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', v_date_join_column, timeperiod_column);

                    EXECUTE query_text
                    USING NULLIF(l0_record.ratio, ''), l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                    RAISE NOTICE 'Successfully updated order quantities for article % in time period % using ratio %',
                                l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l0_record.ratio;

                -- =====================================================
                -- L0 CASE 4: No pack — target quantity edit
                -- =====================================================
                ELSIF l0_record.target_quantity IS NOT NULL AND l0_record.target_quantity != '' THEN
                    query_text := format('
                        SELECT SUM(COALESCE(roq_constrained, 0))::FLOAT
                        FROM oms.oms_orders_recommended oor
                        WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                            AND oor.article = $1
                            AND EXISTS (
                                SELECT 1 FROM global.fiscal_date_mapping fdm
                                WHERE oor.%I = fdm.date AND fdm.%I::text = $2::text
                            )
                            AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR oor.loc_code = ANY($3::varchar[]))', v_date_join_column, timeperiod_column);

                    EXECUTE query_text INTO total_roq_constrained
                    USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                    query_text := format('
                        SELECT COUNT(*)
                        FROM oms.oms_orders_recommended oor
                        WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                            AND oor.article = $1
                            AND EXISTS (
                                SELECT 1 FROM global.fiscal_date_mapping fdm
                                WHERE oor.%I = fdm.date AND fdm.%I::text = $2::text
                            )
                            AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR oor.loc_code = ANY($3::varchar[]))', v_date_join_column, timeperiod_column);

                    EXECUTE query_text INTO record_count
                    USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                    IF record_count = 0 THEN
                        RAISE NOTICE 'No orders found for article % in time period % (column: %)',
                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column;
                        RETURN;
                    END IF;

                    IF total_roq_constrained IS NULL OR total_roq_constrained = 0 THEN
                        RAISE NOTICE 'Total roq_constrained is zero for article % in time period %. Using equal split.',
                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id;

                        equal_split_quantity := CEIL(NULLIF(l0_record.target_quantity, '')::FLOAT / record_count::FLOAT)::INTEGER;

                        query_text := format('
                            UPDATE oms.oms_orders_recommended oor
                            SET order_quantity          = $1,
                                order_quantity_eaches   = CASE
                                    WHEN oor.pack_id IS NOT NULL THEN oor.pack_config * $1
                                    ELSE $1
                                END,
                                updated_by = $4,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                AND oor.article = $2
                                AND EXISTS (
                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                )
                                AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', v_date_join_column, timeperiod_column);

                        EXECUTE query_text
                        USING equal_split_quantity, l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                    ELSE
                        -- FIX 2 (L0 non-WP target_quantity): CASE END before order_quantity_eaches
                        quantity_ratio := NULLIF(l0_record.target_quantity, '')::FLOAT / total_roq_constrained::FLOAT;

                        query_text := format('
                            UPDATE oms.oms_orders_recommended oor
                            SET order_quantity = CASE
                                    WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                    ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                END,
                                order_quantity_eaches = CASE
                                    WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                    ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                END,
                                order_gen_type = ''Edited'',
                                updated_by     = $4,
                                updated_at     = CURRENT_TIMESTAMP
                            WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                AND oor.article = $2
                                AND EXISTS (
                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                )
                                AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', v_date_join_column, timeperiod_column);

                        EXECUTE query_text
                        USING quantity_ratio, l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                    END IF;

                    RAISE NOTICE 'Successfully updated order quantities for article % in time period % (column: %)',
                                l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column;
                END IF;

                -- =============================================================
                -- L1 LOOP: Locations (within current article)
                -- =============================================================
                IF l0_record.l1 IS NOT NULL THEN
                    FOR l1_record IN
                        SELECT
                            t.name    AS p_loc_code,
                            t.value   AS target_quantity,
                            t.ratio   AS ratio,
                            t.pack_id AS pack_id,
                            t.l2      AS l2
                        FROM jsonb_to_recordset(l0_record.l1::jsonb) AS
                            t(name text, value text, ratio text, pack_id text, l2 jsonb)
                    LOOP

                        -- =================================================
                        -- L1 CASE 1: Pack (non-WP) — absolute quantity
                        -- =================================================
                        IF l1_record.pack_id IS NOT NULL AND l1_record.pack_id != 'WP' THEN
                            IF l1_record.target_quantity != '' THEN
                                IF l0_record.p_article IS NULL OR l0_record.p_article = '' THEN
                                    RAISE EXCEPTION 'Article number cannot be null or empty';
                                END IF;

                                IF l1_record.p_loc_code IS NULL OR l1_record.p_loc_code = '' THEN
                                    RAISE EXCEPTION 'Location code cannot be null or empty';
                                END IF;

                                -- Get current total (pack-level) for article + location
                                query_text := format('
                                    SELECT SUM(pack_level_order_quantity)::FLOAT
                                    FROM (
                                        SELECT SUM(DISTINCT order_quantity) AS pack_level_order_quantity
                                        FROM oms.oms_orders_recommended oor
                                        WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                            AND oor.article  = $1
                                            AND oor.loc_code = $2
                                            AND EXISTS (
                                                SELECT 1 FROM global.fiscal_date_mapping fdm
                                                WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                            )
                                            AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR oor.loc_code = ANY($4::varchar[]))
                                        GROUP BY article, loc_code, pack_id, order_status_id, order_type
                                    ) AS pack_level_data', v_date_join_column, timeperiod_column);

                                EXECUTE query_text INTO total_quantity
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                IF total_quantity IS NULL THEN
                                    RAISE NOTICE 'No orders found for article % at location %', l0_record.p_article, l1_record.p_loc_code;
                                    RETURN;
                                END IF;

                                query_text := format('
                                    SELECT COUNT(*)
                                    FROM (
                                        SELECT article, loc_code, pack_id, order_status_id, order_type
                                        FROM oms.oms_orders_recommended oor
                                        WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                            AND oor.article  = $1
                                            AND oor.loc_code = $2
                                            AND EXISTS (
                                                SELECT 1 FROM global.fiscal_date_mapping fdm
                                                WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                            )
                                            AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR oor.loc_code = ANY($4::varchar[]))
                                        GROUP BY article, loc_code, pack_id, order_status_id, order_type
                                    ) AS unique_combinations', v_date_join_column, timeperiod_column);

                                EXECUTE query_text INTO record_count
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                IF total_quantity = 0 OR record_count = 0 THEN
                                    RAISE NOTICE 'Total quantity is zero for article % at location %. Using equal split.',
                                                l0_record.p_article, l1_record.p_loc_code;

                                    IF record_count = 0 THEN
                                        query_text := format('
                                            SELECT COUNT(*)
                                            FROM oms.oms_orders_recommended oor
                                            WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                                AND oor.article  = $1
                                                AND oor.loc_code = $2
                                                AND EXISTS (
                                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                                )
                                                AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR oor.loc_code = ANY($4::varchar[]))', v_date_join_column, timeperiod_column);

                                        EXECUTE query_text INTO record_count
                                        USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                        IF record_count = 0 THEN
                                            RAISE NOTICE 'No records found for article % at location %', l0_record.p_article, l1_record.p_loc_code;
                                            RETURN;
                                        END IF;
                                    END IF;

                                    equal_split_quantity := CEIL(NULLIF(l1_record.target_quantity, '')::FLOAT / record_count::FLOAT)::INTEGER;

                                    query_text := format('
                                        UPDATE oms.oms_orders_recommended oor
                                        SET order_quantity          = $1,
                                            order_quantity_eaches   = CASE
                                                WHEN oor.pack_id IS NOT NULL THEN oor.pack_config * $1
                                                ELSE $1
                                            END,
                                            updated_by = $5,
                                            updated_at = CURRENT_TIMESTAMP
                                        WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                            AND oor.article  = $2
                                            AND oor.loc_code = $3
                                            AND EXISTS (
                                                SELECT 1 FROM global.fiscal_date_mapping fdm
                                                WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                            )
                                            AND ($6::varchar[] IS NULL OR array_length($6::varchar[], 1) IS NULL OR oor.loc_code = ANY($6::varchar[]))', v_date_join_column, timeperiod_column);

                                    EXECUTE query_text
                                    USING equal_split_quantity, l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                                ELSE
                                    -- Proportional distribution
                                    query_text := format('
                                        UPDATE oms.oms_orders_recommended oor
                                        SET order_quantity = CEIL(
                                                (SELECT SUM(DISTINCT oor2.order_quantity)
                                                 FROM oms.oms_orders_recommended oor2
                                                 INNER JOIN global.fiscal_date_mapping fdm2 ON oor2.%I = fdm2.date
                                                 WHERE oor2.article          = oor.article
                                                   AND oor2.pack_id          = oor.pack_id
                                                   AND oor2.loc_code         = oor.loc_code
                                                   AND oor2.order_type       = oor.order_type
                                                   AND oor2.order_status_id  = oor.order_status_id
                                                   AND fdm2.%I::text         = $6::text
                                                   AND ($7::varchar[] IS NULL OR array_length($7::varchar[], 1) IS NULL OR oor2.loc_code = ANY($7::varchar[]))
                                                ) * ($1 / $2)
                                            )::INTEGER,
                                            updated_by = $3,
                                            updated_at = CURRENT_TIMESTAMP
                                        WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                            AND oor.article  = $4
                                            AND oor.loc_code = $5
                                            AND EXISTS (
                                                SELECT 1 FROM global.fiscal_date_mapping fdm
                                                WHERE oor.%I = fdm.date AND fdm.%I::text = $6::text
                                            )
                                            AND ($7::varchar[] IS NULL OR array_length($7::varchar[], 1) IS NULL OR oor.loc_code = ANY($7::varchar[]))', v_date_join_column, timeperiod_column, v_date_join_column, timeperiod_column);

                                    EXECUTE query_text
                                    USING NULLIF(l1_record.target_quantity, '')::FLOAT, total_quantity, user_id_int,
                                          l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;
                                END IF;

                                -- Recalculate eaches
                                query_text := format('
                                    UPDATE oms.oms_orders_recommended oor
                                    SET order_quantity_eaches = CASE
                                            WHEN oor.pack_id IS NOT NULL THEN oor.pack_config * oor.order_quantity
                                            ELSE oor.order_quantity
                                        END,
                                        order_gen_type = ''Edited'',
                                        updated_by     = $4,
                                        updated_at     = CURRENT_TIMESTAMP
                                    WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                        AND oor.article  = $1
                                        AND oor.loc_code = $2
                                        AND EXISTS (
                                            SELECT 1 FROM global.fiscal_date_mapping fdm
                                            WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                        )
                                        AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', v_date_join_column, timeperiod_column);

                                EXECUTE query_text
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                                RAISE NOTICE 'Successfully updated order quantities for article % at location %',
                                            l0_record.p_article, l1_record.p_loc_code;
                            END IF;

                        -- =================================================
                        -- L1 CASE 2: Without-Pack (WP) — ratio or target
                        -- =================================================
                        ELSIF l1_record.pack_id IS NOT NULL AND l1_record.pack_id = 'WP' THEN

                            -- ----- L1 WP: Ratio edit -----
                            IF l1_record.ratio IS NOT NULL AND l1_record.ratio != '' THEN
                                query_text := format('
                                    SELECT COUNT(*)
                                    FROM oms.oms_orders_recommended oor
                                    WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                        AND oor.article  = $1
                                        AND oor.loc_code = $2
                                        AND EXISTS (
                                            SELECT 1 FROM global.fiscal_date_mapping fdm
                                            WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                        )', v_date_join_column, timeperiod_column);

                                EXECUTE query_text INTO record_count
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id;

                                IF record_count = 0 THEN
                                    RAISE NOTICE 'No orders found for article % in time period % (column: %) at location %',
                                                l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                                    RETURN;
                                END IF;

                                query_text := format('
                                    UPDATE oms.oms_orders_recommended oor
                                    SET order_quantity  = CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER,
                                        order_gen_type = ''Edited'',
                                        updated_by     = $5,
                                        updated_at     = CURRENT_TIMESTAMP
                                    WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                        AND oor.article  = $2
                                        AND oor.loc_code = $3
                                        AND EXISTS (
                                            SELECT 1 FROM global.fiscal_date_mapping fdm
                                            WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                        )
                                        AND ($6::varchar[] IS NULL OR array_length($6::varchar[], 1) IS NULL OR oor.loc_code = ANY($6::varchar[]))', v_date_join_column, timeperiod_column);

                                EXECUTE query_text
                                USING NULLIF(l1_record.ratio, ''), l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                                -- Recalculate eaches
                                query_text := format('
                                    UPDATE oms.oms_orders_recommended oor
                                    SET order_quantity_eaches = CASE
                                            WHEN oor.pack_id IS NOT NULL THEN oor.pack_config * oor.order_quantity
                                            ELSE oor.order_quantity
                                        END,
                                        order_gen_type = ''Edited'',
                                        updated_by     = $4,
                                        updated_at     = CURRENT_TIMESTAMP
                                    WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                        AND oor.article  = $1
                                        AND oor.loc_code = $2
                                        AND EXISTS (
                                            SELECT 1 FROM global.fiscal_date_mapping fdm
                                            WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                        )
                                        AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', v_date_join_column, timeperiod_column);

                                EXECUTE query_text
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                                RAISE NOTICE 'Successfully updated order quantities for article % in time period % at location % using ratio %',
                                            l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l1_record.p_loc_code, l1_record.ratio;

                            -- ----- L1 WP: Target quantity edit -----
                            ELSIF l1_record.target_quantity IS NOT NULL AND l1_record.target_quantity != '' THEN
                                query_text := format('
                                    SELECT SUM(COALESCE(roq_constrained, 0))::FLOAT
                                    FROM oms.oms_orders_recommended oor
                                    WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                        AND oor.article  = $1
                                        AND oor.loc_code = $2
                                        AND EXISTS (
                                            SELECT 1 FROM global.fiscal_date_mapping fdm
                                            WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                        )', v_date_join_column, timeperiod_column);

                                EXECUTE query_text INTO total_roq_constrained
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id;

                                query_text := format('
                                    SELECT COUNT(*)
                                    FROM oms.oms_orders_recommended oor
                                    WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                        AND oor.article  = $1
                                        AND oor.loc_code = $2
                                        AND EXISTS (
                                            SELECT 1 FROM global.fiscal_date_mapping fdm
                                            WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                        )', v_date_join_column, timeperiod_column);

                                EXECUTE query_text INTO record_count
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id;

                                IF record_count = 0 THEN
                                    RAISE NOTICE 'No orders found for article % in time period % (column: %) at location %',
                                                l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                                    RETURN;
                                END IF;

                                IF total_roq_constrained IS NULL OR total_roq_constrained = 0 THEN
                                    RAISE NOTICE 'Total roq_constrained is zero for article % in time period % at location %. Using equal split.',
                                                l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l1_record.p_loc_code;

                                    equal_split_quantity := CEIL(NULLIF(l1_record.target_quantity, '')::INTEGER / record_count::INTEGER)::INTEGER;

                                    query_text := format('
                                        UPDATE oms.oms_orders_recommended oor
                                        SET order_quantity          = $1,
                                            order_quantity_eaches   = CASE
                                                WHEN oor.pack_id IS NOT NULL THEN oor.pack_config * $1
                                                ELSE $1
                                            END,
                                            updated_by = $5,
                                            updated_at = CURRENT_TIMESTAMP
                                        WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                            AND oor.article  = $2
                                            AND oor.loc_code = $3
                                            AND EXISTS (
                                                SELECT 1 FROM global.fiscal_date_mapping fdm
                                                WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                            )', v_date_join_column, timeperiod_column);

                                    EXECUTE query_text
                                    USING equal_split_quantity, l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int;
                                ELSE
                                    quantity_ratio := NULLIF(l1_record.target_quantity, '')::FLOAT / total_roq_constrained::FLOAT;

                                    query_text := format('
                                        UPDATE oms.oms_orders_recommended oor
                                        SET order_quantity = CASE
                                                WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                                ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                            END,
                                            updated_by = $5,
                                            updated_at = CURRENT_TIMESTAMP
                                        WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                            AND oor.article  = $2
                                            AND oor.loc_code = $3
                                            AND EXISTS (
                                                SELECT 1 FROM global.fiscal_date_mapping fdm
                                                WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                            )', v_date_join_column, timeperiod_column);

                                    EXECUTE query_text
                                    USING quantity_ratio, l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int;
                                END IF;

                                -- Recalculate eaches
                                query_text := format('
                                    UPDATE oms.oms_orders_recommended oor
                                    SET order_quantity_eaches = CASE
                                            WHEN oor.pack_id IS NOT NULL THEN oor.pack_config * oor.order_quantity
                                            ELSE oor.order_quantity
                                        END,
                                        order_gen_type = ''Edited'',
                                        updated_by     = $4,
                                        updated_at     = CURRENT_TIMESTAMP
                                    WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                        AND oor.article  = $1
                                        AND oor.loc_code = $2
                                        AND EXISTS (
                                            SELECT 1 FROM global.fiscal_date_mapping fdm
                                            WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                        )', v_date_join_column, timeperiod_column);

                                EXECUTE query_text
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int;

                                RAISE NOTICE 'Successfully updated order quantities for article % in time period % (column: %) at location %',
                                            l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                            END IF;

                        -- =================================================
                        -- L1 CASE 3: No pack — ratio edit
                        -- =================================================
                        ELSIF l1_record.ratio IS NOT NULL AND l1_record.ratio != '' THEN
                            query_text := format('
                                SELECT COUNT(*)
                                FROM oms.oms_orders_recommended oor
                                WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                    AND oor.article  = $1
                                    AND oor.loc_code = $2
                                    AND EXISTS (
                                        SELECT 1 FROM global.fiscal_date_mapping fdm
                                        WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                    )', v_date_join_column, timeperiod_column);

                            EXECUTE query_text INTO record_count
                            USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id;

                            IF record_count = 0 THEN
                                RAISE NOTICE 'No orders found for article % in time period % (column: %) at location %',
                                            l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                                RETURN;
                            END IF;

                            query_text := format('
                                UPDATE oms.oms_orders_recommended oor
                                SET order_quantity = CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER,
                                    order_quantity_eaches = CASE
                                        WHEN oor.pack_id IS NOT NULL
                                        THEN oor.pack_config * CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER
                                        ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER
                                    END,
                                    order_gen_type = ''Edited'',
                                    updated_by     = $5,
                                    updated_at     = CURRENT_TIMESTAMP
                                WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                    AND oor.article  = $2
                                    AND oor.loc_code = $3
                                    AND EXISTS (
                                        SELECT 1 FROM global.fiscal_date_mapping fdm
                                        WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                    )', v_date_join_column, timeperiod_column);

                            EXECUTE query_text
                            USING NULLIF(l1_record.ratio, ''), l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int;

                            RAISE NOTICE 'Successfully updated order quantities for article % in time period % at location % using ratio %',
                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l1_record.p_loc_code, l1_record.ratio;

                        -- =================================================
                        -- L1 CASE 4: No pack — target quantity edit
                        -- =================================================
                        ELSIF l1_record.target_quantity IS NOT NULL AND l1_record.target_quantity != '' THEN
                            query_text := format('
                                SELECT SUM(COALESCE(roq_constrained, 0))::FLOAT
                                FROM oms.oms_orders_recommended oor
                                WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                    AND oor.article  = $1
                                    AND oor.loc_code = $2
                                    AND EXISTS (
                                        SELECT 1 FROM global.fiscal_date_mapping fdm
                                        WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                    )', v_date_join_column, timeperiod_column);

                            EXECUTE query_text INTO total_roq_constrained
                            USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id;

                            query_text := format('
                                SELECT COUNT(*)
                                FROM oms.oms_orders_recommended oor
                                WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                    AND oor.article  = $1
                                    AND oor.loc_code = $2
                                    AND EXISTS (
                                        SELECT 1 FROM global.fiscal_date_mapping fdm
                                        WHERE oor.%I = fdm.date AND fdm.%I::text = $3::text
                                    )', v_date_join_column, timeperiod_column);

                            EXECUTE query_text INTO record_count
                            USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id;

                            IF record_count = 0 THEN
                                RAISE NOTICE 'No orders found for article % in time period % (column: %) at location %',
                                            l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                                RETURN;
                            END IF;

                            IF total_roq_constrained IS NULL OR total_roq_constrained = 0 THEN
                                RAISE NOTICE 'Total roq_constrained is zero for article % in time period % at location %. Using equal split.',
                                            l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l1_record.p_loc_code;

                                equal_split_quantity := CEIL(NULLIF(l1_record.target_quantity, '')::INTEGER / record_count::INTEGER)::INTEGER;

                                query_text := format('
                                    UPDATE oms.oms_orders_recommended oor
                                    SET order_quantity          = $1,
                                        order_quantity_eaches   = CASE
                                            WHEN oor.pack_id IS NOT NULL THEN oor.pack_config * $1
                                            ELSE $1
                                        END,
                                        updated_by = $5,
                                        updated_at = CURRENT_TIMESTAMP
                                    WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                        AND oor.article  = $2
                                        AND oor.loc_code = $3
                                        AND EXISTS (
                                            SELECT 1 FROM global.fiscal_date_mapping fdm
                                            WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                        )', v_date_join_column, timeperiod_column);

                                EXECUTE query_text
                                USING equal_split_quantity, l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int;
                            ELSE
                                -- FIX 3 (L1 target_quantity): CASE END before order_quantity_eaches
                                quantity_ratio := NULLIF(l1_record.target_quantity, '')::FLOAT / total_roq_constrained::FLOAT;

                                query_text := format('
                                    UPDATE oms.oms_orders_recommended oor
                                    SET order_quantity = CASE
                                            WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                            ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                        END,
                                        order_quantity_eaches = CASE
                                            WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                            ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                        END,
                                        order_gen_type = ''Edited'',
                                        updated_by     = $5,
                                        updated_at     = CURRENT_TIMESTAMP
                                    WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                        AND oor.article  = $2
                                        AND oor.loc_code = $3
                                        AND EXISTS (
                                            SELECT 1 FROM global.fiscal_date_mapping fdm
                                            WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                        )', v_date_join_column, timeperiod_column);

                                EXECUTE query_text
                                USING quantity_ratio, l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int;
                            END IF;

                            RAISE NOTICE 'Successfully updated order quantities for article % in time period % (column: %) at location %',
                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                        END IF;

                        -- =====================================================
                        -- L2 LOOP: Sizes / Packs (within current location)
                        -- =====================================================
                        IF l1_record.l2 IS NOT NULL THEN
                            FOR l2_record IN
                                SELECT
                                    t.name    AS p_name,
                                    t.value   AS target_quantity,
                                    t.ratio   AS ratio,
                                    t.pack_id AS p_pack_id
                                FROM jsonb_to_recordset(l1_record.l2::jsonb) AS
                                    t(name text, value text, ratio text, pack_id text)
                            LOOP

                                -- =============================================
                                -- L2 CASE 1: Pack (non-WP) — absolute quantity
                                -- =============================================
                                IF l2_record.p_pack_id IS NOT NULL AND l2_record.p_pack_id != 'WP' THEN
                                    IF l2_record.target_quantity != '' THEN
                                        IF l0_record.p_article IS NULL OR l0_record.p_article = '' THEN
                                            RAISE EXCEPTION 'Article number cannot be null or empty';
                                        END IF;

                                        IF l1_record.p_loc_code IS NULL OR l1_record.p_loc_code = '' THEN
                                            RAISE EXCEPTION 'Location code cannot be null or empty';
                                        END IF;

                                        IF l2_record.p_name IS NULL OR l2_record.p_name = '' THEN
                                            RAISE EXCEPTION 'Pack ID cannot be null or empty';
                                        END IF;

                                        -- Get current total (pack-level) for article + location + pack
                                        query_text := format('
                                            SELECT SUM(pack_level_order_quantity)::FLOAT
                                            FROM (
                                                SELECT SUM(DISTINCT order_quantity) AS pack_level_order_quantity
                                                FROM oms.oms_orders_recommended oor
                                                WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                                    AND oor.article  = $1
                                                    AND oor.loc_code = $2
                                                    AND oor.pack_id  = $3
                                                    AND EXISTS (
                                                        SELECT 1 FROM global.fiscal_date_mapping fdm
                                                        WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                                    )
                                                GROUP BY article, loc_code, pack_id, order_status_id, order_type
                                            ) AS pack_level_data', v_date_join_column, timeperiod_column);

                                        EXECUTE query_text INTO total_quantity
                                        USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id;

                                        IF total_quantity IS NULL THEN
                                            RAISE NOTICE 'No orders found for article % at location % with pack ID %',
                                                        l0_record.p_article, l1_record.p_loc_code, l2_record.p_name;
                                            RETURN;
                                        END IF;

                                        query_text := format('
                                            SELECT COUNT(*)
                                            FROM (
                                                SELECT article, loc_code, pack_id, order_status_id, order_type
                                                FROM oms.oms_orders_recommended oor
                                                WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                                    AND oor.article  = $1
                                                    AND oor.loc_code = $2
                                                    AND oor.pack_id  = $3
                                                    AND EXISTS (
                                                        SELECT 1 FROM global.fiscal_date_mapping fdm
                                                        WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                                    )
                                                GROUP BY article, loc_code, pack_id, order_status_id, order_type
                                            ) AS unique_combinations', v_date_join_column, timeperiod_column);

                                        EXECUTE query_text INTO record_count
                                        USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id;

                                        IF total_quantity = 0 OR record_count = 0 THEN
                                            RAISE NOTICE 'Total quantity is zero for article % at location % with pack ID %. Using equal split.',
                                                        l0_record.p_article, l1_record.p_loc_code, l2_record.p_name;

                                            IF record_count = 0 THEN
                                                query_text := format('
                                                    SELECT COUNT(*)
                                                    FROM oms.oms_orders_recommended oor
                                                    WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                                        AND oor.article  = $1
                                                        AND oor.loc_code = $2
                                                        AND oor.pack_id  = $3
                                                        AND EXISTS (
                                                            SELECT 1 FROM global.fiscal_date_mapping fdm
                                                            WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                                        )', v_date_join_column, timeperiod_column);

                                                EXECUTE query_text INTO record_count
                                                USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id;

                                                IF record_count = 0 THEN
                                                    RAISE NOTICE 'No records found for article % at location % with pack ID %',
                                                                l0_record.p_article, l1_record.p_loc_code, l2_record.p_name;
                                                    RETURN;
                                                END IF;
                                            END IF;

                                            equal_split_quantity := CEIL(NULLIF(l2_record.target_quantity, '')::FLOAT / record_count::FLOAT)::INTEGER;

                                            query_text := format('
                                                UPDATE oms.oms_orders_recommended oor
                                                SET order_quantity  = $1,
                                                    order_gen_type = ''Edited'',
                                                    updated_by     = $6,
                                                    updated_at     = CURRENT_TIMESTAMP
                                                WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                                    AND oor.article  = $2
                                                    AND oor.loc_code = $3
                                                    AND oor.pack_id  = $4
                                                    AND EXISTS (
                                                        SELECT 1 FROM global.fiscal_date_mapping fdm
                                                        WHERE oor.%I = fdm.date AND fdm.%I::text = $5::text
                                                    )', v_date_join_column, timeperiod_column);

                                            EXECUTE query_text
                                            USING equal_split_quantity, l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int;
                                        ELSE
                                            -- Proportional distribution
                                            query_text := format('
                                                UPDATE oms.oms_orders_recommended oor
                                                SET order_quantity = CEIL(
                                                        (SELECT SUM(DISTINCT oor2.order_quantity)
                                                         FROM oms.oms_orders_recommended oor2
                                                         INNER JOIN global.fiscal_date_mapping fdm2 ON oor2.%I = fdm2.date
                                                         WHERE oor2.article          = oor.article
                                                           AND oor2.pack_id          = oor.pack_id
                                                           AND oor2.loc_code         = oor.loc_code
                                                           AND oor2.order_type       = oor.order_type
                                                           AND oor2.order_status_id  = oor.order_status_id
                                                           AND fdm2.%I::text         = $7::text
                                                        ) * ($1 / $2)
                                                    )::INTEGER,
                                                    order_gen_type = ''Edited'',
                                                    updated_by     = $3,
                                                    updated_at     = CURRENT_TIMESTAMP
                                                WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                                    AND oor.article  = $4
                                                    AND oor.loc_code = $5
                                                    AND oor.pack_id  = $6
                                                    AND EXISTS (
                                                        SELECT 1 FROM global.fiscal_date_mapping fdm
                                                        WHERE oor.%I = fdm.date AND fdm.%I::text = $7::text
                                                    )', v_date_join_column, timeperiod_column, v_date_join_column, timeperiod_column);

                                            EXECUTE query_text
                                            USING NULLIF(l2_record.target_quantity, '')::FLOAT, total_quantity, user_id_int,
                                                  l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id;
                                        END IF;

                                        -- Recalculate eaches
                                        query_text := format('
                                            UPDATE oms.oms_orders_recommended oor
                                            SET order_quantity_eaches = CASE
                                                    WHEN oor.pack_id IS NOT NULL THEN oor.pack_config * oor.order_quantity
                                                    ELSE oor.order_quantity
                                                END,
                                                order_gen_type = ''Edited'',
                                                updated_by     = $5,
                                                updated_at     = CURRENT_TIMESTAMP
                                            WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                                AND oor.article  = $1
                                                AND oor.loc_code = $2
                                                AND oor.pack_id  = $3
                                                AND EXISTS (
                                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                                )', v_date_join_column, timeperiod_column);

                                        EXECUTE query_text
                                        USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int;

                                        RAISE NOTICE 'Successfully updated order quantities for article % at location % with pack ID %',
                                                    l0_record.p_article, l1_record.p_loc_code, l2_record.p_name;
                                    END IF;

                                -- =============================================
                                -- L2 CASE 2: Without-Pack (WP) — ratio or target
                                -- =============================================
                                ELSIF l2_record.p_pack_id IS NOT NULL AND l2_record.p_pack_id = 'WP' THEN

                                    -- ----- L2 WP: Ratio edit -----
                                    IF l2_record.ratio IS NOT NULL AND l2_record.ratio != '' THEN
                                        query_text := format('
                                            UPDATE oms.oms_orders_recommended oor
                                            SET order_quantity = CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER,
                                                order_quantity_eaches = CASE
                                                    WHEN oor.pack_id IS NOT NULL
                                                    THEN oor.pack_config * CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER
                                                    ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER
                                                END,
                                                order_gen_type = ''Edited'',
                                                updated_by     = $6,
                                                updated_at     = CURRENT_TIMESTAMP
                                            WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                                AND oor.article  = $2
                                                AND oor.loc_code = $3
                                                AND oor.size     = $4
                                                AND EXISTS (
                                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $5::text
                                                )', v_date_join_column, timeperiod_column);

                                        EXECUTE query_text
                                        USING NULLIF(l2_record.ratio, ''), l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int;

                                        RAISE NOTICE 'Successfully updated order quantities for article % in time period % using ratio %',
                                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l2_record.ratio;

                                    -- ----- L2 WP: Target quantity edit -----
                                    ELSIF l2_record.target_quantity IS NOT NULL AND l2_record.target_quantity != '' THEN
                                        query_text := format('
                                            SELECT SUM(COALESCE(roq_constrained, 0))::FLOAT
                                            FROM oms.oms_orders_recommended oor
                                            WHERE order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                                AND article  = $1
                                                AND loc_code = $2
                                                AND size     = $3
                                                AND EXISTS (
                                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                                )', v_date_join_column, timeperiod_column);

                                        EXECUTE query_text INTO total_roq_constrained
                                        USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id;

                                        query_text := format('
                                            SELECT COUNT(*)
                                            FROM oms.oms_orders_recommended oor
                                            WHERE order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                                AND article  = $1
                                                AND loc_code = $2
                                                AND size     = $3
                                                AND EXISTS (
                                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                                )', v_date_join_column, timeperiod_column);

                                        EXECUTE query_text INTO record_count
                                        USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id;

                                        IF record_count = 0 THEN
                                            RAISE NOTICE 'No orders found for article % in time period % (column: %) at location %',
                                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                                            RETURN;
                                        END IF;

                                        IF total_roq_constrained IS NULL OR total_roq_constrained = 0 THEN
                                            RAISE NOTICE 'Total roq_constrained is zero for article % in time period % at location %. Using equal split.',
                                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l1_record.p_loc_code;

                                            equal_split_quantity := CEIL(NULLIF(l2_record.target_quantity, '')::INTEGER / record_count::INTEGER)::INTEGER;

                                            query_text := format('
                                                UPDATE oms.oms_orders_recommended oor
                                                SET order_quantity          = $1,
                                                    order_quantity_eaches   = CASE
                                                        WHEN oor.pack_id IS NOT NULL THEN oor.pack_config * $1
                                                        ELSE $1
                                                    END,
                                                    updated_by = $6,
                                                    updated_at = CURRENT_TIMESTAMP
                                                WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                                    AND oor.article  = $2
                                                    AND oor.loc_code = $3
                                                    AND oor.size     = $4
                                                    AND EXISTS (
                                                        SELECT 1 FROM global.fiscal_date_mapping fdm
                                                        WHERE oor.%I = fdm.date AND fdm.%I::text = $5::text
                                                    )', v_date_join_column, timeperiod_column);

                                            EXECUTE query_text
                                            USING equal_split_quantity, l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int;
                                        ELSE
                                            -- FIX 4 (L2 WP target_quantity): updated_by/updated_at/order_gen_type after CASE END
                                            quantity_ratio := NULLIF(l2_record.target_quantity, '')::FLOAT / total_roq_constrained::FLOAT;

                                            query_text := format('
                                                UPDATE oms.oms_orders_recommended oor
                                                SET order_quantity = CASE
                                                        WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                                        ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                                    END,
                                                    updated_by     = $6,
                                                    updated_at     = CURRENT_TIMESTAMP,
                                                    order_gen_type = ''Edited''
                                                WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                                    AND oor.article  = $2
                                                    AND oor.loc_code = $3
                                                    AND oor.size     = $4
                                                    AND EXISTS (
                                                        SELECT 1 FROM global.fiscal_date_mapping fdm
                                                        WHERE oor.%I = fdm.date AND fdm.%I::text = $5::text
                                                    )', v_date_join_column, timeperiod_column);

                                            EXECUTE query_text
                                            USING quantity_ratio, l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int;
                                        END IF;

                                        -- Recalculate eaches
                                        query_text := format('
                                            UPDATE oms.oms_orders_recommended oor
                                            SET order_quantity_eaches = CASE
                                                    WHEN oor.pack_id IS NOT NULL THEN oor.pack_config * oor.order_quantity
                                                    ELSE oor.order_quantity
                                                END,
                                                order_gen_type = ''Edited'',
                                                updated_by     = $5,
                                                updated_at     = CURRENT_TIMESTAMP
                                            WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                                AND oor.article  = $1
                                                AND oor.loc_code = $2
                                                AND oor.size     = $3
                                                AND EXISTS (
                                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                                )', v_date_join_column, timeperiod_column);

                                        EXECUTE query_text
                                        USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int;

                                        RAISE NOTICE 'Successfully updated order quantities for article % in time period % (column: %) at location %',
                                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                                    END IF;

                                -- =============================================
                                -- L2 CASE 3: No pack — ratio edit
                                -- =============================================
                                ELSIF l2_record.ratio IS NOT NULL AND l2_record.ratio != '' THEN
                                    query_text := format('
                                        SELECT COUNT(*)
                                        FROM oms.oms_orders_recommended oor
                                        WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                            AND oor.article  = $1
                                            AND oor.loc_code = $2
                                            AND oor.size     = $3
                                            AND EXISTS (
                                                SELECT 1 FROM global.fiscal_date_mapping fdm
                                                WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                            )', v_date_join_column, timeperiod_column);

                                    EXECUTE query_text INTO record_count
                                    USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id;

                                    IF record_count = 0 THEN
                                        RAISE NOTICE 'No orders found for article % in time period % (column: %)',
                                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column;
                                        RETURN;
                                    END IF;

                                    query_text := format('
                                        UPDATE oms.oms_orders_recommended oor
                                        SET order_quantity = CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER,
                                            order_quantity_eaches = CASE
                                                WHEN oor.pack_id IS NOT NULL
                                                THEN oor.pack_config * CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER
                                                ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER
                                            END,
                                            order_gen_type = ''Edited'',
                                            updated_by     = $6,
                                            updated_at     = CURRENT_TIMESTAMP
                                        WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                            AND oor.article  = $2
                                            AND oor.loc_code = $3
                                            AND oor.size     = $4
                                            AND EXISTS (
                                                SELECT 1 FROM global.fiscal_date_mapping fdm
                                                WHERE oor.%I = fdm.date AND fdm.%I::text = $5::text
                                            )', v_date_join_column, timeperiod_column);

                                    EXECUTE query_text
                                    USING NULLIF(l2_record.ratio, ''), l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int;

                                    RAISE NOTICE 'Successfully updated order quantities for article % in time period % using ratio %',
                                                l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l2_record.ratio;

                                -- =============================================
                                -- L2 CASE 4: No pack — target quantity edit
                                -- =============================================
                                ELSIF l2_record.target_quantity IS NOT NULL AND l2_record.target_quantity != '' THEN
                                    query_text := format('
                                        SELECT SUM(COALESCE(roq_constrained, 0))::FLOAT
                                        FROM oms.oms_orders_recommended oor
                                        WHERE order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                            AND article  = $1
                                            AND loc_code = $2
                                            AND size     = $3
                                            AND EXISTS (
                                                SELECT 1 FROM global.fiscal_date_mapping fdm
                                                WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                            )', v_date_join_column, timeperiod_column);

                                    EXECUTE query_text INTO total_roq_constrained
                                    USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id;

                                    query_text := format('
                                        SELECT COUNT(*)
                                        FROM oms.oms_orders_recommended oor
                                        WHERE order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                            AND article  = $1
                                            AND loc_code = $2
                                            AND size     = $3
                                            AND EXISTS (
                                                SELECT 1 FROM global.fiscal_date_mapping fdm
                                                WHERE oor.%I = fdm.date AND fdm.%I::text = $4::text
                                            )', v_date_join_column, timeperiod_column);

                                    EXECUTE query_text INTO record_count
                                    USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id;

                                    IF record_count = 0 THEN
                                        RAISE NOTICE 'No orders found for article % in time period % (column: %) at location %',
                                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                                        RETURN;
                                    END IF;

                                    IF total_roq_constrained IS NULL OR total_roq_constrained = 0 THEN
                                        RAISE NOTICE 'Total roq_constrained is zero for article % in time period % at location %. Using equal split.',
                                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l1_record.p_loc_code;

                                        equal_split_quantity := CEIL(NULLIF(l2_record.target_quantity, '')::INTEGER / record_count::INTEGER)::INTEGER;

                                        query_text := format('
                                            UPDATE oms.oms_orders_recommended oor
                                            SET order_quantity          = $1,
                                                order_quantity_eaches   = CASE
                                                    WHEN oor.pack_id IS NOT NULL THEN oor.pack_config * $1
                                                    ELSE $1
                                                END,
                                                updated_by = $6,
                                                updated_at = CURRENT_TIMESTAMP
                                            WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                                AND oor.article  = $2
                                                AND oor.loc_code = $3
                                                AND oor.size     = $4
                                                AND EXISTS (
                                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $5::text
                                                )', v_date_join_column, timeperiod_column);

                                        EXECUTE query_text
                                        USING equal_split_quantity, l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int;
                                    ELSE
                                        quantity_ratio := NULLIF(l2_record.target_quantity, '')::FLOAT / total_roq_constrained::FLOAT;

                                        query_text := format('
                                            UPDATE oms.oms_orders_recommended oor
                                            SET order_quantity = CASE
                                                    WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                                    ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                                END,
                                                order_quantity_eaches = CASE
                                                    WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                                    ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                                END,
                                                order_gen_type = ''Edited'',
                                                updated_by     = $6,
                                                updated_at     = CURRENT_TIMESTAMP
                                            WHERE oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
                                                AND oor.article  = $2
                                                AND oor.loc_code = $3
                                                AND oor.size     = $4
                                                AND EXISTS (
                                                    SELECT 1 FROM global.fiscal_date_mapping fdm
                                                    WHERE oor.%I = fdm.date AND fdm.%I::text = $5::text
                                                )', v_date_join_column, timeperiod_column);

                                        EXECUTE query_text
                                        USING quantity_ratio, l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int;
                                    END IF;

                                    RAISE NOTICE 'Successfully updated order quantities for article % in time period % (column: %) at location %',
                                                l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                                END IF;
                            END LOOP;  -- L2
                        END IF;
                    END LOOP;  -- L1
                END IF;
            END LOOP;  -- L0 (style)
        END LOOP;  -- fiscal_period

        RAISE NOTICE 'All updates completed successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error occurred, rolling back: %', SQLERRM;
        RAISE;
    END;

END;
$function$;
