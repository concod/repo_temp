--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_gbq_off_cycle_expedite_orders_alerts_query_vs_2 runOnChange:true stripComments:false splitStatements:false context:MTP-127232 labels:get_gbq_off_cycle_expedite_orders_alerts_query
--comment:  Modified the regex to support JSON text with spaces after { or , .
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_gbq_off_cycle_expedite_orders_alerts_query(jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_gbq_off_cycle_expedite_orders_alerts_query(article_loc_data jsonb, bq_dataset text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
/*
    Returns a query string for fetching forecast data for given article and
    location combinations from BigQuery `oms_total_dc_forecast`

    Input:
      - article_loc_data: JSONB product_attribute_query filters
      - bq_dataset: BigQuery project.dataset path
    Output: SQL query string

    Example:
    SELECT inventory_smart.get_gbq_off_cycle_expedite_orders_alerts_query(
        '{"l2_name": [{"type":"list","operator":"in","values":["3020_BRAS-INTIMATE APPAREL"]}]}'::jsonb,
        'spanx-prod.spanx_ingestion_prod'
    );
*/
DECLARE
    v_query TEXT;
    v_pa_sql TEXT;
    m text[];
    inner_brace text;
    bq_list text;
    repl text;
    pat text;
BEGIN
    -- Build filter SQL from product_attribute_query
    v_pa_sql := inventory_smart.form_main_table_filters(
        'oms_orders_recommended_store',
        article_loc_data
    );
    v_pa_sql := v_pa_sql || ' AND pm.product_code is not null';
    IF v_pa_sql IS NOT NULL AND v_pa_sql <> '' THEN
        -- Qualify product_master columns (order: longer / specific names before shorter ones)
        v_pa_sql := REPLACE(v_pa_sql, 'product_lifecycle', 'pm.product_lifecycle');
        v_pa_sql := REPLACE(v_pa_sql, 'l2_name', 'pm.l2_name');
        v_pa_sql := REPLACE(v_pa_sql, 'l3_name', 'pm.l3_name');
        v_pa_sql := REPLACE(v_pa_sql, 'l1_name', 'pm.l1_name');
        v_pa_sql := REPLACE(v_pa_sql, 'l0_name', 'pm.l0_name');
        v_pa_sql := REPLACE(v_pa_sql, 'l6_id', 'pm.l6_id');
        v_pa_sql := REPLACE(v_pa_sql, 'size', 'pm.size');
        v_pa_sql := REPLACE(v_pa_sql, 'loc_code', 'tdc.loc_code');
        /*
          form_main_table_filters emits Postgres: (col::varchar = any('{"a","b"}'::varchar[]))
          BigQuery needs string literals in single quotes: (col IN ('a','b')) or (col = 'a').
          One match per loop; supports ::text/::varchar and JSON text with spaces after { or , .
        */
        pat := E'\\(([a-zA-Z0-9_.]+)::(varchar|text)\\s*=\\s*any\\(''(\{[^'']+\})''::(varchar|text)\\[\\]\\)\\)';
        WHILE v_pa_sql ~ pat LOOP
            m := regexp_match(v_pa_sql, pat);
            EXIT WHEN m IS NULL;
            inner_brace := trim(both ' ' from substring(m[3] from 2 for length(m[3]) - 2));
            bq_list := regexp_replace(inner_brace, '"([^"]*)"', '''\1''', 'g');
            IF strpos(inner_brace, ',') > 0 THEN
                repl := '(' || m[1] || ' IN (' || bq_list || '))';
            ELSE
                repl := '(' || m[1] || ' = ' || bq_list || ')';
            END IF;
            v_pa_sql := regexp_replace(v_pa_sql, pat, repl);
        END LOOP;
    END IF;

    -- Build the BigQuery query for off-cycle expedite orders alerts
    -- lost_sales = SUM(lost_sales) WHERE fiscal_year_week BETWEEN recom_receipt_week AND order_cycle_receipt_week
    -- potencial_sales_gain = SUM(lost_sales) WHERE fiscal_year_week BETWEEN earliest_receipt_week AND order_cycle_receipt_week
    v_query := '
    WITH     first_cycle_date AS (
      SELECT
        product_code,
        loc_code,
        MIN(receipt_date) AS immediate_receipt_date,
         MIN(CASE 
        WHEN LOWER(order_type) = ''order cycle'' 
        THEN receipt_date  END
    ) AS first_order_cycle_receipt_date
      FROM `{bq_schema}.oms_recommendation_input_data`
      WHERE  LOWER(order_type) IN (''immediate'', ''order cycle'')
      GROUP BY product_code, loc_code
    ),
    recom_dates AS (
      SELECT DISTINCT
        o.product_code,
        o.loc_code,
        fd1.fiscal_year_week AS stockout_fyw,
        fd2.fiscal_year_week AS immediate_fyw,
        fd3.fiscal_year_week AS order_cycle_before_fyw,
      FROM `{bq_schema}.oms_orders_recommended` AS o
      LEFT JOIN first_cycle_date AS f
        ON o.product_code = f.product_code
       AND o.loc_code = f.loc_code
      LEFT JOIN `{bq_schema}.fiscal_date_mapping` AS fd1
        ON DATE(o.recom_receipt_date) = fd1.calendar_date
      LEFT JOIN `{bq_schema}.fiscal_date_mapping` AS fd2
        ON DATE(f.immediate_receipt_date) = fd2.calendar_date
      LEFT JOIN `{bq_schema}.fiscal_date_mapping` AS fd3
        ON DATE_SUB(f.first_order_cycle_receipt_date, INTERVAL 7 DAY) = fd3.calendar_date
    ),
    safety_stock_at_recom AS (
      SELECT
        ss.product_code,
        ss.dc_id as loc_code,
        SUM(ss.safety_stock) AS total_safety_stock
      FROM `{bq_schema}.oms_safetystock` AS ss
      JOIN recom_dates AS r
        ON ss.product_code = r.product_code
       AND r.loc_code = ss.dc_id
      where ss.fiscal_year_week = r.stockout_fyw
      GROUP BY ss.product_code,ss.dc_id
    ),
    lost_sales_and_bop AS (
      SELECT
        a.product_code,
        a.loc_code,
        a.channel,
        a.fiscal_year_week,
        a.lost_sales,
        SUM(CASE WHEN a.fiscal_year_week = r.stockout_fyw THEN COALESCE(a.dc_inv_bop_post_allocation, 0) ELSE 0 END)
        OVER (PARTITION BY a.product_code, a.loc_code, a.channel) AS total_bop_inv,
        r.stockout_fyw,
        r.immediate_fyw,
        r.order_cycle_before_fyw
      FROM `{bq_schema}.oms_total_dc_forecast` AS a
      JOIN recom_dates AS r
        ON a.product_code = r.product_code
       AND a.loc_code = r.loc_code
      WHERE a.fiscal_year_week BETWEEN r.stockout_fyw AND r.order_cycle_before_fyw
    ),
    latest_price AS (
      SELECT
        tm.product_code,
        tm.channel,
        AVG(tm.price) AS avg_price
      FROM `{bq_schema}.transaction_master` AS tm
      where date in (select transaction_date FROM `{bq_schema}.dashboard_date_ticker`) 
      GROUP BY 1, 2
    )
    SELECT
      pm.l6_id,
      lsw.loc_code,
      lsw.channel,
      pm.size AS size,
      ROUND(SUM(CASE WHEN lsw.fiscal_year_week BETWEEN lsw.immediate_fyw AND lsw.order_cycle_before_fyw THEN lsw.lost_sales ELSE 0 END), 2) AS potential_sales_gain,
      ROUND(SUM(lsw.lost_sales), 2) AS lost_sales,
      COALESCE(ROUND(SUM(lsw.lost_sales * lp.avg_price), 2), 0) AS revenue,
      ROUND(MAX(ss.total_safety_stock),2) AS safety_stock,
      ROUND(MAX(lsw.total_bop_inv),2) AS bop_inv
    FROM `{bq_schema}.product_master` AS pm
    JOIN lost_sales_and_bop AS lsw
      ON pm.product_code = lsw.product_code
    LEFT JOIN safety_stock_at_recom AS ss
      ON ss.product_code = lsw.product_code
      and ss.loc_code = lsw.loc_code
    LEFT JOIN latest_price AS lp
      ON lp.product_code = lsw.product_code
     AND lp.channel = lsw.channel
    ' || REPLACE(v_pa_sql, 'tdc.', 'lsw.') || '
    GROUP BY pm.l6_id,lsw.loc_code,lsw.channel,pm.size;';
    v_query := REPLACE(v_query, '{bq_schema}', bq_dataset);
    RAISE NOTICE 'v_query %', v_query;
    RETURN v_query;
END;
$function$
;

