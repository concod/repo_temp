--liquibase formatted sql
--changeset swapnil.bhange:oms_late_orders_report runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for oms_late_orders_report
--rollback: SELECT 1
do
$$
DECLARE 
	_is_view int;
	_is_table int;
begin

	select count(*) as cnt into _is_table
	from information_schema."tables" c  
	where table_name = 'oms_late_orders_report' and table_schema = 'inventory_smart' 
	and table_type = 'BASE TABLE';

	select count(*) as cnt into _is_view
	from information_schema."tables" c  
	where table_name = 'oms_late_orders_report' and table_schema = 'inventory_smart' 
	and table_type = 'VIEW';

	IF _is_table = 1 THEN 
	
		DROP TABLE IF EXISTS inventory_smart.oms_late_orders_report;
		--raise notice 'dropping table....';
		
	END IF;
	
	IF _is_view = 1 THEN 
	
		DROP VIEW IF EXISTS inventory_smart.oms_late_orders_report;
		--raise notice 'dropping view....';
		
	END IF;
	
CREATE OR REPLACE VIEW inventory_smart.oms_late_orders_report
AS SELECT lor.version_code,
    lor.vendor_code,
    lor.vendor_name,
    lor.po_id,
    lor.product_code,
    lor.style,
    lor.article,
    lor.size,
    lor.channel,
    lor.loc_code,
    lor.order_date,
    lor.projected_delivery_date,
    lor.dc_oh,
    lor.total_order_qty,
    lor.total_order_cost,
    lor.total_received_qty,
    lor.total_received_cost,
    lor.late_order_qty,
    lor.late_order_cost,
    lor.order_qty_four_weeks,
    lor.order_cost_four_weeks
   FROM inventory_smart.oms_late_orders_report_version lor
  WHERE lor.version_code = global.get_table_version('inventory_smart.oms_late_orders_report_version'::text);

end;
$$;

