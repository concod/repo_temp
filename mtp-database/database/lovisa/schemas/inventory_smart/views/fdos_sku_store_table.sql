--liquibase formatted sql
--changeset swapnil.bhange:fdos_sku_store_table runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for fdos_sku_store_table
--rollback: SELECT 1
do
$$
DECLARE 
	_is_view int;
	_is_table int;
begin

	select count(*) as cnt into _is_table
	from information_schema."tables" c  
	where table_name = 'fdos_sku_store_table' and table_schema = 'inventory_smart' 
	and table_type = 'BASE TABLE';

	select count(*) as cnt into _is_view
	from information_schema."tables" c  
	where table_name = 'fdos_sku_store_table' and table_schema = 'inventory_smart' 
	and table_type = 'VIEW';

	IF _is_table = 1 THEN 
	
		DROP TABLE IF EXISTS inventory_smart.fdos_sku_store_table;
		--raise notice 'dropping table....';
		
	END IF;
	
	IF _is_view = 1 THEN 
	
		DROP VIEW IF EXISTS inventory_smart.fdos_sku_store_table;
		--raise notice 'dropping view....';
		
	END IF;
	
CREATE OR REPLACE VIEW inventory_smart.fdos_sku_store_table
AS SELECT 
        fdos_sku_store_table_version.version_code,
        fdos_sku_store_table_version.article,
        fdos_sku_store_table_version.date,
        fdos_sku_store_table_version.fiscal_year,
        fdos_sku_store_table_version.it,
        fdos_sku_store_table_version.it_dc,
        fdos_sku_store_table_version.lw_fiscal_week,
        fdos_sku_store_table_version.lw_fiscal_year_week,
        fdos_sku_store_table_version.oh,
        fdos_sku_store_table_version.oh_dc,
        fdos_sku_store_table_version.oo,
        fdos_sku_store_table_version.oo_dc,
        fdos_sku_store_table_version.dc_oo_po,
        fdos_sku_store_table_version.product_code,
        fdos_sku_store_table_version.store_code,
        fdos_sku_store_table_version.tot_inv,
        fdos_sku_store_table_version.total_forecast,
        fdos_sku_store_table_version.dos,
        fdos_sku_store_table_version.dos_oh,
        fdos_sku_store_table_version.dos_oh_it,
        fdos_sku_store_table_version.dos_oh_oo,
        fdos_sku_store_table_version.store_level_prediction,
        fdos_sku_store_table_version.store_level_actuals,
        fdos_sku_store_table_version.size_integrity,
        fdos_sku_store_table_version.dc_oh_oo_it_dos,
        fdos_sku_store_table_version.dc_oh_dos,
        fdos_sku_store_table_version.dc_oh_oo_dos,
        fdos_sku_store_table_version.l0_name
    FROM inventory_smart.fdos_sku_store_table_version
  WHERE fdos_sku_store_table_version.version_code = global.get_table_version('inventory_smart.fdos_sku_store_table_version'::text);

end;
$$;
