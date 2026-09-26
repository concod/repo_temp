--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:oms_matrix_summary_orders_carters_optimized_16 runOnChange:true stripComments:false splitStatements:false context:MTP-135352 labels:MTP-135352
--comment: implementing soft delete for oms_orders_approved table

DROP FUNCTION IF EXISTS inventory_smart.get_oms_matrix_summary_orders(refcursor, jsonb, text, text, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_matrix_summary_orders(refcursor, jsonb, text, text, text, text, text, text, jsonb, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_matrix_summary_orders(input refcursor, product_filter jsonb, agg_level text, agg_type text, agg_value text, start_agg_id text, end_agg_id text, kpi text, jsonb, roq_date_option text, distribution_method text DEFAULT NULL)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
   Get orders from the inventory_smart.oms_orders_recommended as per product, ROP and order status and type filters 
   Parameres :
               $1: Refcursor
               $2: Product Filter
               $3: aggregation level
               $4: start_agg_id
               $5: end_agg_id
               $6: table filter
               
   
  Usage:
  select
      *
   from
       inventory_smart.get_oms_recommended_orders(
       'my_cur',
       '{
           "l0_name": [{"type": "list","operator": "in", "values": ["101_BRIDAL"]}],
           "l1_name" : [],
           "l2_name" : [],
           "product_description" : [],
           "planning_ownership" : [],
           "merchandise_category" :[],
           "merchandise_brand": []
        }',
        '[{"attribute_name": "ROP", "start_date": "0001-01-01", "end_date": "9999-12-31"}, {"attribute_name": "recom_receipt_date", "start_date": "0001-01-01", "end_date": "9999-12-31"}]',
         0,
         '{
           "search": [],
           "sort": [],
           "range": [],
           "limit": {
                      "limit": 10,
                       "page": 2
                    }
       }',
       'R',
       0
      );
  fetch all in "my_cur";
 */
 declare
    v_recommended_orders_sql      text := '';
    v_pa_sql                      text := '';
    v_agg_on                      text := '';
    v_agg_type                    text := '';
    v_agg_cond                    text := '';
    v_range                       text := '';
    v_meta_cls                    text := '';
    groupby_additional_condition  text := '';
    v_agg_cond_columns           text := '';
    v_agg_cond_channel           text := '';
    v_join_clause                text := '';
    v_kpi_calculation            text := '';
    v_group_by_extra             text := '';
    v_order_by_clause            text := '';
    v_size_group_by              text := '';
    v_from_sql                    text := '';
    v_flag_case_sql               text := '';

