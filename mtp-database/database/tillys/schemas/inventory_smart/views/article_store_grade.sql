--liquibase formatted sql
--changeset gauri.nair:article_store_grade runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for article_store_grade
--rollback: SELECT 1
do
$$
DECLARE 
	_is_view int;
	_is_table int;
begin

	select count(*) as cnt into _is_table
	from information_schema."tables" c  
	where table_name = 'article_store_grade' and table_schema = 'inventory_smart' 
	and table_type = 'BASE TABLE';

	select count(*) as cnt into _is_view
	from information_schema."tables" c  
	where table_name = 'article_store_grade' and table_schema = 'inventory_smart' 
	and table_type = 'VIEW';

	IF _is_table = 1 THEN 
	
		DROP TABLE IF EXISTS inventory_smart.article_store_grade;
		--raise notice 'dropping table....';
		
	END IF;
	
	IF _is_view = 1 THEN 
	
		DROP VIEW IF EXISTS inventory_smart.article_store_grade;
		--raise notice 'dropping view....';
		
	END IF;
	
CREATE OR REPLACE VIEW inventory_smart.article_store_grade
AS SELECT article_store_grade_version.version_code,
    article_store_grade_version.article,
    article_store_grade_version.store_code,
    article_store_grade_version.grade,
    article_store_grade_version.ph_code
    --article_store_grade_version.priority
   FROM inventory_smart.article_store_grade_version
  WHERE article_store_grade_version.version_code = global.get_table_version('inventory_smart.article_store_grade_version'::text);

end;
$$;
