--liquibase formatted sql
--changeset chandranil.ghosh:oms_matrix_summary_orders_vs_optimized_figS_12 runOnChange:true stripComments:false splitStatements:false context:MTP-98112 labels:MTP-98112
--comment: added oms_kpi join for min_order_quantity_style kpi


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

begin
    v_pa_sql := inventory_smart.form_main_table_filters(
        'ph_master',
        product_filter
    );
    
    -- Set aggregation type and conditions based on input parameters
    IF $4 = 'style' OR $4 = 'choice' THEN
        v_agg_type := 'article';
        v_agg_cond := ',paf.style_name,paf.l0_name,paf.l1_name,paf.l2_name,paf.l3_name,paf.l4_name';
        v_agg_cond_columns := ',style_name,l0_name,l1_name,l2_name,l3_name,l4_name';
    END IF;
    
    IF $4 = 'channel' OR $4 = 'DC' THEN 
        v_agg_type := 'loc_code';
        v_agg_cond_channel := 'and oor.article = ''' || agg_value || ''' ';
    END IF;
    
    IF $4 = 'size' THEN
        v_agg_type := 'size';
        v_agg_cond_channel := 'and oor.loc_code = ''' || agg_value || ''' ';
        v_agg_cond := v_agg_cond || ', ast."order"';
    END IF;
    
    -- Set aggregation time period
    IF agg_level = 'W' THEN
        v_agg_on := 'fiscal_year_week';
    END IF;
    
    IF agg_level = 'M' THEN
        v_agg_on := 'fiscal_year_month';
    END IF;
   
    -- Conditional joins and KPI calculation based on KPI to optimize performance
    v_join_clause := '';
    
    -- Add oms_kpi join only for safety_stock KPI
    IF kpi = 'safety_stock' OR kpi = 'min_order_quantity_style' THEN
        v_join_clause := v_join_clause || '
            LEFT JOIN inventory_smart.oms_kpi omskpi 
                ON omskpi.product_code = oor.product_code 
                AND omskpi.loc_code = oor.loc_code';
    END IF;
    
    -- Add oms_orders_approved join only for approved_orders and today_approved_order KPIs
    IF kpi IN ('approved_orders', 'today_approved_order') THEN
        v_join_clause := v_join_clause || '
            LEFT JOIN (
                SELECT * 
                FROM inventory_smart.oms_orders_approved ooa 
                INNER JOIN global.fiscal_date_mapping fdm 
                    ON ooa.order_placement_recom_date = fdm.calendar_date
            ) ooam
                ON oor.product_code = ooam.product_code 
                AND oor.loc_code = ooam.loc_code 
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
            LEFT JOIN inventory_smart.oms_po_master opm
                ON oor.product_code = opm.product_code 
                AND oor.loc_code = opm.loc_code 
                AND oor.channel = opm.channel 
                AND oor.fiscal_year_week = opm.fiscal_year_week';
    END IF;
    
    -- Add oms_otb join only for otb and recipt_plan KPIs
    IF kpi IN ('otb', 'recipt_plan') THEN
        v_join_clause := v_join_clause || '
            LEFT JOIN inventory_smart.oms_otb ootb
                ON oor.product_code = ootb.product_code 
                AND oor.loc_code = ootb.loc_code 
                AND oor.channel = ootb.channel 
                AND oor.fiscal_year_week = ootb.fiscal_year_week';
    END IF;
    
    -- Build KPI calculation based on the specific KPI to avoid referencing non-existent tables
    -- Initialize group by extra variable
    v_group_by_extra := '';
    
    -- Set KPI calculation based on the specific KPI
    IF kpi = 'raw_roq' THEN
        v_kpi_calculation := 'sum(oor.raw_roq)';
    ELSIF kpi = 'roq_unconstrained' THEN
        v_kpi_calculation := 'sum(oor.roq_unconstrained)';
    ELSIF kpi = 'approved_orders' THEN
        v_kpi_calculation := 'sum(COALESCE(ooam.order_quantity, 0))';
    ELSIF kpi = 'elt_projected_safety_stock' THEN
        v_kpi_calculation := 'sum(oor.elt_projected_safety_stock)';
    ELSIF kpi = 'order_under_review' THEN
        v_kpi_calculation := 'sum(COALESCE(oor.order_quantity, 0)) FILTER (WHERE oor.order_status_id = -1)';
    ELSIF kpi = 'today_approved_order' THEN
        v_kpi_calculation := 'sum(COALESCE(oor.order_quantity, 0)) FILTER (WHERE oor.order_status_id = 3 AND date(oor.updated_at) = CURRENT_DATE AND date(oor.order_placement_date) = CURRENT_DATE)';
    ELSIF kpi = 'pending_order' THEN
        v_kpi_calculation := 'sum(COALESCE(oor.order_quantity, 0)) FILTER (WHERE oor.order_status_id = 1)';
    ELSIF kpi = 'on_order_recipts' THEN
        v_kpi_calculation := 'sum(COALESCE(opm.oo::int + opm.it::int, 0))';
    ELSIF kpi = 'otb' THEN
        v_kpi_calculation := 'sum(COALESCE(ootb.otb, 0))';
    ELSIF kpi = 'recipt_plan' THEN
        v_kpi_calculation := 'sum(COALESCE(ootb.mfp_units, 0))';
    ELSIF kpi = 'min_order_quantity_style' THEN
        v_kpi_calculation := 'min(COALESCE(oor.min_order_quantity_style, 0))';
    END IF;
    
    -- Set size-specific GROUP BY and ORDER BY clauses
    IF $4 = 'size' THEN
        v_size_group_by := ', "order"';
        v_order_by_clause := 'ORDER BY "order"';
    ELSE
        v_size_group_by := '';
        v_order_by_clause := '';
    END IF;
    -- Build the main SQL query
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
                sum(oor.roq_constrained) AS order_quantity_original,
                ''order_quantity_original'' AS oqo_key,
                ''kpi'' AS kpi_key,
                ''flag'' AS flag_key,
                CASE 
                    WHEN max(oor.order_status_id) = 0 THEN 0
                    WHEN min(oor.order_status_id) > 0 THEN 2
                    ELSE 1
                END AS flag_value,
                ' || v_kpi_calculation || ' AS kpi
            FROM inventory_smart.oms_orders_recommended oor
            INNER JOIN (
                SELECT * 
                FROM global.product_attributes_filter paf 
                ' || v_pa_sql || '
            ) paf ON oor.product_code = paf.product_code
            ' || v_join_clause || '
            WHERE oor.order_gen_type IN (''Recommended'', ''Scenario'', ''Edited'')
                ' || v_agg_cond_channel || '
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