begin
    -- Get product filter conditions
    v_pa_sql := inventory_smart.form_main_table_filters(
        'ph_master',
        product_filter
    );
    
    -- Set aggregation type and conditions based on input parameters
    IF $4 = 'style' OR $4 = 'choice' THEN
        v_agg_type := 'style';
        v_agg_cond:=',paf.l2_name,paf.l3_name,paf.l4_name,paf.l5_name,paf.class,paf.season,paf.style_description';
        v_agg_cond_columns:=',l2_name,l3_name,l4_name,l5_name,class,season,style_description';
    END IF;

    IF kpi = 'on_order_recipts' THEN
        v_agg_cond := replace(v_agg_cond, 'paf.', 'oor.');
    END IF;
    
    IF $4 = 'channel' OR $4 = 'DC' THEN 
        v_agg_type := 'channel';
        v_agg_cond_channel := 'and oor.style = ''' || agg_value || ''' ';
    END IF;
    
    IF $4 = 'size' THEN
        v_agg_type := 'size';
        v_agg_cond_channel := 'and oor.channel = ''' || agg_value || ''' ';
        v_agg_cond := v_agg_cond || ', ast."order"';
    END IF;
    
    -- Set aggregation time period
    IF agg_level = 'W' THEN
        v_agg_on := 'fiscal_year_week';
    END IF;
    
    IF agg_level = 'M' THEN
        v_agg_on := 'fiscal_year_month';
    END IF;
   
    -- Initialize join clause
    v_join_clause := '';

    -- Default FROM/JOIN clause and flag logic (used for most KPIs)
    v_from_sql := '
            FROM inventory_smart.oms_orders_recommended oor
            INNER JOIN (
                SELECT * 
                FROM global.product_attributes_filter paf 
                ' || v_pa_sql || '
            ) paf ON oor.product_code = paf.product_code
    ';
    v_flag_case_sql := '
                CASE 
                    WHEN max(oor.order_status_id) = 0 THEN 0
                    WHEN min(oor.order_status_id) > 0 THEN 2
                    ELSE 1
                END AS flag_value,
    ';
    
    -- Add conditional joins based on KPI type
    -- Add oms_kpi join only for safety_stock KPI
    IF kpi = 'safety_stock' THEN
        v_join_clause := v_join_clause || '
            LEFT JOIN inventory_smart.oms_kpi omskpi 
                ON omskpi.product_code = oor.product_code 
                AND omskpi.channel = oor.channel';
    END IF;
    
    -- Add oms_orders_approved join only for approved_orders and today_approved_order KPIs
    IF kpi IN ('approved_orders', 'today_approved_order') THEN
        v_join_clause := v_join_clause || '
            LEFT JOIN (
                SELECT * 
                FROM inventory_smart.oms_orders_approved ooa 
                INNER JOIN global.fiscal_date_mapping fdm 
                    ON ooa.order_placement_recom_date = fdm.calendar_date
                WHERE ooa.is_deleted IS NOT TRUE
            ) ooam
                ON oor.product_code = ooam.product_code 
                AND oor.channel = ooam.channel 
                AND oor.vendor_code = ooam.vendor_code 
                AND oor.fiscal_year_week = ooam.fiscal_year_week';
    END IF;
    
    -- Add article_status_tag join only when agg_type is 'size'
    IF $4 = 'size' THEN
        v_join_clause := v_join_clause || '
            LEFT JOIN (
                SELECT product_code, size, MIN("order") AS "order"
                FROM inventory_smart.article_status_tag
                GROUP BY product_code, size
            ) ast
                ON ast.size = oor.size 
                AND ast.product_code = oor.product_code';
    END IF;
    
    -- Add oms_po_master join only for on_order_recipts KPI
    IF kpi = 'on_order_recipts' THEN
        v_join_clause := v_join_clause || '
            LEFT JOIN (
                SELECT
                    product_code,
                    channel,
                    fiscal_year_week,
                    sum(coalesce(oo::int, 0) + coalesce(it::int, 0)) as on_order_receipts
                FROM inventory_smart.oms_po_master
                WHERE po_id != ''-''
                GROUP BY 1, 2, 3
            ) opm
                ON oor.product_code = opm.product_code 
                AND oor.channel = opm.channel 
                AND oor.fiscal_year_week = opm.fiscal_year_week';

        -- Dedupe oor rows at SKU+channel+week (prevents multiplying joined KPI values)
        -- Keep both fiscal_year_week and fiscal_year_month available so agg_level W/M works
        v_from_sql := '
            FROM (
                SELECT
                    oor0.product_code,
                    oor0.channel,
                    oor0.fiscal_year_week,
                    oor0.fiscal_year_month,
                    paf.style,
                    paf.l2_name,
                    paf.l3_name,
                    paf.l4_name,
                    paf.l5_name,
                    paf.class,
                    paf.season,
                    paf.style_description,
                    sum(oor0.order_quantity) as order_quantity,
                    sum(oor0.roq_unconstrained) as roq_unconstrained,
                    max(oor0.order_status_id) as order_status_id_max,
                    min(oor0.order_status_id) as order_status_id_min
                FROM inventory_smart.oms_orders_recommended oor0
                INNER JOIN (
                    SELECT * 
                    FROM global.product_attributes_filter paf 
                    ' || v_pa_sql || '
                ) paf ON oor0.product_code = paf.product_code
                WHERE oor0.order_gen_type IN (''Recommended'', ''Scenario'', ''Edited'')
                    ' || replace(v_agg_cond_channel, 'oor.', 'oor0.') || '
                GROUP BY
                    oor0.product_code,
                    oor0.channel,
                    oor0.fiscal_year_week,
                    oor0.fiscal_year_month,
                    paf.style,
                    paf.l2_name,
                    paf.l3_name,
                    paf.l4_name,
                    paf.l5_name,
                    paf.class,
                    paf.season,
                    paf.style_description
            ) oor
        ';

        v_flag_case_sql := '
                CASE 
                    WHEN max(oor.order_status_id_max) = 0 THEN 0
                    WHEN min(oor.order_status_id_min) > 0 THEN 2
                    ELSE 1
                END AS flag_value,
        ';
    END IF;
    
    -- Add oms_otb join only for otb and recipt_plan KPIs
    IF kpi IN ('otb', 'recipt_plan') THEN
        v_join_clause := v_join_clause || '
            LEFT JOIN inventory_smart.oms_otb ootb
                ON oor.product_code = ootb.product_code 
                AND oor.channel = ootb.channel 
                AND oor.channel = ootb.channel 
                AND oor.fiscal_year_week = ootb.fiscal_year_week';
    END IF;
    
    -- Set KPI calculation based on the specific KPI
    IF kpi = 'raw_roq' THEN
        v_kpi_calculation := 'sum(oor.raw_roq)';
    ELSIF kpi = 'roq_unconstrained' THEN
        v_kpi_calculation := 'sum(oor.roq_unconstrained)';
    ELSIF kpi = 'roq_constrained' THEN
        v_kpi_calculation := 'sum(oor.roq_constrained)';
    ELSIF kpi = 'approved_orders' THEN
        v_kpi_calculation := 'sum(COALESCE(ooam.order_quantity, 0))';
    ELSIF kpi = 'safety_stock' THEN
        v_kpi_calculation := 'sum(omskpi.safety_stock)';
    ELSIF kpi  = 'elt_projected_safety_stock' then
        v_kpi_calculation :='sum(oor.elt_projected_safety_stock)';
    ELSIF kpi = 'order_under_review' THEN
        v_kpi_calculation := 'sum(COALESCE(oor.order_quantity, 0)) FILTER (WHERE oor.order_status_id = -1)';
    ELSIF kpi = 'today_approved_order' THEN
        v_kpi_calculation := 'sum(COALESCE(oor.order_quantity, 0)) FILTER (WHERE oor.order_status_id = 3 AND date(oor.order_placement_date) = CURRENT_DATE AND oor.is_deleted = TRUE)';
    ELSIF kpi = 'pending_order' THEN
        v_kpi_calculation := 'sum(COALESCE(oor.order_quantity, 0)) FILTER (WHERE oor.order_status_id = 1)';
    ELSIF kpi = 'on_order_recipts' THEN
        v_kpi_calculation := 'sum(COALESCE(opm.on_order_receipts, 0))';
    ELSIF kpi = 'otb' THEN
        v_kpi_calculation := 'sum(COALESCE(ootb.otb, 0))';
    ELSIF kpi = 'recipt_plan' THEN
        v_kpi_calculation := 'sum(COALESCE(ootb.mfp_units, 0))';
    ELSIF kpi = 'min_order_quantity_style' AND $4 = 'channel' THEN 
        v_kpi_calculation := 'min(oor.min_order_quantity_style)';
        v_group_by_extra := ', oor.min_order_quantity_style';
    ELSIF kpi = 'min_order_quantity_style' AND $4 = 'size' THEN
        v_kpi_calculation := 'min(oor.min_order_quantity_shipment)';
        v_group_by_extra := ', oor.min_order_quantity_shipment';
    ELSIF kpi = 'min_order_quantity_style' THEN
        v_kpi_calculation := 'min(oor.min_order_quantity_style)';
        v_group_by_extra := ', oor.min_order_quantity_style';
    ELSIF kpi = 'min_order_quantity_channel' THEN
        v_kpi_calculation := 'null'; -- No direct min_order_quantity_channel in oms_orders_recommended
    ELSIF kpi = 'min_order_quantity_size' THEN
        v_kpi_calculation := 'min(oor.min_order_quantity_shipment)';
    ELSE
        v_kpi_calculation := 'oor.min_order_quantity_sku';
        v_group_by_extra := ', oor.min_order_quantity_sku';
    END IF;
    
    -- Set size-specific GROUP BY and ORDER BY clauses
    IF $4 = 'size' THEN
        v_size_group_by := ', "order"';
        v_order_by_clause := 'ORDER BY "order"';
    ELSIF $4 = 'channel' AND kpi = 'min_order_quantity_style' THEN
		v_kpi_calculation := '''-''';
    ELSE
        v_size_group_by := '';
        v_order_by_clause := '';
    END IF;

    -- Build the main SQL query with improved formatting
    v_recommended_orders_sql := '
        SELECT 
            ' || v_agg_type || ' AS aggr_column ' || v_agg_cond_columns || ',
            json_object_agg(' || v_agg_on || ', jsonb_build_object(
                oq_key, order_quantity,
                oqo_key, order_quantity_original,
                kpi_key, kpi,
                flag_key, flag_value
            )) AS fiscal_week
        FROM (
            SELECT 
                oor.' || v_agg_type || ',
                oor.' || v_agg_on || ' ' || v_agg_cond || ',
                sum(oor.order_quantity) AS order_quantity,
                ''order_quantity'' AS oq_key,
                sum(oor.roq_unconstrained) AS order_quantity_original,
                ''order_quantity_original'' AS oqo_key,
                ''kpi'' AS kpi_key,
                ''flag'' AS flag_key,
                ' || v_flag_case_sql || '
                ' || v_kpi_calculation || ' AS kpi
            ' || v_from_sql || '
            ' || v_join_clause || '
            WHERE 1 = 1
            ' || CASE WHEN kpi = 'on_order_recipts' THEN '' ELSE '                AND oor.order_gen_type IN (''Recommended'', ''Scenario'', ''Edited'')
                ' || v_agg_cond_channel || '
' END || '
            GROUP BY oor.' || v_agg_type || ', oor.' || v_agg_on || ' ' || v_agg_cond || v_group_by_extra || '
        ) X 
        GROUP BY ' || v_agg_type || ' ' || v_agg_cond_columns || ' ' || v_size_group_by || '
        ' || v_order_by_clause || '
    ';
    
    -- Debug output
    RAISE NOTICE 'v_recommended_orders_sql %', v_recommended_orders_sql;
    
    -- Execute the query
    OPEN $1 FOR EXECUTE v_recommended_orders_sql;
    RETURN v_recommended_orders_sql;
    
END
$function$
;
