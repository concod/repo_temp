--liquibase formatted sql
--changeset aman.lakkoju:Used NAD instead of NBD for late orders runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-31858
--comment: Included late orders
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
           select *,case when not_before_date > ideal_receipt_date then ''YES'' 
                         when not_after_date < current_date then ''NO/Late Order''
                         else ''NO'' end as expedite_flag
           from
             inventory_smart.oms_po_master po
           where
             po.product_code = '''||$2||'''';
  
  raise notice 'v_po_sql %',v_po_sql;
  open $1 for execute v_po_sql;
  RETURN $1;
end
$function$
;
