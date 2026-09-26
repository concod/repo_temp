--liquibase formatted sql
--changeset aman.pareek:flag_logic_1 runOnChange:true stripComments:false splitStatements:false context:MTP-74458 labels:MTP-130535
--comment: Sum order quantities across order_status_id groups so style totals match channel rollups (MTP-134776)

DROP FUNCTION IF EXISTS inventory_smart.get_oms_matrix_summary_orders(refcursor, jsonb, text, text, text, text, text, text, jsonb);

DROP FUNCTION IF EXISTS inventory_smart.get_oms_matrix_summary_orders(refcursor, jsonb, text, text, text, text, text, text, jsonb, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_matrix_summary_orders(input refcursor, product_filter jsonb, agg_level text, agg_type text, agg_value text, start_agg_id text, end_agg_id text, kpi text, jsonb, roq_date_option text, distribution_method text DEFAULT NULL)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_recommended_orders_sql text := '';
    v_pa_sql text := '';
    v_agg_on text := '';
    v_agg_type text := '';
    v_agg_cond text := '';
    v_agg_cond_columns text := '';
    v_agg_cond_channel text := '';
    v_agg_final_columns text := '';
    v_moq_column text := 'min_order_quantity_style';  -- ✅ default
BEGIN
    v_pa_sql := inventory_smart.form_main_table_filters(
        'ph_master',
        product_filter
    );

    /* ---------------- Aggregation Type ---------------- */
    IF agg_type IN ('style', 'choice') THEN
        v_agg_type := 'article';
        v_agg_cond :=
            ',oor.pack_id,oor.loc_code,paf.l3_name,paf.l4_name,paf.l5_name,
             paf.product_description,paf.product_type,paf.product_attribute_8,
             paf.primary_vendor_name';
        v_agg_cond_columns :=
            ',pack_id,loc_code,l3_name,l4_name,l5_name,
             product_description,product_type,product_attribute_8,
             primary_vendor_name';
        v_agg_final_columns :=
            ',l3_name,l4_name,l5_name,
             product_description,product_type,product_attribute_8,
             primary_vendor_name';
    END IF;

    IF agg_type IN ('channel', 'DC') THEN
        v_agg_type := 'loc_code';
        v_agg_cond := ',oor.pack_id';
        v_agg_cond_columns := ',pack_id';
        v_agg_cond_channel := 'AND oor.article = ''' || agg_value || ''' ';
        v_moq_column := 'min_order_quantity_sku'; 
    END IF;

    IF agg_type = 'size' THEN
        v_agg_type := 'size';
        v_agg_cond_channel := 'AND oor.loc_code = ''' || agg_value || ''' ';
        v_moq_column := 'min_order_quantity_sku'; 
    END IF;

    IF agg_type = 'pack' THEN
        v_agg_type := 'pack_id';
        v_agg_cond_channel := 'AND oor.loc_code = ''' || agg_value || ''' ';
        v_moq_column := 'min_order_quantity_sku'; 
    END IF;

    /* ---------------- Aggregation Level ---------------- */
    IF agg_level = 'W' THEN
        v_agg_on := 'fiscal_year_week';
    ELSIF agg_level = 'M' THEN
        v_agg_on := 'fiscal_year_month';
    END IF;

    /* ---------------- Dynamic SQL ---------------- */
    v_recommended_orders_sql := '
    WITH product_filter AS (
        SELECT *
        FROM "global".product_attributes_filter paf ' || v_pa_sql || '
    ),
    base_data AS (
        SELECT
            oor.' || v_agg_type || ',
            oor.' || v_agg_on || '
            ' || v_agg_cond || ',
            oor.order_quantity,
            oor.order_quantity_eaches,
            oor.roq_constrained,
            oor.order_status_id,
            oor.' || v_moq_column || ' AS min_order_quantity,
            oor.raw_roq,
            oor.pack_id AS pack_identifier,
            oor.roq_unconstrained,
            COALESCE(oor.elt_projected_safety_stock, 0) AS safety_stock
        FROM inventory_smart.oms_orders_recommended oor
        INNER JOIN product_filter paf
            ON oor.product_code = paf.product_code
        WHERE
            oor.order_gen_type IN (''Recommended'',''Scenario'',''Edited'',''edited'')
            ' || v_agg_cond_channel || '
            AND oor.fiscal_year_week BETWEEN ' || start_agg_id || ' AND ' || end_agg_id || '
    ),
    distinct_combinations AS (
        SELECT
            ' || v_agg_type || ',
            ' || v_agg_on || '
            ' || v_agg_cond_columns || ',
            CASE
                WHEN MAX(pack_identifier) IS NOT NULL AND MAX(pack_identifier) <> ''WP''
                    THEN SUM(DISTINCT order_quantity)
                ELSE SUM(order_quantity)
            END AS aggregated_order_quantity,
            CASE
                WHEN MAX(pack_identifier) IS NOT NULL
                    THEN SUM(order_quantity_eaches)
                ELSE SUM(order_quantity)
            END AS aggregated_order_quantity_eaches,
            SUM(DISTINCT roq_constrained) AS roq_constrained,
            MIN(order_status_id) AS min_order_status_id,
            CASE
                WHEN MAX(order_status_id) = 0 THEN 0
                WHEN MIN(order_status_id) > 0 THEN 2
                ELSE 1
            END AS flag_value,
            MAX(min_order_quantity) AS min_order_quantity,
            MAX(raw_roq) AS raw_roq,
            MAX(pack_identifier) AS pack_identifier,
            MAX(roq_unconstrained) AS roq_unconstrained,
            SUM(safety_stock) AS safety_stock
        FROM base_data
        GROUP BY
            ' || v_agg_type || ',
            ' || v_agg_on || '
            ' || v_agg_cond_columns || '
    ),
    final_aggregation AS (
        SELECT
            ' || v_agg_type || ',
            ' || v_agg_on || '
            ' || v_agg_final_columns || ',
            SUM(aggregated_order_quantity) AS aggregated_order_quantity,
            SUM(aggregated_order_quantity_eaches) AS aggregated_order_quantity_eaches,
            SUM(DISTINCT roq_constrained) AS order_quantity_original,
            MAX(pack_identifier) AS pack_identifier,
            CASE
                WHEN MIN(flag_value) = MAX(flag_value) THEN MIN(flag_value)
                ELSE 1
            END AS flag_value,
            CASE
                WHEN ''' || kpi || ''' = ''raw_roq'' THEN SUM(raw_roq)
                WHEN ''' || kpi || ''' = ''roq_unconstrained'' THEN SUM(roq_unconstrained)
                WHEN ''' || kpi || ''' = ''order_quantity''
                    THEN SUM(aggregated_order_quantity)
                        FILTER (WHERE min_order_status_id = 3)
                WHEN ''' || kpi || ''' = ''safety_stock'' THEN SUM(safety_stock)
                WHEN ''' || kpi || ''' = ''min_order_quantity_style''
                    THEN AVG(min_order_quantity)
                ELSE AVG(min_order_quantity)
            END AS kpi
        FROM distinct_combinations
        GROUP BY
            ' || v_agg_type || ',
            ' || v_agg_on || '
            ' || v_agg_final_columns || '
    )
    SELECT
        ' || v_agg_type || ' AS aggr_column
        ' || v_agg_final_columns || ',
        MAX(pack_identifier) AS pack_identifier,
        json_object_agg(
            ' || v_agg_on || ',
            jsonb_build_object(
                ''order_quantity'', aggregated_order_quantity,
                ''order_quantity_eaches'', aggregated_order_quantity_eaches,
                ''order_quantity_original'', order_quantity_original,
                ''kpi'', kpi,
                ''flag'', flag_value
            )
        ) AS fiscal_week
    FROM final_aggregation
    GROUP BY
        ' || v_agg_type || '
        ' || v_agg_final_columns || ';
    ';

    RAISE NOTICE 'v_recommended_orders_sql %', v_recommended_orders_sql;
    OPEN input FOR EXECUTE v_recommended_orders_sql;
    RETURN input;
END
$function$
;
