--liquibase formatted sql
--changeset piyush.raj@impactanalytics.co:get_oms_offcycle_order_detailed_dc_summary_spanx_update_v7 runOnChange:true stripComments:false splitStatements:false context:MTP-99268 labels:style_order_summary_vs_test_update_24-2
--comment: added article parameter and enhanced filtering logic similar to update SP
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_offcycle_order_detailed_dc_summary(refcursor, jsonb, jsonb, jsonb, jsonb, text, text);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_offcycle_order_detailed_dc_summary(refcursor, jsonb, jsonb, text, text, text, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_offcycle_order_detailed_dc_summary(input refcursor, product_filter jsonb, store_filter jsonb, date_filter jsonb, meta jsonb, draft_id text, article text DEFAULT NULL::text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_sql TEXT := '';
    v_product_filter_sql text := '';
	v_pa_query text := '';
    v_sa_query text := '';
    v_pa_join text := '';
    v_article_filter text := '';
    v_limit_cls text := '';
    v_sort_cls text := '';
    v_search_cls TEXT := '';
    limit_json jsonb := '{}';
    search_json jsonb := '{}';
    sort_json jsonb := '{}';
    v_size_sort jsonb := NULL;
    v_start_date date := NULL;
    v_end_date date := NULL;
    v_start_week int4 := NULL;
    v_end_week int4 := NULL;
	 v_key TEXT;
    v_values jsonb;
    v_query TEXT := '';
BEGIN
    -- Generate filters similar to update_offcycle_product_details
    -- Note: 'size' and 'article' are direct columns in oms_cof_orders_recommended, not in product_attributes_filter

IF product_filter IS NOT NULL AND jsonb_typeof(product_filter) = 'object' THEN
        FOR v_key, v_values IN
            SELECT key, value
            FROM jsonb_each(product_filter)
        LOOP
            DECLARE val_list text[];
            BEGIN
                SELECT array_agg(val)
                INTO val_list
                FROM jsonb_array_elements_text(v_values->0->'values') AS t(val);

                IF val_list IS NULL OR array_length(val_list, 1) = 0 THEN
                    CONTINUE;
                END IF;

                -- Handle 'size' and 'article' filters directly on oor table, not through product_attributes_filter
                IF v_key IN ('size', 'article') THEN
                    v_sa_query := v_sa_query ||
                        format(' AND oor.%I IN (%s)',
                               v_key,
                               (SELECT string_agg(quote_literal(v), ',') FROM unnest(val_list) v)
                        );
                ELSE
                    -- Other product attributes filtered through product_attributes_filter
                    v_pa_query := v_pa_query ||
                        format(' AND paf.%I IN (%s)',
                               v_key,
                               (SELECT string_agg(quote_literal(v), ',') FROM unnest(val_list) v)
                        );
                END IF;
            END;
        END LOOP;
    END IF;

IF store_filter IS NOT NULL AND jsonb_typeof(store_filter) = 'object' THEN
        FOR v_key, v_values IN
            SELECT key, value
            FROM jsonb_each(store_filter)
        LOOP
            DECLARE val_list text[];
            BEGIN
                SELECT array_agg(val)
                INTO val_list
                FROM jsonb_array_elements_text(v_values->0->'values') AS t(val);

                IF val_list IS NULL OR array_length(val_list, 1) = 0 THEN
                    CONTINUE;
                END IF;

                v_sa_query := v_sa_query ||
                    format(' AND oor.%I IN (%s)',
                           v_key,
                           (SELECT string_agg(quote_literal(v), ',') FROM unnest(val_list) v)
                    );
            END;
        END LOOP;
    END IF;
    
    -- Add article filter if provided
    IF article IS NOT NULL AND article <> '' THEN
        v_article_filter := ' AND oor.article = ' || quote_literal(article);
    END IF;



    -- Parse date_filter if provided
    IF date_filter IS NOT NULL AND jsonb_typeof(date_filter) = 'array' THEN
        SELECT
            CASE WHEN df->>'start_date' <> '' THEN to_date(df->>'start_date','MM-DD-YYYY') END,
            CASE WHEN df->>'end_date' <> '' THEN to_date(df->>'end_date','MM-DD-YYYY') END
        INTO v_start_date, v_end_date
        FROM jsonb_array_elements(date_filter) AS t(df)
        WHERE df->>'attribute_name' = 'deep_dive_dates'
        LIMIT 1;
    END IF;

    -- Convert to fiscal week numbers
    IF v_start_date IS NOT NULL THEN
        SELECT fdm.fiscal_year_week INTO v_start_week
        FROM global.fiscal_date_mapping fdm
        WHERE calendar_date = v_start_date LIMIT 1;
    END IF;

    IF v_end_date IS NOT NULL THEN
        SELECT fdm.fiscal_year_week INTO v_end_week
        FROM global.fiscal_date_mapping fdm
        WHERE calendar_date = v_end_date LIMIT 1;
    END IF;

    -- Extract limit and sort from meta
    search_json := meta;
    IF meta <> '{}' AND meta -> 'limit' IS NOT NULL THEN
        limit_json := meta -> 'limit';
        search_json := search_json - 'limit';
        v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json));
    END IF;

    IF meta IS NOT NULL AND jsonb_typeof(meta) = 'object' AND meta <> '{}'::jsonb THEN
        IF meta->'sort' IS NOT NULL AND jsonb_array_length(meta->'sort') > 0 THEN
            FOR i IN 0..jsonb_array_length(meta->'sort')-1 LOOP
                IF (meta->'sort'->i->>'column') = 'size' THEN
                    v_size_sort := meta->'sort'->i;
                    meta := jsonb_set(meta, '{sort}', (meta->'sort') - i);
                    EXIT;
                END IF;
            END LOOP;
        END IF;
    END IF;

    IF meta <> '{}' AND meta -> 'sort' IS NOT NULL THEN 
        sort_json := meta -> 'sort';
        search_json := search_json - 'sort';
        v_sort_cls := global.form_table_query(jsonb_build_object('sort', sort_json));
    END IF;

    IF search_json IS NOT NULL AND search_json <> '{}'::jsonb THEN
        v_search_cls := global.form_table_query(search_json);
        v_search_cls := COALESCE(v_search_cls, '');
        v_search_cls := trim(v_search_cls);
    END IF;

    -- Build product_attributes_filter JOIN clause if needed
    IF v_pa_query != '' THEN
        v_pa_join := ' INNER JOIN global.product_attributes_filter paf ON paf.article = oor.article ' || v_pa_query;
    END IF;

    --------------------------------------------------------------------
    -- Build SQL with product and store filters
    --------------------------------------------------------------------
    v_sql := '
