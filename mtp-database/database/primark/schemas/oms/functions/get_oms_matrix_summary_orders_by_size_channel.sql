    

--liquibase formatted sql
--changeset aman.pareek:extensions_update_size_channel_grouping_update23 runOnChange:true stripComments:false splitStatements:false context:MTP-74127 labels:feature size-channel grouping
--comment: Available budget: GREATEST(0, sum(raw)) after summing allocation values.

DROP FUNCTION IF EXISTS oms.get_oms_matrix_summary_orders_by_size_channel(refcursor, jsonb, text, text, text, text, text, text, jsonb);
CREATE OR REPLACE FUNCTION oms.get_oms_matrix_summary_orders_by_size_channel(input refcursor, product_filter jsonb, agg_level text, agg_type text, agg_value text, start_agg_id text, end_agg_id text, kpi text, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
   Get orders from the oms.oms_orders_recommended as per product, ROP and order status and type filters 
   Grouping: First by size, then by channel for a selected size
   Parameters:
               $1: Refcursor
               $2: Product Filter
               $3: aggregation level
               $4: agg_type ('size' or 'channel')
               $5: agg_value (value for filtering)
               $6: start_agg_id
               $7: end_agg_id
               $8: kpi
               $9: extra jsonb
  */
 DECLARE
    v_recommended_orders_sql text := '';
    v_pa_sql                 text := '';
    v_agg_on                 text := '';
    v_agg_type               text := '';
    v_agg_cond               text := '';
    v_agg_cond_columns       text := '';
    v_agg_cond_size          text := '';
    v_agg_cond_channel       text := '';
    v_join_clause            text := '';
    v_kpi_calculation        text := '';
    v_group_by_extra         text := '';
    v_size_group_by          text := '';
    v_order_by_clause        text := '';
BEGIN
    -- Form the product filter SQL
    v_pa_sql := oms.form_main_table_filters(
        'ph_master',
        product_filter
    );

    -- Set aggregation type and conditions
    IF $4 = 'size' THEN
        v_agg_type := 'size';
        v_agg_cond := ', ast.order';
        v_agg_cond_columns := ', "order"';
    ELSE
        v_agg_type := 'loc_code';
        v_agg_cond := '';
        v_agg_cond_columns := '';
    END IF;

    -- Set channel filter when agg_type is 'channel'
    IF $4 = 'channel' AND agg_value IS NOT NULL AND agg_value != '' THEN
        v_agg_cond_channel := 'AND oor.size = ''' || agg_value || '''';
    ELSE
        v_agg_cond_channel := '';
    END IF;

    -- Set aggregation level (Week or Month)
    IF agg_level = 'W' THEN
        v_agg_on := 'fiscal_year_week';
    ELSIF agg_level = 'M' THEN
        v_agg_on := 'fiscal_year_month';
    END IF;

    -- Initialize join clause
    v_join_clause := '';
    
    -- Add conditional joins based on KPI type
    -- Add oms_kpi join only for safety_stock KPI
    IF kpi = 'safety_stock' THEN
        v_join_clause := v_join_clause || '
            LEFT JOIN oms.oms_kpi omskpi 
                ON omskpi.product_code = oor.product_code 
                AND omskpi.channel = oor.channel';
    END IF;
    
    -- Add oms_orders_approved join only for approved_orders and today_approved_order KPIs
    IF kpi IN ('approved_orders', 'today_approved_order') THEN
        v_join_clause := v_join_clause || '
            LEFT JOIN (
                SELECT * 
                FROM oms.oms_orders_approved ooa 
                INNER JOIN global.fiscal_date_mapping fdm 
                    ON ooa.order_placement_recom_date = fdm.calendar_date
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
                FROM oms.article_status_tag
                GROUP BY product_code, size
            ) ast
                ON ast.size = oor.size 
                AND ast.product_code = oor.product_code';
    END IF;
    
    -- Add oms_po_master join only for on_order_recipts KPI
    IF kpi = 'on_order_recipts' THEN
        v_join_clause := v_join_clause || '
            LEFT JOIN oms.oms_po_master opm
                ON oor.product_code = opm.product_code 
                AND oor.channel = opm.channel 
                AND oor.fiscal_year_week = opm.fiscal_year_week
                AND opm.po_id != ''-''';
    END IF;
    
    -- Add oms_otb join only for otb and recipt_plan KPIs
    IF kpi IN ('otb', 'recipt_plan') THEN
        v_join_clause := v_join_clause || '
            LEFT JOIN oms.oms_otb ootb
                ON oor.product_code = ootb.product_code 
                AND oor.channel = ootb.channel 
                AND oor.fiscal_year_week = ootb.fiscal_year_week';
    END IF;

    -- Add budget join for budget KPIs
    IF kpi IN ('planned_budget_cost', 'planned_budget_qty', 'available_budget_cost', 'available_budget_qty') THEN
        v_join_clause := v_join_clause || '
            LEFT JOIN oms.budget_product_hierarchy bph_budget
                ON bph_budget.loc_code = oor.loc_code
                AND bph_budget.is_active = true
                AND (bph_budget.product_code = oor.product_code OR bph_budget.article = oor.article
                     OR (bph_budget.l4_name IS NOT NULL AND bph_budget.l4_name = paf.l2_name)
                     OR (bph_budget.l5_name IS NOT NULL AND bph_budget.l5_name = paf.l3_name))
            LEFT JOIN oms.budget_allocation ba
                ON ba.hierarchy_id = bph_budget.hierarchy_id
            LEFT JOIN oms.budget_time_periods btp
                ON ba.time_period_id = btp.time_period_id
                AND btp.is_active = true
                AND btp.time_period_type = ' || quote_literal(CASE WHEN agg_level = 'W' THEN 'WEEK' ELSE 'MONTH' END) || '
                AND btp.time_period_key = oor.' || v_agg_on;
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
    ELSIF kpi = 'elt_projected_safety_stock' THEN
        v_kpi_calculation := 'sum(oor.elt_projected_safety_stock)';
    ELSIF kpi = 'order_under_review' THEN
        v_kpi_calculation := 'sum(COALESCE(oor.order_quantity, 0)) FILTER (WHERE oor.order_status_id = -1)';
    ELSIF kpi = 'today_approved_order' THEN
        v_kpi_calculation := 'sum(COALESCE(oor.order_quantity, 0)) FILTER (WHERE oor.order_status_id = 3 AND date(oor.order_placement_date) = CURRENT_DATE AND oor.is_deleted = TRUE)';
    ELSIF kpi = 'pending_order' THEN
        v_kpi_calculation := 'sum(COALESCE(oor.order_quantity, 0)) FILTER (WHERE oor.order_status_id = 1)';
    ELSIF kpi = 'on_order_recipts' THEN
        v_kpi_calculation := 'sum(COALESCE(opm.oo::int + opm.it::int, 0))';
    ELSIF kpi = 'otb' THEN
        v_kpi_calculation := 'sum(COALESCE(ootb.otb, 0))';
    ELSIF kpi = 'recipt_plan' THEN
        v_kpi_calculation := 'sum(COALESCE(ootb.mfp_units, 0))';
    ELSIF kpi = 'planned_budget_cost' THEN
        v_kpi_calculation := 'sum(COALESCE(ba.planned_budget_cost, 0))';
    ELSIF kpi = 'planned_budget_qty' THEN
        v_kpi_calculation := 'sum(COALESCE(ba.planned_budget_units, 0))';
    ELSIF kpi = 'available_budget_cost' THEN
        v_kpi_calculation := 'GREATEST(0::numeric, sum(COALESCE(ba.available_budget_cost, 0)))';
    ELSIF kpi = 'available_budget_qty' THEN
        v_kpi_calculation := 'GREATEST(0::numeric, sum(COALESCE(ba.available_budget_units, 0)))';
    ELSIF kpi = 'min_order_quantity_style' AND $4 = 'channel' THEN 
        v_kpi_calculation := 'min(oor.min_order_quantity_shipment)';
        v_group_by_extra := ', oor.min_order_quantity_shipment';
    ELSIF kpi = 'min_order_quantity_style' AND $4 = 'size' THEN
        -- For size aggregation with MOQ, show '-' instead of value
        v_kpi_calculation := '''-''';
    ELSIF kpi = 'min_order_quantity_style' THEN
        v_kpi_calculation := 'min(oor.min_order_quantity_style)';
        v_group_by_extra := ', oor.min_order_quantity_style';
    ELSIF kpi = 'min_order_quantity_channel' THEN
        v_kpi_calculation := 'null'; -- No direct min_order_quantity_channel in oms_orders_recommended
    ELSIF kpi = 'min_order_quantity_size' THEN
        v_kpi_calculation := 'min(oor.min_order_quantity_shipment)';
	ELSIF kpi = 'ia_shipment_order_quantity' THEN
        v_kpi_calculation := 'sum(COALESCE(oor.ia_shipment_order_quantity,0))';
    ELSE
        v_kpi_calculation := 'coalesce(min(oor.min_order_quantity_sku), 0)';
        v_group_by_extra := ', oor.min_order_quantity_sku';
    END IF;
    
    -- Set size-specific GROUP BY and ORDER BY clauses
    IF $4 = 'size' THEN
        v_size_group_by := ', "order"';
        v_order_by_clause := 'ORDER BY "order"';
        v_kpi_calculation := '''-''';
    ELSE
        v_size_group_by := '';
        v_order_by_clause := '';
    END IF;

    -- Build the main SQL query with improved formatting
    v_recommended_orders_sql := '
        SELECT 
            ' || v_agg_type || ' AS aggr_column' || v_agg_cond_columns || ',
            json_object_agg(' || v_agg_on || ', jsonb_build_object(
                ''order_quantity'', order_quantity,
                ''order_quantity_original'', order_quantity_original,
                ''order_quantity_eaches'', order_quantity_eaches,
                ''kpi'', kpi,
                ''flag'', flag_value
            )) AS fiscal_week
        FROM (
            SELECT 
                oor.' || v_agg_type || v_agg_cond || ',
                oor.' || v_agg_on || ',
                sum(oor.order_quantity) AS order_quantity,
                sum(oor.order_quantity_eaches) AS order_quantity_eaches,
                sum(oor.roq_unconstrained) AS order_quantity_original,
                CASE 
                    WHEN max(oor.order_status_id) = 0 THEN 0
                    WHEN min(oor.order_status_id) > 0 THEN 2
                    ELSE 1
                END AS flag_value,
                ' || v_kpi_calculation || ' AS kpi
            FROM oms.oms_orders_recommended oor
            INNER JOIN (
                SELECT * 
                FROM global.product_attributes_filter paf 
                ' || v_pa_sql || '
            ) paf ON oor.product_code = paf.product_code
            ' || v_join_clause || '
            WHERE oor.order_gen_type IN (''Recommended'', ''Scenario'', ''Edited'')
                ' || v_agg_cond_channel || '
            GROUP BY oor.' || v_agg_type || ', oor.' || v_agg_on || v_agg_cond || v_group_by_extra || '
        ) X 
        GROUP BY ' || v_agg_type || v_agg_cond_columns || v_size_group_by || '
        ' || v_order_by_clause;
    
    RAISE NOTICE 'v_recommended_orders_sql: %', v_recommended_orders_sql;
    
    OPEN input FOR EXECUTE v_recommended_orders_sql;
    RETURN input;
END;
$function$;
