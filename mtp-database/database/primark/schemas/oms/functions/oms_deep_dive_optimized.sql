--liquibase formatted sql
--changeset priyansh.gautam:oms_deep_dive_optimized2 runOnChange:true stripComments:false splitStatements:false context:MTP-54660 labels:oms_deep_dive_optimized
--comment: Created oms_deep_dive_optimized
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.oms_deep_dive_optimized(text, text[]);
CREATE OR REPLACE FUNCTION oms.oms_deep_dive_optimized(p_filter_key text, p_filter_list text[])
RETURNS TABLE(
    month text,
    week text,
    product_code text,
    dc_id text,
    channel text,
    fiscal_year_week numeric,
    safety_stock numeric,
    total_mins numeric,
    additional_inventory text,
    lost_sales numeric,
    approved_receipt numeric,
    inventory_deficit text,
    week_end_date text,
    forecast numeric,
    total_dc_forecast numeric,
    dc_inv numeric,
    exp_bop_dc_inv numeric,
    eff_lead_time numeric,
    receipt1 numeric,
    ly_sales numeric,
    ly_oh numeric,
    total_stores_count numeric,
    order_quantity numeric,
    roq_unconstrained numeric,
    roq_constrained numeric,
    order_cost numeric,
    raw_roq numeric,
    ia_shipment_order_quantity numeric,
    receipt3 numeric,
    order_type text,
    receipt_pending numeric,
    today_s_approved_receipt numeric,
    receipt_inventory numeric
 )
 LANGUAGE plpgsql
AS $function$
DECLARE

	v_filter_oor text := '';
	v_filter_ddb text := '';
    v_transform_query text := '';