WITH
article_map AS (
    SELECT
        oor.article,
        oor.product_code,
        oor.loc_code,
        MIN(oor.demand_start_date) AS demand_start_date,
        COALESCE(MAX(oor.demand_end_date), MIN(oor.demand_start_date)) AS demand_end_date
    FROM inventory_smart.oms_cof_orders_recommended oor' || 
    COALESCE(v_pa_join, '') || '
    WHERE oor.draft_id = ' || quote_literal(draft_id) || 
    COALESCE(v_article_filter, '') || 
    COALESCE(v_sa_query, '');
    
    -- Add fiscal week filter to article_map if provided
    IF v_start_week IS NOT NULL AND v_end_week IS NOT NULL THEN
        v_sql := v_sql || ' AND oor.receipt_fiscal_year_week BETWEEN ' || v_start_week || ' AND ' || v_end_week;
    ELSIF v_start_week IS NOT NULL THEN
        v_sql := v_sql || ' AND oor.receipt_fiscal_year_week >= ' || v_start_week;
    ELSIF v_end_week IS NOT NULL THEN
        v_sql := v_sql || ' AND oor.receipt_fiscal_year_week <= ' || v_end_week;
    END IF;
    
    v_sql := v_sql || '
    GROUP BY oor.article, oor.product_code, oor.loc_code
),
timeline_agg AS (
    SELECT
        am.product_code,
        am.loc_code,
        COALESCE(SUM(CASE WHEN tvc.receipt_week = fdm_start.fiscal_year_week THEN tvc.dc_inv ELSE 0 END),0) AS dc_inv,
        COALESCE(SUM(CASE WHEN tvc.receipt_week BETWEEN fdm_start.fiscal_year_week AND fdm_end.fiscal_year_week THEN tvc.predicted_qty ELSE 0 END),0) AS predicted_qty,
        COALESCE(SUM(CASE WHEN tvc.receipt_week BETWEEN fdm_start.fiscal_year_week AND fdm_end.fiscal_year_week THEN tvc.receipt1 ELSE 0 END),0) AS receipt1
    FROM article_map am
    JOIN inventory_smart.oms_cof_timeline_view tvc
      ON tvc.product_code = am.product_code
     AND tvc.loc_code = am.loc_code
     AND tvc.draft_id = ' || quote_literal(draft_id) || '
    JOIN global.fiscal_date_mapping fdm_start
      ON fdm_start.calendar_date::date = am.demand_start_date::date
    JOIN global.fiscal_date_mapping fdm_end
      ON fdm_end.calendar_date::date = am.demand_end_date::date
    GROUP BY am.product_code, am.loc_code
),
child_agg AS (
    SELECT
        oor.loc_code,
        oor.size AS size,
		MIN(ast.order) AS sort_order,
        MIN(oor.id) AS id,
        SUM(oor.elt_projected_safety_stock_cof) AS elt_projected_safety_stock_cof,
        SUM(oor.raw_roq_cof) AS raw_roq_cof,
        SUM(oor.roq_unconstrained_cof) AS unconstrained_roq,
        SUM(ti.receipt1) AS receipt1,
        SUM(ti.dc_inv) AS min_order_quantity_style,
        SUM(oor.order_quantity_cof * paf.cost) AS order_cost,
        SUM(oor.order_quantity_cof) AS order_quantity_cof,
        MIN(oor.adjusted_delivery_date) AS adjusted_delivery_date,
        MIN(oor.projected_delivery_date) AS projected_delivery_date,
        MIN(oor.min_order_quantity_sku) AS min_order_quantity_sku,
        MAX(oor.updated_at) AS updated_at
    FROM inventory_smart.oms_cof_orders_recommended oor
    LEFT JOIN timeline_agg ti
        ON ti.product_code = oor.product_code
       AND ti.loc_code = oor.loc_code
    JOIN global.product_attributes_filter paf
        ON paf.product_code = oor.product_code' || 
        COALESCE(v_pa_query, '') || '
	JOIN inventory_smart.article_status_tag ast 
    ON oor.product_code = ast.product_code
	WHERE oor.draft_id = ' || quote_literal(draft_id) || 
    COALESCE(v_article_filter, '') || 
    COALESCE(v_sa_query, '') || '
      AND oor.is_approved = FALSE';
    
    -- Add fiscal week filter to child_agg if provided
    IF v_start_week IS NOT NULL AND v_end_week IS NOT NULL THEN
        v_sql := v_sql || ' AND oor.receipt_fiscal_year_week BETWEEN ' || v_start_week || ' AND ' || v_end_week;
    ELSIF v_start_week IS NOT NULL THEN
        v_sql := v_sql || ' AND oor.receipt_fiscal_year_week >= ' || v_start_week;
    ELSIF v_end_week IS NOT NULL THEN
        v_sql := v_sql || ' AND oor.receipt_fiscal_year_week <= ' || v_end_week;
    END IF;
    
    v_sql := v_sql || '
    GROUP BY oor.loc_code, oor.size
)
SELECT
    ca.loc_code,	
    SUM(ca.elt_projected_safety_stock_cof) AS elt_projected_safety_stock_cof,
    SUM(ca.raw_roq_cof) AS raw_roq_cof,
    SUM(ca.unconstrained_roq) AS unconstrained_roq,
    SUM(ca.receipt1) AS receipt1,
    SUM(ca.min_order_quantity_style) AS min_order_quantity_style,
    SUM(ca.order_cost) AS order_cost,
    SUM(ca.order_quantity_cof) AS order_quantity_cof,
    SUM(ca.order_cost) / NULLIF(SUM(ca.order_quantity_cof),0)::float4 AS cost,
    MIN(ca.adjusted_delivery_date) AS adjusted_delivery_date,
    MIN(ca.projected_delivery_date) AS projected_delivery_date,
    MIN(ca.min_order_quantity_sku) AS min_order_quantity_sku,
    JSON_AGG(
        JSON_BUILD_OBJECT(
			''id'', ca.id,
            ''size'', ca.size,
			''loc_code'', ca.loc_code,
            ''cost'', CASE WHEN ca.order_quantity_cof = 0 THEN 0 ELSE (ca.order_cost / NULLIF(ca.order_quantity_cof,0))::float4 END,
            ''order_quantity_cof'', ca.order_quantity_cof,
            ''order_cost'', ca.order_cost,
            ''adjusted_delivery_date'', ca.adjusted_delivery_date,
            ''projected_delivery_date'', ca.projected_delivery_date,
            ''raw_roq_cof'', ca.raw_roq_cof,
            ''unconstrained_roq'', ca.unconstrained_roq,
            ''min_order_quantity_style'', ca.min_order_quantity_style,
            ''receipt1'', ca.receipt1,
            ''elt_projected_safety_stock_cof'', ca.elt_projected_safety_stock_cof,
            ''updated_at'', ca.updated_at
        )
        ORDER BY  ca.sort_order , ca.size
    ) AS status_obj
FROM child_agg ca
' || v_search_cls || '
GROUP BY ca.loc_code
' || v_sort_cls  || '
' || v_limit_cls || ';';

    RAISE NOTICE 'v_sql: %', v_sql;

    OPEN input FOR EXECUTE v_sql;
    RETURN input;
END
$function$
;
