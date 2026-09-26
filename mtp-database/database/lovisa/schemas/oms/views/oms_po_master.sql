--liquibase formatted sql
--changeset swapnil.bhange:oms_po_master runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for oms_po_master
--rollback: SELECT 1
do
$$
DECLARE 
	_is_view int;
	_is_table int;
begin

	select count(*) as cnt into _is_table
	from information_schema."tables" c  
	where table_name = 'oms_po_master' and table_schema = 'inventory_smart' 
	and table_type = 'BASE TABLE';

	select count(*) as cnt into _is_view
	from information_schema."tables" c  
	where table_name = 'oms_po_master' and table_schema = 'inventory_smart' 
	and table_type = 'VIEW';

	IF _is_table = 1 THEN 
	
		DROP TABLE IF EXISTS inventory_smart.oms_po_master;
		--raise notice 'dropping table....';
		
	END IF;
	
	IF _is_view = 1 THEN 
	
		DROP VIEW IF EXISTS inventory_smart.oms_po_master;
		--raise notice 'dropping view....';
		
	END IF;
	
CREATE OR REPLACE VIEW inventory_smart.oms_po_master
AS SELECT po.version_code,
    po.order_id,
    po.po_id,
    po.asn_id,
    po.product_code,
    po.loc_code,
    po.channel,
    po.projected_delivery_date,
    po.fiscal_year_week,
    po.oo,
    po.it,
    po.pseudo_po,
    po.created_by,
    po.created_at,
    po.updated_by,
    po.updated_at,
    po.column_updated,
    po.id,
    po.quantity_ordered
   FROM inventory_smart.oms_po_master_version po
  WHERE po.version_code = global.get_table_version('inventory_smart.oms_po_master_version'::text);

end;
$$;


