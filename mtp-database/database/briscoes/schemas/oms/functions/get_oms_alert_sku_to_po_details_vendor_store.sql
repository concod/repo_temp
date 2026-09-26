--liquibase formatted sql
--changeset kailash.kangne@impactanalytics.co:get_oms_alert_sku_to_po_details_vendor_store runOnChange:true stripComments:false splitStatements:false context:MTP-102139 labels:MTP-102139
--comment: MTP-102139
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_sku_to_po_details_vendor_store(input refcursor, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_sku_to_po_details_vendor_store(input refcursor, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_po_sql  text:='';
begin
	
  v_po_sql := '
   WITH min_rop_helper AS (
    SELECT 
    	oor.article ,
    	oor.size,
        oor.store_code,
        oor.product_code,
        oor.rop,
        oor.order_gen_type,
        oor.recom_receipt_date,
        oor.order_type,  -- Keep order_type for filtering later
        CASE 
            WHEN oor.order_type = ''Immediate'' THEN 
                MIN(oor.rop) OVER (PARTITION BY oor.article, oor.store_code)
            ELSE NULL 
        END AS min_rop,


        MIN(CASE WHEN oor.order_type = ''Immediate'' THEN oor.expected_receipt_date END) 
            OVER (PARTITION BY oor.article, oor.store_code) AS earliest_receipt_date,


        MIN(CASE WHEN oor.order_type = ''Order Cycle'' THEN oor.expected_receipt_date END) 
            OVER (PARTITION BY oor.article, oor.store_code ORDER BY oor.rop ASC) 
            AS order_cycle_receipt_date
            
    FROM inventory_smart.oms_orders_recommended_store oor
    WHERE oor.order_gen_type != ''Manual'' 
      AND oor.order_status_id != 3 and CONCAT(oor.article, oor.store_code) = ''' || $2 || '''
)

,recommended_min_rop as(
    select * from min_rop_helper where min_rop is not null
)
SELECT po.*, oor.*, (po.oo + po.it) AS committed_receipt_units
    FROM 
      inventory_smart.oms_po_master_store po
    inner join recommended_min_rop oor
    ON 
      po.product_code = oor.product_code and po.store_code = oor.store_code
      where po.projected_delivery_date BETWEEN (COALESCE(oor.recom_receipt_date, NOW()) - INTERVAL ''12 weeks'')
                                           AND COALESCE(oor.earliest_receipt_date, oor.order_cycle_receipt_date)

';
  
  raise notice 'v_po_sql %',v_po_sql;
  open $1 for execute v_po_sql;
  RETURN $1;
end
$function$
;
