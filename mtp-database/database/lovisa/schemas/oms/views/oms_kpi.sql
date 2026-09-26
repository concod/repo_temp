--liquibase formatted sql
--changeset swapnil.bhange:oms_kpi runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for oms_kpi
--rollback: SELECT 1
do
$$
DECLARE 
	_is_view int;
	_is_table int;
begin

	select count(*) as cnt into _is_table
	from information_schema."tables" c  
	where table_name = 'oms_kpi' and table_schema = 'inventory_smart' 
	and table_type = 'BASE TABLE';

	select count(*) as cnt into _is_view
	from information_schema."tables" c  
	where table_name = 'oms_kpi' and table_schema = 'inventory_smart' 
	and table_type = 'VIEW';

	IF _is_table = 1 THEN 
	
		DROP TABLE IF EXISTS inventory_smart.oms_kpi;
		--raise notice 'dropping table....';
		
	END IF;
	
	IF _is_view = 1 THEN 
	
		DROP VIEW IF EXISTS inventory_smart.oms_kpi;
		--raise notice 'dropping view....';
		
	END IF;
	
CREATE OR REPLACE VIEW inventory_smart.oms_kpi
AS SELECT kpi.version_code,
    kpi.product_code,
    kpi.loc_code,
    kpi.dc_inv,
    kpi.safety_stock,
    kpi.created_by,
    kpi.created_at,
    kpi.updated_by,
    kpi.updated_at,
    kpi.effective_lead_time,
    kpi.adjusted_forecast_qty_4w,
    kpi.adjusted_forecast_qty_4w_lc,
    kpi.adjusted_forecast_qty_8w,
    kpi.adjusted_forecast_qty_8w_lc,
    kpi.adjusted_forecast_qty_12w,
    kpi.adjusted_forecast_qty_12w_lc,
    kpi.wos,
    kpi.target_service_level,
    kpi.ss_base,
    kpi.system_inv,
    kpi.store_inv,
    kpi.open_receipt_units,
    kpi.mrpc,
    kpi.channel,
    kpi.min_order_quantity_sku,
    kpi.order_multiple,
    kpi.column_updated,
    kpi.id,
    kpi.max_order_quantity_shipment,
    kpi.max_order_quantity_sku,
    kpi.max_order_quantity_style,
    kpi.min_order_quantity_shipment,
    kpi.min_order_quantity_style,
    kpi.vendor_code
   FROM inventory_smart.oms_kpi_version kpi
  WHERE kpi.version_code = global.get_table_version('inventory_smart.oms_kpi_version'::text);

end;
$$;


