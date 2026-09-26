--liquibase formatted sql
--changeset vishal.kumar:added size level sp runOnChange:true stripComments:false splitStatements:false context:MTP-105955 labels:get_po_rebalance_size_data_v12
--comment: added size level sp
--rollback: SELECT 1


DROP FUNCTION IF EXISTS inventory_smart.get_po_rebalance_size_data(refcursor, jsonb, jsonb,text);
CREATE OR REPLACE FUNCTION inventory_smart.get_po_rebalance_size_data(input refcursor, product_filter jsonb, table_query jsonb,choice text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

DECLARE
    v_recommended_orders_sql TEXT := '';
    meta TEXT := '';
    v_filter TEXT := '';
    v_channel_order_by TEXT := '';
    v_meta_without_channel_order TEXT := '';
    v_has_channel_desc BOOLEAN := FALSE;
BEGIN
    meta := global.form_table_query(table_query);
    
    -- Check if table_query has channel with desc order in sort array
    IF table_query ? 'sort' AND jsonb_typeof(table_query->'sort') = 'array' THEN
        SELECT EXISTS(
            SELECT 1 
            FROM jsonb_array_elements(table_query->'sort') AS sort_item
            WHERE sort_item->>'column' = 'channel' 
            AND sort_item->>'order' = 'desc'
        ) INTO v_has_channel_desc;
    END IF;
    
    IF meta LIKE '%aggr_column%' THEN
        meta := REPLACE(meta, 'aggr_column', 'size');
    END IF;
    
    -- If channel desc is found in sort, extract ORDER BY channel DESC from meta
    IF v_has_channel_desc THEN
        v_channel_order_by := SUBSTRING(meta FROM 'ORDER BY channel desc.*?last');
        v_meta_without_channel_order := REGEXP_REPLACE(meta, 'ORDER BY channel desc.*?last', '', 'i');
    ELSE
        v_meta_without_channel_order := meta;
    END IF;
    
    v_filter := '''' || (product_filter->'choice'->0->'values'->>0) || '''';

    v_recommended_orders_sql := '
        WITH base AS (
            SELECT *
            FROM inventory_smart.po_rebalance_base prb
            INNER JOIN "global".product_attributes_filter paf
                ON prb.product_code = paf.product_code
        ),
        metrics_per_channel AS (
            SELECT 
                size,
                loc_code AS channel,
                fiscal_year_week,
                AVG(l4w_ss) AS l4w_ss,
                AVG(lw_ss) AS lw_ss,
                SUM(dc_inv_bop_post_allocation - store_allocation_unconstrained) AS Excess_Deficit,
                SUM(store_allocation_unconstrained) AS DC_Inventory_Out,
                SUM(dc_inv_bop_post_allocation) AS DC_BOP_Inv,
                SUM(po_inbound) AS PO_Receipt_In,
                SUM(total_store_forecast) AS Forecasted_Sales,
                SUM(safety_stock) AS Safety_Stock,
                AVG(dc_inv_wos) AS DC_Inventory_WOS,
                AVG(store_inv_wos) AS Store_Inventory_WOS,
                SUM(total_store_bop_inv) AS Store_BOP_Inv
            FROM base
            WHERE l6_id = ''' || choice || '''
            GROUP BY size, loc_code, fiscal_year_week
        ),
        channel_jsons AS (
            SELECT
                size,
                channel,
                SUM(DC_Inventory_Out) AS total_dc_inventory_out,
                SUM(DC_BOP_Inv) AS total_dc_bop_inv,
                SUM(PO_Receipt_In) AS total_po_receipt_in,
                SUM(Forecasted_Sales) AS total_forecasted_sales,
                SUM(Safety_Stock) AS total_safety_stock,
                jsonb_object_agg(
                    fiscal_year_week,
                    jsonb_build_object(
                        ''Excess_Deficit'', Excess_Deficit,
                        ''Last_4_week_stock_sales'', l4w_ss,
                        ''Last_week_Stock_Sales'', lw_ss,
                        ''DC_Inventory_Out'', DC_Inventory_Out,
                        ''DC_BOP_Inv'', DC_BOP_Inv,
                        ''PO_Receipt_In'', PO_Receipt_In,
                        ''Forecasted_Sales'', Forecasted_Sales,
                        ''Safety_Stock'', Safety_Stock,
                        ''DC_Inventory_WOS'', DC_Inventory_WOS,
                        ''Store_Inventory_WOS'', Store_Inventory_WOS,
                        ''Store_BOP_Inv'', Store_BOP_Inv
                    )
                ) AS weekly_metrics
            FROM metrics_per_channel
            GROUP BY size, channel
        )
        SELECT
            size,
            JSONB_AGG(
                jsonb_build_object(
                    ''channel'', channel
                ) || weekly_metrics
                ' || COALESCE(v_channel_order_by, 'ORDER BY channel') || '
            ) AS status
        FROM channel_jsons
        GROUP BY size ' || v_meta_without_channel_order;

    RAISE NOTICE 'v_recommended_orders_sql %', v_recommended_orders_sql;
    OPEN input FOR EXECUTE v_recommended_orders_sql;
    RETURN input;
END
$function$
;