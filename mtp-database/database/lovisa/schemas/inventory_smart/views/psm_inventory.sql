--liquibase formatted sql
--changeset swapnil.bhange:psm_inventory runOnChange:true stripComments:false splitStatements:false context:MTP-106579 labels:MTP-1
--comment: initial changeset for psm_inventory
--rollback: SELECT 1
do
$$
DECLARE 
	_is_view int;
	_is_table int;
begin

	select count(*) as cnt into _is_table
	from information_schema."tables" c  
	where table_name = 'psm_inventory' and table_schema = 'inventory_smart' 
	and table_type = 'BASE TABLE';

	select count(*) as cnt into _is_view
	from information_schema."tables" c  
	where table_name = 'psm_inventory' and table_schema = 'inventory_smart' 
	and table_type = 'VIEW';

	IF _is_table = 1 THEN 
	
		DROP TABLE IF EXISTS inventory_smart.psm_inventory;
		--raise notice 'dropping table....';
		
	END IF;
	
	IF _is_view = 1 THEN 
	
		DROP VIEW IF EXISTS inventory_smart.psm_inventory;
		--raise notice 'dropping view....';
		
	END IF;
	
 CREATE OR REPLACE VIEW inventory_smart.psm_inventory AS
     SELECT
 	psm_inventory_version.product_code, 
 	psm_inventory_version.store_code, 
 	psm_inventory_version.article, 
 	psm_inventory_version.total_inv, 
 	psm_inventory_version.display_article
 	from inventory_smart.psm_inventory_version
 	WHERE psm_inventory_version.version_code = global.get_table_version('inventory_smart.psm_inventory_version'::text);

end;
$$;



