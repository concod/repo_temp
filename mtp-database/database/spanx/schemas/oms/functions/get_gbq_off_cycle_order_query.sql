--liquibase formatted sql
--changeset raja.duraisamy:get_gbq_off_cycle_order_query runOnChange:true stripComments:false splitStatements:false context:MTP-116652 labels:get_oms_article_loc_aggregated_data_spanx
--comment: Added SP to return query string for article and location aggregated data with order history and constraints
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_gbq_off_cycle_order_query(jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_gbq_off_cycle_order_query(article_loc_data jsonb, bq_dataset text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
/*
	Returns a query string for fetching aggregated order and constraint data 
	for given article and location combinations
	
	Input: 
	  - article_loc_data: JSONB array with article and loc_code combinations
	  - bq_dataset: BigQuery project.dataset path	
	Output: SQL query string

    SELECT inventory_smart.get_gbq_off_cycle_order_query(
        '[{"article": "ART001", "loc_code": "LOC001"}]'::jsonb,
        'spanx-prod.spanx_ingestion_prod'
    );
*/
DECLARE
    v_query TEXT;
    v_article_loc_structs TEXT;
    v_rec RECORD;
    v_first BOOLEAN := TRUE;
    v_escaped_article TEXT;
    v_escaped_loc_code TEXT;
BEGIN
    -- Build the UNNEST array of STRUCTs for article and loc_code combinations
    -- This is more efficient than UNION ALL for BigQuery
    v_article_loc_structs := '';
    
    FOR v_rec IN 
        SELECT 
            (elem::jsonb->>'article')::text AS article,
            (elem::jsonb->>'loc_code')::text AS loc_code
        FROM jsonb_array_elements(article_loc_data) AS elem
    LOOP
        -- Escape single quotes in article and loc_code values
        v_escaped_article := REPLACE(v_rec.article, '''', '''''');
        v_escaped_loc_code := REPLACE(v_rec.loc_code, '''', '''''');
        
        IF v_first THEN
            v_article_loc_structs := v_article_loc_structs || format('        STRUCT(''%s'' AS article, ''%s'' AS loc_code)', 
                                                                      v_escaped_article, v_escaped_loc_code);
            v_first := FALSE;
        ELSE
            v_article_loc_structs := v_article_loc_structs || format(E',\n        STRUCT(''%s'' AS article, ''%s'' AS loc_code)', 
                                                                      v_escaped_article, v_escaped_loc_code);
        END IF;
    END LOOP;

    -- Build the complete BigQuery query using UNNEST instead of UNION ALL
    v_query := format('
    WITH article_loc_input AS (
        SELECT * FROM UNNEST([
%s
        ])
    ),
	max_order_dates AS (
    SELECT
        pm.article,
        ali.loc_code,
        MAX(oora.order_placement_date) AS max_order_placement_date
    FROM
        ' || bq_dataset || '.product_master AS pm
    JOIN
        article_loc_input AS ali
        ON pm.article = ali.article
    LEFT JOIN 
        ' || bq_dataset || '.oms_orders_recommended_archive AS oora 
        ON pm.article = oora.article 
        AND oora.loc_code = ali.loc_code
    WHERE oora.order_placement_date IS NOT NULL
    GROUP BY
        pm.article,
        ali.loc_code
	),
    last_order_quantities AS (
      SELECT
        ali.article,
        ali.loc_code,
        COALESCE(SUM(oora.order_quantity), 0) AS order_quantity
      FROM
        ' || bq_dataset || '.product_master AS pm
      JOIN
        article_loc_input AS ali
          ON pm.article = ali.article
      INNER JOIN
        max_order_dates AS mod
        ON pm.article = mod.article
        AND ali.loc_code = mod.loc_code
      INNER JOIN 
        ' || bq_dataset || '.oms_orders_recommended_archive AS oora 
          ON ali.article = oora.article 
          AND oora.loc_code = ali.loc_code
          AND oora.order_placement_date = mod.max_order_placement_date
      GROUP BY
        ali.article,
        ali.loc_code
    )
    SELECT
      ali.article,
      ali.loc_code,
      mod.max_order_placement_date AS last_order_placement_date,
      CAST(COALESCE(IF(IS_NAN(loq.order_quantity), 0, loq.order_quantity), 0) AS int64) AS last_order_quantity,
      COALESCE(IF(IS_NAN(AVG(slt.sell_through)), 0.0, AVG(slt.sell_through)), 0.0) * 100.0 AS sell_through_pct,
      CAST(COALESCE(IF(IS_NAN(AVG(ROUND(ocvm1.min_replenishment_quantity))), 0, AVG(ROUND(ocvm1.min_replenishment_quantity))), 0) AS int64) AS min_order_quantity_sku,
      CAST(COALESCE(IF(IS_NAN(AVG(ROUND(ocvm2.min_replenishment_quantity))), 0, AVG(ROUND(ocvm2.min_replenishment_quantity))), 0) AS int64) AS min_order_quantity_style_color,
      CAST(COALESCE(IF(IS_NAN(ROUND(AVG(ocvm3.min_replenishment_quantity), 0)), 0, ROUND(AVG(ocvm3.min_replenishment_quantity), 0)), 0) AS int64) AS min_order_quantity_style
    FROM
      ' || bq_dataset || '.product_master AS pm
    JOIN
      article_loc_input AS ali
        ON pm.article = ali.article
    LEFT JOIN
      max_order_dates AS mod
        ON ali.article = mod.article
        AND ali.loc_code = mod.loc_code
    LEFT JOIN
      last_order_quantities AS loq
        ON ali.article = loq.article
        AND ali.loc_code = loq.loc_code
    LEFT JOIN 
      ' || bq_dataset || '.oms_orders_recommended_archive AS oora 
        ON ali.article = oora.article 
        AND oora.loc_code = ali.loc_code
    LEFT JOIN
      ' || bq_dataset || '.ordering_sellthrough AS slt
        ON slt.article = ali.article
        AND slt.product_code = pm.product_code 
        AND slt.loc_code = ali.loc_code
    LEFT JOIN
      ' || bq_dataset || '.oms_constraints_vendor_moq AS ocvm1
        ON ocvm1.product_code = pm.product_code
        AND ocvm1.level_of_application=''applicable_all''
    LEFT JOIN
      ' || bq_dataset || '.oms_constraints_vendor_moq AS ocvm2
        ON ocvm2.product_code = pm.product_code
        AND JSON_VALUE(ocvm2.rcl_dimension, ''$.article'') IS NOT NULL
        AND ocvm2.level_of_application=''sum_all''
    LEFT JOIN
      ' || bq_dataset || '.oms_constraints_vendor_moq AS ocvm3
        ON ocvm3.product_code = pm.product_code
        AND JSON_VALUE(ocvm3.rcl_dimension, ''$.l4_name'') IS NOT NULL
        AND JSON_VALUE(ocvm3.rcl_dimension, ''$.article'') IS NULL
        AND ocvm3.level_of_application=''sum_all''
    GROUP BY
      ali.article,
      ali.loc_code,
      mod.max_order_placement_date,
      loq.order_quantity', v_article_loc_structs)
    || '
    ORDER BY
      article,
      loc_code';

    RETURN v_query;
END;
$function$
;