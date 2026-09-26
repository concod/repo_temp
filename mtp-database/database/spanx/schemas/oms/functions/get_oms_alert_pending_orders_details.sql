--liquibase formatted sql
--changeset chaitanyaprasad.reddy:get_oms_alert_pending_orders_details_spanx_5 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:get_oms_alert_pending_orders_details_carters_2
--comment: Added filter_reviewed_orders parameter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_pending_orders_details(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_pending_orders_details(input refcursor, jsonb, jsonb, filter_reviewed_orders boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql              text:='';
  v_pending_orders_sql  text:='';
  v_week_start_date     date:= date_trunc('week', current_date)::date;
  v_filter_reviewed_orders boolean:= false;
begin

  v_pa_sql :=inventory_smart.form_main_table_filters(
    'ph_master',
    $2
  );
  v_filter_reviewed_orders := $4;
 v_pending_orders_sql := '
	WITH min_rop_helper AS (
            SELECT 
            oor.article,
            oor.loc_code,
            oor.size,
            oor.product_code,
            oor.rop,
            oor.order_status_id, 
            oor.created_at,
            oor.inventory_deficit_agg,
            oor.lost_sales_agg,
            oor.unit_cost,
            oor.ia_shipment_order_quantity,
            oor.roq_unconstrained,
            oor.order_quantity,
            oor.order_placement_date,
			oor.order_quantity * oor.unit_cost as order_cost,
            oor.raw_roq,
            oor.roq_constrained,
            oor.order_placement_recom_date,
            oor.recom_receipt_date,
            oor.expected_receipt_date,
            oor.order_type,
            oor.elt_projected_safety_stock,
            oor.elt_projected_bop,
            oor.lost_sales_agg * oor.unit_cost as lost_sales_agg_cost,
            MIN(oor.rop) OVER (PARTITION BY oor.article, oor.loc_code) AS min_rop --order placement date
        FROM 
            inventory_smart.oms_orders_recommended oor
        WHERE 
            oor.order_status_id IN (1) AND oor.order_quantity > 0
    )
    --select * from min_rop_helper where rop = min_rop;

    ,recommended_min_rop as(
    select * from min_rop_helper where rop = min_rop
    )
    --select * from recommended_min_rop;

    ,paf_kpi_oor AS (
            SELECT 

                paf.l1_name,
                paf.l0_name,
                paf.l2_name,
                paf.vendor_id AS vendor_code,
                paf.vendor_desc AS vendor_name,
                ok.store_inv,
                ok.dc_inv,
                ok.system_inv,
                ok.safety_stock,
                ok.open_receipt_units,
                oor.*
            from
                recommended_min_rop oor
            inner join 
                global.product_attributes_filter paf
                on oor.product_code = paf.product_code 
            LEFT JOIN
                inventory_smart.oms_kpi ok
            ON 
                paf.product_code = ok.product_code AND oor.loc_code = ok.loc_code 
            join (select * from global.distribution_centres where is_active and not is_deleted) dc 
            on dc.linked_store_code = oor.loc_code
                        ' || v_pa_sql || '
        )
    --select * from paf_kpi_oor;
        
    ,distinct_po_counts AS (
        SELECT 
            po.loc_code,
            po.product_code,
            SUM(po.oo) + SUM(po.it) as commited_receipt_units,
            COUNT(DISTINCT po.po_id) AS distinct_po_count
        FROM inventory_smart.oms_po_master po  
        GROUP BY po.loc_code, po.product_code  
    )
    --select * from distinct_po_counts

    select * from (     

        SELECT 
        
            alerts.article, -- 1
            alerts.loc_code, -- 2 
            
            MAX(COALESCE(alerts.is_pending_order_resolved, FALSE)::INT)::BOOLEAN AS is_resolved,
            sum(pko.store_inv) as store_inv, --6
            sum(pko.dc_inv) as dc_inv, --7
            concat(alerts.article, alerts.loc_code) as unique_row_id,
            concat(alerts.article, alerts.loc_code) as id,
            avg(oclt.lead_time) as lead_time,
            sum(historic_sales_unit) as historic_sales_unit, --4
            sum(historic_sales_value) as historic_sales_value, --5
            sum(po.commited_receipt_units) as commited_receipt_units, -- 8
            sum(pko.system_inv) as total_inv, -- 9
            max(pko.order_placement_recom_date) as order_placement_recom_date, --10
            max(pko.expected_receipt_date) as expected_receipt_date, --11  
            max(po.distinct_po_count) as distinct_po_count, --12
            sum(pko.lost_sales_agg) as lost_sales_agg, --13
            sum(pko.lost_sales_agg_cost) as lost_sales_agg_cost, --14
            avg(alerts.dc_wos_oh_oo_it) as dc_wos_oh_oo_it, --15
            avg(alerts.dc_store_wos_oh_oo_it) as dc_store_wos_oh_oo_it, --16
            max(oclt.mode_shipment) as mode_shipment, --17
            sum(alerts.potential_sales_unit) as potential_sales_unit,  --18
            sum(alerts.potential_sales_value) as potential_sales_value,  --18

            sum(pko.order_quantity) as order_quantity,
            round(sum(coalesce(pko.order_cost, 0))::numeric, 2) as order_cost,
            sum(pko.raw_roq) as raw_roq,
            sum(pko.ia_shipment_order_quantity) as ia_shipment_order_quantity,
            sum(pko.roq_unconstrained) as roq_unconstrained,
            sum(pko.roq_constrained) as roq_constrained,
            avg(oclt.lead_time) as lead_time,
            max(pko.recom_receipt_date) as recom_receipt_date,

            ARRAY_AGG(
            jsonb_build_object(
                ''size'', alerts.size, -- 3
                ''historic_sales_unit'', historic_sales_unit, --4
                ''historic_sales_value'', historic_sales_value, --5
                ''loc_code'', alerts.loc_code,
                ''article'', alerts.article,
                ''store_inv'', pko.store_inv, --6
                ''dc_inv'', pko.dc_inv, --7,
                ''total_inv'', pko.system_inv, -- 9

                ''order_quantity'', pko.order_quantity,
                ''order_cost'', pko.order_cost,
                ''raw_roq'', pko.raw_roq,
                ''ia_shipment_order_quantity'', pko.ia_shipment_order_quantity,
                ''roq_unconstrained'', pko.roq_unconstrained,
                ''roq_constrained'', pko.roq_constrained,
                ''lead_time'', oclt.lead_time,
                ''recom_receipt_date'', pko.recom_receipt_date,

                ''commited_receipt_units'', po.commited_receipt_units, -- 8
                ''order_placement_recom_date'', pko.order_placement_recom_date, --10
                ''expected_receipt_date'', pko.expected_receipt_date, --11
                ''distinct_po_count'', po.distinct_po_count, --12
                ''lost_sales_agg'', pko.lost_sales_agg, --13
                ''lost_sales_agg_cost'', pko.lost_sales_agg_cost, --14
                ''potential_sales_unit'', alerts.potential_sales_unit, --18
                ''potential_sales_value'', alerts.potential_sales_value --19
            )
        ) AS product_details

        FROM 
            inventory_smart.oms_alerts alerts
        INNER JOIN
            paf_kpi_oor pko
        ON 
            alerts.article = pko.article AND alerts.loc_code = pko.loc_code and pko.size = alerts.size
        left join 
            distinct_po_counts po
        on pko.product_code = po.product_code  and pko.loc_code = po.loc_code
        left JOIN inventory_smart.oms_constraints_lead_time oclt
            on oclt.article = alerts.article and oclt.loc_code = alerts.loc_code
        WHERE    alerts.pending_order 
        ' || CASE WHEN v_filter_reviewed_orders THEN ' and not alerts.is_pending_order_resolved = true' ELSE '' END || ' 
        group by alerts.article, alerts.loc_code ) X
'|| global.form_table_query($3);
  raise notice 'v_pending_orders_sql %',v_pending_orders_sql;
  open $1 for execute v_pending_orders_sql;
  RETURN $1;
end
$function$
;
