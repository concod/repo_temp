--liquibase formatted sql
--changeset kailash.kangne@impactanalytics.co:get_oms_alert_recommended_orders_details_vendor_store_5 runOnChange:true stripComments:false splitStatements:false context:Release_0 labels:MTP-102139-1
--comment: MTP-102139
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_recommended_orders_details_vendor_store(input refcursor, jsonb, boolean);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_recommended_orders_details_vendor_store(jsonb, jsonb, boolean, filter_reviewed_orders boolean)
 RETURNS TABLE(result jsonb)
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql              text:='';
  v_recommended_orders_sql  text:='';
  v_week_start_date     date:= date_trunc('week', current_date)::date;
  v_filter_reviewed_orders boolean := false;
begin

  v_pa_sql :=inventory_smart.form_main_table_filters(
    'ph_master',
    $1
  );
  v_filter_reviewed_orders := $4;
 v_recommended_orders_sql := '
  WITH 
  paf as (
      	select l0_name, l1_name, product_code from
     	global.product_attributes_filter paf
        ' || v_pa_sql || ' and ordering = ''Y'' and active
  )
  ,alerts_store as (
            select oas.* from inventory_smart.oms_alerts_store oas
            JOIN paf p ON oas.product_code = p.product_code WHERE oas.recom_order
        ' || CASE WHEN v_filter_reviewed_orders THEN ' and not (oas.is_recom_order_resolved = true)' ELSE '' END || ' 
    )
  ,min_rop_helper AS (
            SELECT 
            oor.article,
            oor.store_code,
            oor.size,
            oor.product_code,
            oor.rop,
            oor.order_status_id, 
            oor.roq_unconstrained,
            oor.order_quantity,
            oor.raw_roq,
            oor.roq_constrained,
            oor.order_placement_recom_date,
            oor.recom_receipt_date,
            oor.expected_receipt_date,
            oor.order_type,
			oor.lead_time,
			oor.elt_projected_store_inv,
            oor.elt_projected_safety_stock,
            oor.elt_projected_bop,
            GREATEST(oor.elt_projected_safety_stock - oor.elt_projected_bop, 0) as safety_stock_deficit,
 MIN(oor.rop) OVER (PARTITION BY oor.article, oor.store_code) AS min_rop --order placement date
            FROM 
                inventory_smart.oms_orders_recommended_store oor
                join alerts_store oas using(product_code, store_code)
            ' || v_pa_sql || ' and oor.order_status_id IN (0) AND oor.order_gen_type!=''Manual'' AND oor.raw_roq > 0 and oor.order_type = ''Order Cycle'' AND oor.order_placement_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL ''14 days''
            -- and (product_code,store_code) in (select product_code,store_code from alerts_store)

        )

        ,recommended_min_rop as(
        select * from min_rop_helper where rop = min_rop
        )
        
        ,distinct_po_counts AS (
            SELECT 
             	pos.store_code,
		        pos.product_code,
		        SUM(pos.oo) + SUM(pos.it) AS oo_it, --7
		        coalesce(COUNT(DISTINCT pos.po_id), 0) AS po_count --14
            FROM inventory_smart.oms_po_master_store pos
            where (pos.product_code,pos.store_code) in (select product_code,store_code from alerts_store)  
            GROUP BY pos.store_code, pos.product_code  
        )

        ,paf_kpi_oor AS (
            SELECT 
                oks.store_inv,
                oor.*
            from
                recommended_min_rop oor
            LEFT JOIN
                inventory_smart.oms_kpi_store oks
            ON 
                oor.product_code = oks.product_code AND oor.store_code = oks.store_code
        )
    --select * from paf_kpi_oor;

		select * from (
            SELECT   
            alerts_store.article, -- 1
            alerts_store.store_code, -- 2 
            MAX(COALESCE(alerts_store.is_recom_order_resolved, FALSE)::INT)::BOOLEAN AS is_resolved,
            sum(coalesce(pko.store_inv, 0)) as store_inv, --4
            concat(alerts_store.article, alerts_store.store_code) as unique_row_id,
            concat(alerts_store.article, alerts_store.store_code) as id,
            sum(coalesce(historic_sales_unit, 0)) as historic_sales_unit, -- 27
            sum(coalesce(historic_sales_value, 0)) as historic_sales_value, -- 28
            sum(coalesce(pos.oo_it, 0)) as oo_it, -- 7
            max(pko.order_placement_recom_date) as order_placement_recom_date, -- 5
            max(pko.expected_receipt_date) as expected_receipt_date, --21 
            max(coalesce(pos.po_count, 0)) as po_count, -- 14
            sum(coalesce(alerts_store.potential_sales_unit, 0)) as potential_sales_unit,  -- 17
            sum(coalesce(alerts_store.potential_sales_value, 0)) as potential_sales_value,  -- 18
			max(alerts_store.receipt_date_earliest) as receipt_date_earliest, --8
			max(alerts_store.order_placement_date_earliest) as order_placement_date_earliest, --9
			sum(alerts_store.raw_roq_earliest) as raw_roq_earliest, --10
			sum(alerts_store.roq_unconstrained_earliest) as roq_unconstrained_earliest, --11
			max(alerts_store.date_diff) as date_diff, --13
			sum(alerts_store.lost_sales_aggregated_unit) as lost_sales_aggregated_unit, --15
			sum(alerts_store.lost_sales_aggregated_value) as lost_sales_aggregated_value, --16
            sum(coalesce(pko.order_quantity, 0)) as order_quantity, --6
            sum(coalesce(pko.raw_roq, 0)) as raw_roq, --22
			sum(coalesce(pko.lead_time, 0)) as lead_time, --19
            sum(coalesce(pko.roq_unconstrained, 0)) as roq_unconstrained, --23
            sum(coalesce(pko.roq_constrained, 0)) as roq_constrained, --26
            max(pko.recom_receipt_date) as recom_receipt_date, --`12
            sum(coalesce(pko.safety_stock_deficit, 0)) as safety_stock_deficit, --25
			sum(coalesce(pko.elt_projected_safety_stock, 0)) as elt_projected_safety_stock, --24
			sum(coalesce(pko.elt_projected_store_inv, 0)) as elt_projected_store_inv, --20
			''action'' as action, --30
            ARRAY_AGG(
            jsonb_build_object(
                ''size'', alerts_store.size, -- 3
                ''historic_sales_unit'', alerts_store.historic_sales_unit, -- 27
                ''historic_sales_value'', alerts_store.historic_sales_value, -- 28
                ''raw_roq_earliest'',alerts_store.raw_roq_earliest, --10
                ''roq_unconstrained_earliest'',alerts_store.roq_unconstrained_earliest,--11
				''date_diff'',alerts_store.date_diff, --13
				''lost_sales_aggregated_unit'',alerts_store.lost_sales_aggregated_unit,--15
				''lost_sales_aggregated_value'',alerts_store.lost_sales_aggregated_value, --16
                ''store_inv'', pko.store_inv, --4
                ''order_quantity'', pko.order_quantity, --6
                ''raw_roq'', pko.raw_roq, --22
				''lead_time'',pko.lead_time, --19
                ''roq_unconstrained'', pko.roq_unconstrained, --23
                ''roq_constrained'', pko.roq_constrained, --26
                ''recom_receipt_date'', pko.recom_receipt_date, --12
                ''safety_stock_deficit'', pko.safety_stock_deficit, --25
				''elt_projected_safety_stock'', pko.elt_projected_safety_stock, --24
				''elt_projected_store_inv'', pko.elt_projected_store_inv, --20
                ''oo_it'', pos.oo_it, -- 7
                ''po_count'', pos.po_count, -- 14 
                ''potential_sales_unit'', alerts_store.potential_sales_unit, -- 17
                ''potential_sales_value'', alerts_store.potential_sales_value -- 18
            )
        ) AS product_details
            FROM 
                alerts_store
            INNER JOIN
                paf_kpi_oor pko
            ON 
                alerts_store.article = pko.article AND alerts_store.store_code = pko.store_code and pko.product_code = alerts_store.product_code
            left join
            distinct_po_counts pos
            on alerts_store.product_code = pos.product_code  and alerts_store.store_code = pos.store_code
            group by alerts_store.article, alerts_store.store_code) X
			'|| global.form_table_query($2);

  if $3 is false then
    v_recommended_orders_sql := 'select row_to_json(Y)::jsonb as result from (' || v_recommended_orders_sql || ') Y ';
  else 
    v_recommended_orders_sql := 'select jsonb_build_object(''count'', count(*)) as result from (' || v_recommended_orders_sql || ') Y ';
  end if;

  raise notice 'v_recommended_orders_sql %',v_recommended_orders_sql;
  return query execute v_recommended_orders_sql;
end
$function$
;
