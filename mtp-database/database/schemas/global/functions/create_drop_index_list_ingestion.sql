--liquibase formatted sql
--changeset kailash.yadav@impactanalytics.co:create_drop_index_list_ingestion runOnChange:true stripComments:false splitStatements:false context:New_Sync_Stratgy labels:DAT-832
--comment: remove on conflict index_drop_create
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.create_drop_index_list_ingestion(_schema character varying, _table character varying, _cleanup boolean);
CREATE OR REPLACE FUNCTION global.create_drop_index_list_ingestion(_schema character varying, _table character varying, _cleanup boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 	declare
 		_drop varchar;
		_create varchar;
 	begin
	 	if _cleanup then
			for _drop in 	
			 	insert
				into
				global.index_drop_create (
					table_name,
					schema_name,
					"name",
					def,
					drop_def,
					"type"
			)
			select 
			  table_name, 
			  connamespace::regnamespace::varchar as "schema_name", 
			  foreign_key as "name", 
			  'ALTER TABLE ' || connamespace::regnamespace::varchar || '.' || "table_name" || ' ADD CONSTRAINT ' || foreign_key || ' ' || _def || ';' as def, 
			  'ALTER TABLE ' || connamespace::regnamespace::varchar || '.' || "table_name" || ' DROP CONSTRAINT IF EXISTS ' || foreign_key || ';' as drop_def, 
			  'c' as "type" 
			from 
			  (
				SELECT 
				  replace(conrelid::regclass::varchar, (_schema || '.'), '') AS "table_name",
				  conname AS foreign_key, 
				  contype, 
				  connamespace, 
				  pg_get_constraintdef(oid) as _def 
				FROM 
				  pg_constraint 
				WHERE 
				  connamespace = _schema::regnamespace 
				  and conrelid = (_schema || '.' || _table)::regclass 
				  and conparentid = 0
				  and contype != 'p'
			  ) x 
			union 
			select 
			  tbl.relname as "table_name", 
			  tnsp.nspname as "schema_name", 
			  schemaname || '.' || indexname as "name", 
			  (
				replace(replace (indexdef, 'ONLY', ''), 'CREATE INDEX', 'CREATE INDEX IF NOT EXISTS') || ';'
			  ) as def, 
			  (
				'DROP INDEX IF EXISTS ' || schemaname || '.' || indexname || ';'
			  ) as drop_def, 
			  'i' as "type" 
			from 
			  pg_index pgi 
			  join pg_class idx on idx.oid = pgi.indexrelid 
			  join pg_namespace insp on insp.oid = idx.relnamespace 
			  join pg_class tbl on tbl.oid = pgi.indrelid 
			  join pg_namespace tnsp on tnsp.oid = tbl.relnamespace 
			  join pg_indexes pid on insp.nspname = pid.schemaname 
			  and tbl.relname = pid.tablename 
			  and idx.relname = pid.indexname 
			where 
			  pgi.indisunique = false 
			  and tnsp.nspname = _schema 
			  and tbl.relname = _table
			  on conflict do nothing
	        	 returning drop_def
			 	loop
				 	raise notice '%', _drop;
-- 				 	begin
 				 		execute _drop;
-- 				  		exception when others then null;
-- 				  	end;
			end loop;
--			execute 'ALTER TABLE ' || _schema || '.' || _table || ' SET unlogged;';
		if _table = 'product_mapping_product_store' then
			perform setval('global.product_mapping_product_store_mapping_code_seq', 1, true);
		end if;
	else
		for _create in 	
		 	select
			def
		from
			global.index_drop_create
		where
			"schema_name" = _schema
			and "table_name" = _table
		order by "type" asc
		 	loop
			 	raise notice '%', _create;
			 	BEGIN
			 		execute _create;
					EXCEPTION
					WHEN duplicate_table THEN
					WHEN duplicate_object THEN
						RAISE NOTICE 'Already exists';
				END;
		end loop;
--			execute 'ALTER TABLE ' || _schema || '.' || _table || ' SET logged;';
	end if;
end $function$
;