BEGIN
   	IF array_length(p_filter_list, 1) = 1 THEN
        v_filter_oor := format('AND oor.%I = %L', p_filter_key, p_filter_list[1]);
		v_filter_ddb := format('WHERE ddb.%I = %L', p_filter_key, p_filter_list[1]);
    ELSE
        v_filter_oor := format('AND oor.%I = ANY(%L)', p_filter_key, p_filter_list);
		v_filter_ddb := format('WHERE ddb.%I = ANY(%L)', p_filter_key, p_filter_list);
    END IF;

 	RAISE NOTICE 'v_filter_oor: %', v_filter_oor;
	RAISE NOTICE 'v_filter_ddb: %', v_filter_ddb;
    -- Construct the dynamic SQL query
    v_transform_query := format('
		WITH order_fiscal_weeks AS (
		        SELECT
		            oor.product_code,
		            oor.loc_code,
		            oor.channel,
		            oor.vendor_code,
		            COALESCE(oor.order_quantity_eaches, 0)::float8 AS order_quantity,
		            oor.unit_cost::float8 AS unit_cost,
		            COALESCE(oor.roq_constrained_eaches, 0)::float8 AS roq_constrained,
		            COALESCE(oor.roq_unconstrained_eaches, 0)::float8 AS roq_unconstrained,
		            COALESCE(oor.raw_roq_eaches, 0)::float8 AS raw_roq,
		            oor.style,
		            COALESCE(oor.ia_shipment_order_quantity, 0)::float8 AS ia_shipment_order_quantity,
		            oor.order_placement_date,
		            oor.editable_expected_receipt_date,
					CASE 
		                WHEN oor.order_type = ''Order Cycle (Shifted)'' THEN ''Order Cycle''
		                WHEN oor.order_type = ''Immediate (Shifted)'' THEN ''Immediate''
		                WHEN oor.order_type = ''Zero ROQ (Shifted)'' THEN ''Zero ROQ''
		                ELSE oor.order_type
		            END AS order_type,
		            oor.order_status_id,
		            oor.is_deleted,
		            fdm_rop.fiscal_year_week AS rop_week,
		            fdm_nb.fiscal_year_week AS nb_fiscal_year_week,
		            fdm_nb.fiscal_year_week AS pending_fw_nb,
		            fdm_r_rd.fiscal_year_week AS rd_fiscal_year_week,
		            fdm_p_rd.fiscal_year_week AS pending_fw_rd,
		            paf.l1_name AS store_name
		        FROM oms.oms_orders_recommended oor
		        LEFT JOIN global.fiscal_date_mapping fdm_rop
		            ON oor.order_placement_date = fdm_rop.calendar_date
		        LEFT JOIN global.fiscal_date_mapping fdm_nb
		            ON oor.editable_expected_receipt_date = fdm_nb.calendar_date
		        LEFT JOIN global.fiscal_date_mapping fdm_p_rd
		            ON oor.editable_expected_receipt_date = fdm_p_rd.calendar_date
		        LEFT JOIN global.fiscal_date_mapping fdm_r_rd
		            ON oor.editable_expected_receipt_date = fdm_r_rd.calendar_date
		        LEFT JOIN global.product_attributes_filter paf
		            ON oor.product_code = paf.product_code
		        WHERE
		            oor.order_status_id IN (0, 3, -1, 1, 2)
		            AND (oor.is_deleted = false OR 
		                (oor.is_deleted = true AND oor.order_placement_date = current_date))
		            %s
		    ),
		    orders_by_rop_week AS (
		        SELECT
		            product_code,
		            loc_code AS dc_id,
		            channel,
		            rop_week,
		            SUM(order_quantity) AS order_quantity,
		            SUM(roq_unconstrained) AS roq_unconstrained,
		            SUM(roq_constrained) AS roq_constrained,
		            SUM(order_quantity * unit_cost) AS order_cost,
		            SUM(raw_roq) AS raw_roq,
		            SUM(ia_shipment_order_quantity) AS ia_shipment_order_quantity
		        FROM order_fiscal_weeks
		        WHERE order_status_id IN (0, 3)
		        GROUP BY product_code, loc_code, channel, rop_week
		    ),
		    receipts_by_rd_week AS (
		        SELECT
		            product_code,
		            loc_code AS dc_id,
		            channel,
		            rd_fiscal_year_week,
		            order_type,
		            SUM(order_quantity) AS receipt3
		        FROM order_fiscal_weeks
		        WHERE order_status_id IN (0, 3)
		        GROUP BY product_code, loc_code, channel, rd_fiscal_year_week, order_type
		    ),
		    pending_receipts_by_rd_week AS (
		        SELECT
		            product_code,
		            loc_code AS dc_id,
		            channel,
		            pending_fw_rd,
		            SUM(order_quantity) AS receipt_pending
		        FROM order_fiscal_weeks
		        WHERE order_status_id IN (-1, 1, 2)
		        GROUP BY product_code, loc_code, channel, pending_fw_rd
		    ),
		    approved_receipts_by_rd_week AS (
		        SELECT
		            product_code,
		            loc_code AS dc_id,
		            channel,
		            rd_fiscal_year_week,
		            order_type,
		            SUM(order_quantity) AS approved_receipt
		        FROM order_fiscal_weeks
		        WHERE order_status_id = 3
		        GROUP BY product_code, loc_code, channel, rd_fiscal_year_week, order_type
		    ),
		    base_with_orders AS (
		        SELECT
		            ddb.month,
		            ddb.week,
		            ddb.product_code,
		            ddb.loc_code AS dc_id,
		            ddb.channel,
		            ddb.fiscal_year_week,
		            ddb.safety_stock as safety_stock,
		            ddb.total_mins,
		            ddb.additional_inventory,
		            ddb.lost_sales,
		            ddb.approved_receipt,
		            ddb.inventory_deficit,
		            fdm.fiscal_week_end_date AS week_end_date,
		            coalesce(ddb.predicted_qty::float8, 0) as forecast,
		            coalesce(ddb.total_dc_forecast::float8, 0) AS total_dc_forecast,
		            coalesce(ddb.dc_inv::float8, 0) AS dc_inv,
		            coalesce(ddb.dc_inv::float8, 0) AS exp_bop_dc_inv,
		            coalesce(ddb.eff_lead_time::float8, 0) AS eff_lead_time,
		            coalesce(ddb.receipt1::float8, 0) AS receipt1,
		            coalesce(ddb.ly_sales::float8, 0) AS ly_sales,
		            coalesce(ddb.ly_oh::float8, 0) AS ly_oh,
		            coalesce(ddb.total_stores_count::int,0) AS total_stores_count,
		            -- From orders_by_rop_week (matches recomm_output1 merge)
		            COALESCE(rop.order_quantity, 0) AS order_quantity,
		            COALESCE(rop.roq_unconstrained, 0) AS roq_unconstrained,
		            COALESCE(rop.roq_constrained, 0) AS roq_constrained,
		            COALESCE(rop.order_cost, 0) AS order_cost,
		            COALESCE(rop.raw_roq, 0) AS raw_roq,
		            COALESCE(rop.ia_shipment_order_quantity, 0) AS ia_shipment_order_quantity,
		            -- From receipts_by_rd_week (matches recomm_output4 merge)
		            COALESCE(rd.receipt3, 0) AS receipt3,
		            COALESCE(rd.order_type, ''Unknown'') AS order_type,
		            -- From pending_receipts_by_rd_week (matches pending_output4 merge)
		            COALESCE(pend.receipt_pending, 0) AS receipt_pending,
		            -- From approved_receipts_by_rd_week (matches approved receipt logic)
		            COALESCE(appr.approved_receipt, 0) AS today_s_approved_receipt
		        FROM oms.oms_deep_dive_base ddb
		        LEFT JOIN orders_by_rop_week rop
		            ON rop.product_code = ddb.product_code
		        AND rop.dc_id = ddb.loc_code
		        AND rop.channel = ddb.channel
		        AND rop.rop_week = ddb.fiscal_year_week
		        LEFT JOIN receipts_by_rd_week rd
		            ON rd.product_code = ddb.product_code
		        AND rd.dc_id = ddb.loc_code
		        AND rd.channel = ddb.channel
		        AND rd.rd_fiscal_year_week = ddb.fiscal_year_week
		        LEFT JOIN pending_receipts_by_rd_week pend
		            ON pend.product_code = ddb.product_code
		        AND pend.dc_id = ddb.loc_code
		        AND pend.channel = ddb.channel
		        AND pend.pending_fw_rd = ddb.fiscal_year_week
		        LEFT JOIN approved_receipts_by_rd_week appr
		            ON appr.product_code = ddb.product_code
		        AND appr.dc_id = ddb.loc_code
		        AND appr.channel = ddb.channel
		        AND appr.rd_fiscal_year_week = ddb.fiscal_year_week
		        JOIN (
		            SELECT DISTINCT fiscal_week_end_date, fiscal_year_week 
		            FROM "global".fiscal_date_mapping
		        ) fdm 
		        ON ddb.fiscal_year_week = fdm.fiscal_year_week
		        %s
		    ),
		        base_with_receipts AS (
                SELECT
                    *,
                    (COALESCE(receipt1, 0) + 
                    COALESCE(receipt3, 0) + 
                    COALESCE(approved_receipt, 0) + 
                    COALESCE(receipt_pending, 0))::float8 AS receipt_inventory
                FROM base_with_orders
            )
        
            SELECT 
    month::text,
    week::text,
    product_code::text,
    dc_id::text,
    channel::text,
    fiscal_year_week::numeric,
    COALESCE(safety_stock, 0)::numeric as safety_stock,
    COALESCE(total_mins, 0)::numeric as total_mins,
    additional_inventory::text,
    COALESCE(lost_sales, 0)::numeric as lost_sales,
    COALESCE(approved_receipt, 0)::numeric as approved_receipt,
    inventory_deficit::text,
    week_end_date::text,
    COALESCE(forecast, 0)::numeric as forecast,
    COALESCE(total_dc_forecast, 0)::numeric as total_dc_forecast,
    COALESCE(dc_inv, 0)::numeric as dc_inv,
    COALESCE(exp_bop_dc_inv, 0)::numeric as exp_bop_dc_inv,
    COALESCE(eff_lead_time, 0)::numeric as eff_lead_time,
    COALESCE(receipt1, 0)::numeric as receipt1,
    COALESCE(ly_sales, 0)::numeric as ly_sales,
    COALESCE(ly_oh, 0)::numeric as ly_oh,
    COALESCE(total_stores_count, 0)::numeric as total_stores_count,
    COALESCE(order_quantity, 0)::numeric as order_quantity,
    COALESCE(roq_unconstrained, 0)::numeric as roq_unconstrained,
    COALESCE(roq_constrained, 0)::numeric as roq_constrained,
    COALESCE(order_cost, 0)::numeric as order_cost,
    COALESCE(raw_roq, 0)::numeric as raw_roq,
    COALESCE(ia_shipment_order_quantity, 0)::numeric as ia_shipment_order_quantity,
    COALESCE(receipt3, 0)::numeric as receipt3,
    order_type::text,
    COALESCE(receipt_pending, 0)::numeric as receipt_pending,
    COALESCE(today_s_approved_receipt, 0)::numeric as today_s_approved_receipt,
    COALESCE(receipt_inventory, 0)::numeric as receipt_inventory
FROM base_with_receipts t', v_filter_oor, v_filter_ddb);

        RAISE NOTICE 'Transform Query: %', v_transform_query;
        RETURN QUERY EXECUTE v_transform_query;
    -- Execute the dynamic SQL query and return the results
       return;
END;
$function$
;