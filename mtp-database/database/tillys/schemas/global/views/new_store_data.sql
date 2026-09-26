--liquibase formatted sql
--changeset gauri.nair:new_store_data runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for new_store_data
--rollback: SELECT 1
do
$$
DECLARE 
	_is_view int;
	_is_table int;
begin

	select count(*) as cnt into _is_table
	from information_schema."tables" c  
	where table_name = 'new_store_data' and table_schema = 'global' 
	and table_type = 'BASE TABLE';

	select count(*) as cnt into _is_view
	from information_schema."tables" c  
	where table_name = 'new_store_data' and table_schema = 'global' 
	and table_type = 'VIEW';

	IF _is_table = 1 THEN 
	
		DROP TABLE IF EXISTS "global".new_store_data;
		--raise notice 'dropping table....';
		
	END IF;
	
	IF _is_view = 1 THEN 
	
		DROP VIEW IF EXISTS "global".new_store_data;
		--raise notice 'dropping view....';
		
	END IF;
	
	CREATE OR REPLACE VIEW "global".new_store_data AS 
    SELECT new_store_data_version.version_code,
    new_store_data_version.store_code,
    new_store_data_version.store_name
   FROM global.new_store_data_version
  WHERE version_code = global.get_table_version('global.new_store_data_version'::text);

end;
$$;