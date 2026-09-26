--liquibase formatted sql
--changeset chaitanyaprasad.reddy:get_oms_alert_sku_to_po_details_carters_3 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:get_oms_alert_sku_to_po_details_carters_3
--comment: Added SP for OMS SKU to PO view po pop up data
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_sku_to_po_details(input refcursor, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_sku_to_po_details(input refcursor, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_po_sql  text:='';
begin
	
    v_po_sql := '
   WITH min_rop_helper AS (
    SELECT 
    	oor.style ,
      oor.channel,
    	oor.size,
        oor.product_code,
        oor.rop,
        oor.order_gen_type,
        oor.recom_receipt_date,
        oor.order_type,  -- Keep order_type for filtering later
        CASE 
            WHEN oor.order_type = ''Immediate'' THEN 
                MIN(oor.rop) OVER (PARTITION BY oor.style, oor.channel)
            ELSE NULL 
        END AS min_rop,


        MIN(CASE WHEN oor.order_type = ''Immediate'' THEN oor.expected_receipt_date END) 
            OVER (PARTITION BY oor.style, oor.channel) AS earliest_receipt_date,


        MIN(CASE WHEN oor.order_type = ''Order Cycle'' THEN oor.expected_receipt_date END) 
            OVER (PARTITION BY oor.style, oor.channel ORDER BY oor.rop ASC) 
            AS order_cycle_receipt_date
            
    FROM inventory_smart.oms_orders_recommended oor
    WHERE oor.order_gen_type != ''Manual'' 
      AND oor.order_status_id != 3 and CONCAT(oor.style, oor.channel) = ''' || $2 || '''
)

,recommended_min_rop as(
    select * from min_rop_helper where min_rop is not null
)
SELECT po.*, oor.*, (po.oo + po.it) AS committed_receipt_units
    FROM 
      inventory_smart.oms_po_master po
    inner join recommended_min_rop oor
    ON 
      po.product_code = oor.product_code and po.channel = oor.channel
      where po.projected_delivery_date BETWEEN oor.recom_receipt_date
                                           AND COALESCE(oor.earliest_receipt_date, oor.order_cycle_receipt_date)

';
  
  raise notice 'v_po_sql %',v_po_sql;
  open $1 for execute v_po_sql;
  RETURN $1;
end
$function$
;