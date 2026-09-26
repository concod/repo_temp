--liquibase formatted sql
--changeset chandranil.ghosh:matrix_smmary_top_line_edit_8 runOnChange:true stripComments:false splitStatements:false context:MTP-108184 labels:liquibase_project_start_update10
--comment: matrix summary order quantity mismatch fix value mismatch fix

DROP FUNCTION IF EXISTS oms.get_oms_matrix_summary_orders(refcursor, jsonb, text, text, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS oms.get_oms_matrix_summary_orders(refcursor, jsonb, text, text, text, text, text, text, jsonb, text);

/*
 * ============================================================================
 * FUNCTION: oms.get_oms_matrix_summary_orders
 * ============================================================================
 *
 * PURPOSE:
 *   Returns a matrix summary of OMS orders aggregated by product/location
 *   dimensions and time buckets (weekly or monthly), with distribution
 *   percentages calculated across articles within each fiscal period.
 *
 * PARAMETERS:
 *   - input               : Output cursor name
 *   - product_filter      : JSONB filter for product attributes
 *   - agg_level           : Time aggregation level ('W' = weekly, 'M' = monthly)
 *   - agg_type            : Dimension to aggregate (style, choice, channel, DC, size, pack)
 *   - agg_value           : Filter value for channel/DC/size/pack drill-downs
 *   - start_agg_id        : Range filter start (reserved for future use)
 *   - end_agg_id          : Range filter end (reserved for future use)
 *   - kpi                 : KPI metric (raw_roq, roq_unconstrained, roq_constrained, ia_shipment_order_quantity)
 *   - meta                : Additional metadata (reserved for future use)
 *   - roq_date_option     : Date field ('roq_receipt_date' or default order_placement_date)
 *   - distribution_method : Column for distribution_pct (raw_roq, ia_shipment_order_quantity, roq_unconstrained, roq_constrained)
 *
 * RETURNS:
 *   refcursor with rows:
 *   - aggr_column  : Aggregated dimension (article, loc_code, size, or pack_id)
 *   - Extra cols   : pack_id, l3–l5 names, product info (style/choice only)
 *   - fiscal_week  : JSON object { fiscal_period -> { order_quantity, distribution_pct, kpi, flag, ... } }
 *
 * AUTHOR: OMS Team
 * LAST MODIFIED: 2026-02-05
 * ============================================================================
 */

 DROP FUNCTION IF EXISTS oms.get_oms_matrix_summary_orders(
    refcursor, jsonb, text, text, text, text, text, text, jsonb, text, text
);

CREATE OR REPLACE FUNCTION oms.get_oms_matrix_summary_orders(
    input                 refcursor,
    product_filter        jsonb,
    agg_level             text,
    agg_type              text,
    agg_value             text,
    start_agg_id          text,
    end_agg_id            text,
    kpi                   text,
    meta                  jsonb,
    roq_date_option       text,
    distribution_method   text DEFAULT NULL
)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    -- Query building
    v_sql                  text;
    v_product_filter_sql   text;


    -- Aggregation: which column to group by and how to bucket time
    v_agg_column           text;  -- article | loc_code | size | pack_id
    v_fiscal_bucket_column text;  -- fiscal_year_week | fiscal_year_month
    v_fdm_join_on          text;  -- full oor ↔ fdm.date join predicate (aligned with oms_recalculate_available_budget)

    -- Dynamic SELECT / GROUP BY (style/choice add product attributes)
    v_extra_select_columns text := '';
    v_extra_output_columns text := '';
    v_extra_group_by       text := '';

    -- Filters injected into the main query
    v_drill_down_filter    text := '';   -- e.g. AND oor.article = 'X' for channel/DC
    v_order_status_filter  text := '';   -- used only for raw_roq (pending orders)

    -- KPI: SQL expression for the requested metric
    v_kpi_expression       text;

    -- Distribution: column summed for dist_base; partition for distribution_pct
    v_distribution_partition text;
    v_distribution_column   text;

    -- Budget KPI: join and expression (only when kpi is budget-related)
    v_budget_join           text := '';
    -- Same bph↔product hierarchy rule as oms.get_budget_data (bph vs pd → here paf)
    v_budget_bph_match      text;
    -- btp join: W = week only; M = MONTH rows OR WEEK rows under that month (oms.get_budget_data)
    v_budget_btp_time_predicate text;

    -- Limit buckets to the matrix column range — only for budget KPIs (align with HLS / column ids)
    v_fiscal_id_range_filter text := '';

    v_is_budget_kpi         boolean;
    -- base_orders ↔ base_budget merge: full GROUP BY grain (style/choice includes product attrs)
    v_budget_merge_using_extra text := '';
BEGIN
    -- -------------------------------------------------------------------------
    -- INPUT VALIDATION
    -- -------------------------------------------------------------------------

    IF agg_level NOT IN ('W', 'M') THEN
        RAISE EXCEPTION 'Invalid agg_level: %. Expected W (weekly) or M (monthly)', agg_level;
    END IF;

    IF NULLIF(TRIM(agg_type), '') IS NULL THEN
        RAISE EXCEPTION 'agg_type is required and cannot be empty';
    END IF;

    IF NULLIF(TRIM(kpi), '') IS NULL THEN
        RAISE EXCEPTION 'kpi is required and cannot be empty';
    END IF;

    v_is_budget_kpi := kpi IN (
        'planned_budget_cost',
        'planned_budget_qty',
        'available_budget_cost',
        'available_budget_qty'
    );

    IF distribution_method IS NOT NULL
       AND distribution_method NOT IN (
           'raw_roq', 'ia_shipment_order_quantity', 'roq_unconstrained', 'roq_constrained'
       ) THEN
        RAISE EXCEPTION 'Invalid distribution_method: %', distribution_method;
    END IF;

    -- -------------------------------------------------------------------------
    -- DISTRIBUTION METHOD
    -- Which source column is used to compute distribution_pct (share within period).
    -- -------------------------------------------------------------------------

    CASE distribution_method
        WHEN 'raw_roq' THEN
            v_distribution_column := 'oor.raw_roq';
        WHEN 'ia_shipment_order_quantity' THEN
            v_distribution_column := 'oor.ia_shipment_order_quantity';
        WHEN 'roq_unconstrained' THEN
            v_distribution_column := 'oor.roq_unconstrained';
        WHEN 'roq_constrained' THEN
            v_distribution_column := 'oor.roq_constrained';
        ELSE
            v_distribution_column := 'oor.roq_constrained';  -- default
    END CASE;

    -- -------------------------------------------------------------------------
    -- AGGREGATION TYPE
    -- Sets grouping dimension, extra columns (for style/choice), and drill-down filter.
    -- -------------------------------------------------------------------------

    CASE agg_type
        WHEN 'style', 'choice' THEN
            v_agg_column := 'article';
            v_extra_select_columns := ',paf.l1_name
                                       ,paf.l2_name
                                       ,paf.l3_name
                                       ,paf.style_color_desc';
            v_extra_output_columns := ',l1_name
                                       ,l2_name
                                       ,l3_name
                                       ,style_color_desc';
            v_budget_merge_using_extra :=
                ', l1_name, l2_name, l3_name, style_color_desc';
            v_distribution_partition := 'PARTITION BY fiscal_bucket';

        WHEN 'channel', 'DC' THEN
            v_agg_column := 'loc_code';
            v_drill_down_filter := format(' AND oor.article = %L ', agg_value);
            v_distribution_partition := 'PARTITION BY fiscal_bucket';

        WHEN 'size' THEN
            v_agg_column := 'size';
            v_drill_down_filter := format(' AND oor.loc_code = %L ', agg_value);
            v_distribution_partition := 'PARTITION BY fiscal_bucket';

        WHEN 'pack' THEN
            v_agg_column := 'pack_id';
            v_drill_down_filter := format(' AND oor.loc_code = %L ', agg_value);
            v_distribution_partition := 'PARTITION BY fiscal_bucket';

        ELSE
            RAISE EXCEPTION 'Invalid agg_type: %. Expected style, choice, channel, DC, size, or pack', agg_type;
    END CASE;

    -- -------------------------------------------------------------------------
    -- TIME AGGREGATION
    -- Fiscal bucket = week or month; date column = receipt date or placement.
    -- -------------------------------------------------------------------------

    v_fiscal_bucket_column := CASE agg_level
        WHEN 'W' THEN 'fiscal_year_week'
        WHEN 'M' THEN 'fiscal_year_month'
    END;

    -- Budget KPIs only: match recalc/HLS (coalesce receipt + ::date vs fdm.date). Other KPIs: legacy single-column join.
    v_fdm_join_on := CASE roq_date_option
        WHEN 'roq_receipt_date' THEN
            'oor.editable_expected_receipt_date::date = fdm.date'
        ELSE
            'oor.order_placement_date = fdm.date'
    END;

    v_budget_bph_match :=
        '(bph_budget.l0_name IS NULL OR bph_budget.l0_name = paf.l0_name) '
        'AND (bph_budget.l1_name IS NULL OR bph_budget.l1_name = paf.l1_name) '
        'AND (bph_budget.l2_name IS NULL OR bph_budget.l2_name = paf.l2_name) '
        'AND (bph_budget.l3_name IS NULL OR bph_budget.l3_name = paf.l3_name) '
        'AND (bph_budget.l4_name IS NULL OR bph_budget.l4_name = paf.l4_name) '
        'AND (bph_budget.l5_name IS NULL OR bph_budget.l5_name = paf.l5_name)';

    /* Align btp row with matrix fiscal bucket (oms.get_budget_data: W = WEEK only; M = MONTH + child WEEKs). */
    IF v_is_budget_kpi THEN
        IF agg_level = 'W' THEN
            v_budget_btp_time_predicate :=
                '(btp.time_period_type = ''WEEK'' AND btp.time_period_key = fdm.fiscal_year_week::text)';
        ELSE
            v_budget_btp_time_predicate :=
                '((btp.time_period_type = ''MONTH'' AND btp.time_period_key = fdm.fiscal_year_month::text) '
                'OR (btp.time_period_type = ''WEEK'' AND btp.parent_time_period_id IN ( '
                'SELECT btp_m.time_period_id FROM oms.budget_time_periods btp_m '
                'WHERE btp_m.is_active = true AND btp_m.time_period_type = ''MONTH'' '
                'AND btp_m.time_period_key = fdm.fiscal_year_month::text)))';
        END IF;
    END IF;

    -- IF v_is_budget_kpi
    --    AND NULLIF(TRIM(start_agg_id), '') IS NOT NULL
    --    AND NULLIF(TRIM(end_agg_id), '') IS NOT NULL THEN
    --     /* LEAST/GREATEST so swapped UI ids still bound a valid range */
    --     IF agg_level = 'W' THEN
    --         v_fiscal_id_range_filter := format(
    --             ' AND fdm.fiscal_year_week::bigint BETWEEN %s AND %s',
    --             LEAST(trim(start_agg_id)::bigint, trim(end_agg_id)::bigint),
    --             GREATEST(trim(start_agg_id)::bigint, trim(end_agg_id)::bigint)
    --         );
    --     ELSE
    --         v_fiscal_id_range_filter := format(
    --             ' AND fdm.fiscal_year_week::bigint BETWEEN %s AND %s',
    --             LEAST(trim(start_agg_id)::bigint, trim(end_agg_id)::bigint),
    --             GREATEST(trim(start_agg_id)::bigint, trim(end_agg_id)::bigint)
    --         );
    --     END IF;
    -- END IF;

    -- -------------------------------------------------------------------------
    -- KPI EXPRESSION
    -- Single metric per (aggr_column, fiscal_bucket). raw_roq restricts to pending orders.
    -- -------------------------------------------------------------------------

    CASE kpi
        WHEN 'raw_roq' THEN
            v_kpi_expression := 'SUM(DISTINCT oor.raw_roq)';
            --v_order_status_filter := ' AND oor.order_status_id = 0';

        WHEN 'roq_unconstrained' THEN
            v_kpi_expression := 'SUM(DISTINCT oor.roq_unconstrained)';

        WHEN 'roq_constrained' THEN
            v_kpi_expression := 'SUM(DISTINCT oor.roq_constrained)';

        WHEN 'ia_shipment_order_quantity' THEN
            v_kpi_expression := 'SUM(DISTINCT oor.ia_shipment_order_quantity)';

        WHEN 'planned_budget_cost' THEN
            v_kpi_expression := 'SUM(DISTINCT COALESCE(ba.planned_budget_cost, 0))';
            v_budget_join := format(
                ' LEFT JOIN oms.budget_product_hierarchy bph_budget ON bph_budget.loc_code = oor.loc_code AND bph_budget.is_active = true AND (%1$s) LEFT JOIN oms.budget_allocation ba ON ba.hierarchy_id = bph_budget.hierarchy_id LEFT JOIN oms.budget_time_periods btp ON ba.time_period_id = btp.time_period_id AND btp.is_active = true AND (%2$s)',
                v_budget_bph_match,
                v_budget_btp_time_predicate
            );

        WHEN 'planned_budget_qty' THEN
            v_kpi_expression := 'SUM(DISTINCT COALESCE(ba.planned_budget_units, 0))';
            v_budget_join := format(
                ' LEFT JOIN oms.budget_product_hierarchy bph_budget ON bph_budget.loc_code = oor.loc_code AND bph_budget.is_active = true AND (%1$s) LEFT JOIN oms.budget_allocation ba ON ba.hierarchy_id = bph_budget.hierarchy_id LEFT JOIN oms.budget_time_periods btp ON ba.time_period_id = btp.time_period_id AND btp.is_active = true AND (%2$s)',
                v_budget_bph_match,
                v_budget_btp_time_predicate
            );

        WHEN 'available_budget_cost' THEN
            v_kpi_expression := 'SUM(DISTINCT COALESCE(ba.available_budget_cost, 0))';
            v_budget_join := format(
                ' LEFT JOIN oms.budget_product_hierarchy bph_budget ON bph_budget.loc_code = oor.loc_code AND bph_budget.is_active = true AND (%1$s) LEFT JOIN oms.budget_allocation ba ON ba.hierarchy_id = bph_budget.hierarchy_id LEFT JOIN oms.budget_time_periods btp ON ba.time_period_id = btp.time_period_id AND btp.is_active = true AND (%2$s)',
                v_budget_bph_match,
                v_budget_btp_time_predicate
            );

        WHEN 'available_budget_qty' THEN
            v_kpi_expression := 'SUM(DISTINCT COALESCE(ba.available_budget_units, 0))';
            v_budget_join := format(
                ' LEFT JOIN oms.budget_product_hierarchy bph_budget ON bph_budget.loc_code = oor.loc_code AND bph_budget.is_active = true AND (%1$s) LEFT JOIN oms.budget_allocation ba ON ba.hierarchy_id = bph_budget.hierarchy_id LEFT JOIN oms.budget_time_periods btp ON ba.time_period_id = btp.time_period_id AND btp.is_active = true AND (%2$s)',
                v_budget_bph_match,
                v_budget_btp_time_predicate
            );

        ELSE
            -- Fallback: min_order_quantity_style (MOQ); requires extra GROUP BY
            v_kpi_expression := 'MIN(oor.min_order_quantity_style)';
            v_extra_group_by := ',oor.min_order_quantity_style';
    END CASE;

    -- -------------------------------------------------------------------------
    -- PRODUCT FILTER
    -- WHERE clause fragment from product_filter JSONB (ph_master context).
    -- -------------------------------------------------------------------------

    v_product_filter_sql := oms.form_main_table_filters('ph_master', product_filter);

    -- -------------------------------------------------------------------------
    -- DYNAMIC QUERY
    -- Three steps: base aggregation -> distribution_pct -> pivot to JSON.
    -- All placeholders use explicit positions (%n$s / %n$I) so KPI (args 4–5) is not confused with "2nd %s" (that is only v_extra_select_columns).
    --
    -- Budget KPIs: budget joins can fan out oor rows and inflate SUM(order_quantity*).
    -- Aggregate order metrics + dist_base (distribution_method column) in base_orders (no budget join).
    -- kpi from budget only in base_budget. distribution_pct uses same dist_base as non-budget KPIs.
    -- Join on full GROUP BY grain (aggr_column + fiscal_bucket + style/choice columns) so rows do not cross-match.
    -- -------------------------------------------------------------------------

    IF v_is_budget_kpi THEN
        v_sql := format($SQL$
        WITH base_orders AS (
            SELECT
                oor.%1$I                              AS aggr_column,
                fdm.%2$I                              AS fiscal_bucket
                %3$s,

                SUM(oor.order_quantity)             AS order_quantity,
                SUM(oor.order_quantity_eaches)      AS order_quantity_eaches,
                SUM(oor.roq_constrained)            AS order_quantity_original,
                SUM(oor.order_quantity * paf.cost)  AS order_cost,

                CASE
                    WHEN MAX(oor.order_status_id) = 0 THEN 0
                    WHEN MIN(oor.order_status_id) > 0 THEN 2
                    ELSE 1
                END                                AS flag_value,

                SUM(DISTINCT %5$s)                  AS dist_base

            FROM oms.oms_orders_recommended oor
            INNER JOIN global.fiscal_date_mapping fdm
                ON %6$s
            INNER JOIN (
                SELECT *
                FROM global.product_attributes_filter paf
                %7$s
            ) paf
                ON paf.product_code = oor.product_code

            WHERE oor.order_gen_type IN ('Recommended', 'Scenario', 'Edited', 'edited')
                  %9$s
                  %10$s
                  %18$s

            GROUP BY
                oor.%11$I,
                fdm.%12$I
                %13$s
                %14$s
        ),
        base_budget AS (
            SELECT
                oor.%1$I                              AS aggr_column,
                fdm.%2$I                              AS fiscal_bucket
                %3$s,

                %4$s                                  AS kpi

            FROM oms.oms_orders_recommended oor
            INNER JOIN global.fiscal_date_mapping fdm
                ON %6$s
            INNER JOIN (
                SELECT *
                FROM global.product_attributes_filter paf
                %7$s
            ) paf
                ON paf.product_code = oor.product_code
                %8$s

            WHERE oor.order_gen_type IN ('Recommended', 'Scenario', 'Edited', 'edited')
                  %9$s
                  %10$s
                  %18$s

            GROUP BY
                oor.%11$I,
                fdm.%12$I
                %13$s
                %14$s
        ),
        base_aggregation AS (
            SELECT
                o.*,
                COALESCE(b.kpi, 0)                    AS kpi
            FROM base_orders o
            LEFT JOIN base_budget b
                USING (aggr_column, fiscal_bucket%19$s)
        ),

        with_distribution AS (
            SELECT
                ba.*,
                COALESCE(
                    dist_base::numeric / NULLIF(SUM(dist_base) OVER (%15$s), 0),
                    0
                ) AS distribution_pct
            FROM base_aggregation ba
        )

        SELECT
            aggr_column
            %16$s,
            json_object_agg(
                fiscal_bucket,
                jsonb_build_object(
                    'order_quantity',           order_quantity,
                    'order_quantity_original',  order_quantity_original,
                    'order_quantity_eaches',   order_quantity_eaches,
                    'distribution_pct',        distribution_pct,
                    'kpi',                     kpi,
                    'order_cost',              order_cost,
                    'flag',                    flag_value
                ) ORDER BY fiscal_bucket
            ) AS fiscal_week
        FROM with_distribution
        GROUP BY
            aggr_column
            %17$s
        $SQL$,
            v_agg_column,
            v_fiscal_bucket_column,
            v_extra_select_columns,
            v_kpi_expression,
            v_distribution_column,
            v_fdm_join_on,
            v_product_filter_sql,
            v_budget_join,
            v_order_status_filter,
            v_drill_down_filter,
            v_agg_column,
            v_fiscal_bucket_column,
            v_extra_select_columns,
            v_extra_group_by,
            v_distribution_partition,
            v_extra_output_columns,
            v_extra_output_columns,
            v_fiscal_id_range_filter,
            v_budget_merge_using_extra
        );
    ELSE
        v_sql := format($SQL$
        WITH base_aggregation AS (
            -- Step 1: Group by (aggr_column, fiscal_bucket); compute quantities, flag, kpi, dist_base
            SELECT
                oor.%1$I                              AS aggr_column,
                fdm.%2$I                              AS fiscal_bucket
                %3$s,

                SUM(oor.order_quantity)             AS order_quantity,
                SUM(oor.order_quantity_eaches)      AS order_quantity_eaches,
                SUM(oor.roq_constrained)            AS order_quantity_original,
                SUM(oor.order_quantity * paf.cost)  AS order_cost,

                -- 0 = all pending, 2 = all processed, 1 = mixed
                CASE
                    WHEN MAX(oor.order_status_id) = 0 THEN 0
                    WHEN MIN(oor.order_status_id) > 0 THEN 2
                    ELSE 1
                END                                AS flag_value,

                %4$s                                  AS kpi,
                SUM(DISTINCT %5$s)                    AS dist_base

            FROM oms.oms_orders_recommended oor
            INNER JOIN global.fiscal_date_mapping fdm
                ON %6$s
            INNER JOIN (
                SELECT *
                FROM global.product_attributes_filter paf
                %7$s
            ) paf
                ON paf.product_code = oor.product_code
                %8$s

            WHERE oor.order_gen_type IN ('Recommended', 'Scenario', 'Edited', 'edited')
                  %9$s
                  %10$s
                  %18$s

            GROUP BY
                oor.%11$I,
                fdm.%12$I
                %13$s
                %14$s
        ),

        with_distribution AS (
            -- Step 2: distribution_pct = row's dist_base / sum(dist_base) per fiscal_bucket (0 when total is 0)
            SELECT
                ba.*,
                COALESCE(
                    dist_base::numeric / NULLIF(SUM(dist_base) OVER (%15$s), 0),
                    0
                ) AS distribution_pct
            FROM base_aggregation ba
        )

        -- Step 3: One row per aggr_column; fiscal_week = JSON of period -> metrics
        SELECT
            aggr_column
            %16$s,
            json_object_agg(
                fiscal_bucket,
                jsonb_build_object(
                    'order_quantity',           order_quantity,
                    'order_quantity_original',  order_quantity_original,
                    'order_quantity_eaches',   order_quantity_eaches,
                    'distribution_pct',        distribution_pct,
                    'kpi',                     kpi,
                    'order_cost',              order_cost,
                    'flag',                    flag_value
                ) ORDER BY fiscal_bucket
            ) AS fiscal_week
        FROM with_distribution
        GROUP BY
            aggr_column
            %17$s
        $SQL$,
            v_agg_column,
            v_fiscal_bucket_column,
            v_extra_select_columns,
            v_kpi_expression,
            v_distribution_column,
            v_fdm_join_on,
            v_product_filter_sql,
            v_budget_join,
            v_order_status_filter,
            v_drill_down_filter,
            v_agg_column,
            v_fiscal_bucket_column,
            v_extra_select_columns,
            v_extra_group_by,
            v_distribution_partition,
            v_extra_output_columns,
            v_extra_output_columns,
            v_fiscal_id_range_filter
        );
    END IF;

    RAISE NOTICE 'query = %', v_sql;

    OPEN input FOR EXECUTE v_sql;
    RETURN input;
END;
$function$;
