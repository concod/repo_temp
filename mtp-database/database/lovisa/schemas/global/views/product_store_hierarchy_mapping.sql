--liquibase formatted sql
--changeset swapnil.bhange:product_store_hierarchy_mapping runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for product_store_hierarchy_mapping
--rollback: SELECT 1
do
$$
DECLARE 
	_is_view int;
	_is_table int;
begin

	select count(*) as cnt into _is_table
	from information_schema."tables" c  
	where table_name = 'product_store_hierarchy_mapping' and table_schema = 'global' 
	and table_type = 'BASE TABLE';

	select count(*) as cnt into _is_view
	from information_schema."tables" c  
	where table_name = 'product_store_hierarchy_mapping' and table_schema = 'global' 
	and table_type = 'VIEW';

	IF _is_table = 1 THEN 
	
		DROP TABLE IF EXISTS "global".product_store_hierarchy_mapping;
		--raise notice 'dropping table....';
		
	END IF;
	
	IF _is_view = 1 THEN 
	
		DROP VIEW IF EXISTS "global".product_store_hierarchy_mapping;
		--raise notice 'dropping view....';
		
	END IF;
	
	
    CREATE OR REPLACE VIEW "global".product_store_hierarchy_mapping
    AS SELECT product_store_hierarchy_mapping_version.l0_name,
    product_store_hierarchy_mapping_version.l1_name,
    product_store_hierarchy_mapping_version.l2_name,
    product_store_hierarchy_mapping_version.l3_name,
    product_store_hierarchy_mapping_version.s0_name,
    product_store_hierarchy_mapping_version.s1_name,
    product_store_hierarchy_mapping_version.channel,
    product_store_hierarchy_mapping_version.version_code
    FROM global.product_store_hierarchy_mapping_version
    WHERE product_store_hierarchy_mapping_version.version_code = global.get_table_version('global.product_store_hierarchy_mapping_version'::text);

end;
$$;

