--liquibase formatted sql
--changeset swapnil.bhange:oms_product_hybrid_attributes_view_v1 runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for oms_product_hybrid_attributes_view_v1
--rollback: SELECT 1
do
$$
DECLARE 
	_is_view int;
	_is_table int;
begin

	select count(*) as cnt into _is_table
	from information_schema."tables" c  
	where table_name = 'oms_product_hybrid_attributes' and table_schema = 'inventory_smart' 
	and table_type = 'BASE TABLE';

	select count(*) as cnt into _is_view
	from information_schema."tables" c  
	where table_name = 'oms_product_hybrid_attributes' and table_schema = 'inventory_smart' 
	and table_type = 'VIEW';

	IF _is_table = 1 THEN 
	
		DROP TABLE IF EXISTS inventory_smart.oms_product_hybrid_attributes;
		--raise notice 'dropping table....';
		
	END IF;
	
	IF _is_view = 1 THEN 
	
		DROP VIEW IF EXISTS inventory_smart.oms_product_hybrid_attributes;
		--raise notice 'dropping view....';
		
	END IF;
	
CREATE OR REPLACE VIEW inventory_smart.oms_product_hybrid_attributes
AS SELECT 
    dsr.version_code,
	dsr.product_code,
	dsr.ordering,
	dsr.replenishment_status,
	dsr.last_changed_date
   FROM inventory_smart.oms_product_hybrid_attributes_version dsr
  WHERE dsr.version_code = global.get_table_version('inventory_smart.oms_product_hybrid_attributes_version'::text);

end;
$$;

