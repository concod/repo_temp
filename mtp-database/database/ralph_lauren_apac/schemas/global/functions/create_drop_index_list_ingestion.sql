--liquibase formatted sql
--changeset ashish@impactanalytics.co:create_drop_index_list_ingestion runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:DAT-832
--comment: initial changeset for create_drop_index_list_ingestion
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.create_drop_index_list_ingestion(_schema character varying, _table character varying, _cleanup boolean);
CREATE OR REPLACE FUNCTION global.create_drop_index_list_ingestion(_schema character varying, _table character varying, _cleanup boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
		_drop varchar;
--		_nested_schema varchar;
--		_nested_table varchar;
		_worker text;
		_workers_status bool := true;
		_worker_status bool;
		_rs jsonb;
		_rss jsonb[];
		_r record;
		_inserts text[];
	begin
		if _cleanup then
			-- All non primary and non unique constraints
			for _r in select 
			  table_name, 
			  connamespace::regnamespace::varchar as "schema_name", 
			  "name", 
			  'ALTER TABLE ' || connamespace::regnamespace::varchar || '.' || "table_name" || ' ADD CONSTRAINT ' || "name" || ' ' || _def || ';' as def, 
			  'ALTER TABLE ' || connamespace::regnamespace::varchar || '.' || "table_name" || ' DROP CONSTRAINT IF EXISTS ' || "name" || ';' as drop_def, 
			  contype as "type"
			from 
			  (
			    SELECT 
			      replace(
			        conrelid::regclass::varchar, 
			        (_schema || '.'), 
			        ''
			      ) AS "table_name", 
			      conname AS "name", 
			      contype, 
			      connamespace, 
			      pg_get_constraintdef(oid) as _def 
			    FROM 
			      pg_constraint 
			    WHERE 
			      connamespace = _schema::regnamespace 
			      and conrelid = (
			        _schema || '.' || _table
			      ):: regclass 
			      and conparentid = 0 
			      and contype not in('p')
			  ) x 
			union 
			-- All non primary but unique constraints
--			select 
--			  x.table_name, 
--			  x.connamespace::regnamespace::varchar as "schema_name", 
--			  x."name", 
--			  (
--			    replace(
--			        replace (indexdef, 'ONLY', ''), 
--			      'CREATE UNIQUE INDEX', 
--			      'CREATE UNIQUE INDEX IF NOT EXISTS'
--			    ) || ';'
--			  ) || (
--			    'ALTER TABLE ' || connamespace::regnamespace::varchar || '.' || "table_name" || ' ADD CONSTRAINT ' || "name" || ' UNIQUE USING INDEX ' || indexname || ';'
--			  ) as def, 
--			  'ALTER TABLE ' || connamespace::regnamespace::varchar || '.' || "table_name" || ' DROP CONSTRAINT IF EXISTS ' || "name" || ';' as drop_def, 
--			  'uc' as "type" 
--			from 
--			  (
--			    SELECT 
--			      replace(
--			        conrelid::regclass::varchar, 
--			        (_schema || '.'), 
--			        ''
--			      ) AS "table_name", 
--			      conname AS "name", 
--			      contype, 
--			      connamespace, 
--			      pg_get_constraintdef(oid) as _def, 
--			      conindid 
--			    FROM 
--			      pg_constraint 
--			    WHERE 
--			      connamespace = _schema::regnamespace 
--			      and conrelid = (
--			        _schema || '.' || _table
--			      )::regclass 
--			      and conparentid = 0 
--			      and contype = 'u'
--			  ) x 
--			  join (
--			    select 
--			      * 
--			    from 
--			      pg_index pgi 
--			      join pg_class idx on idx.oid = pgi.indexrelid 
--			      join pg_namespace insp on insp.oid = idx.relnamespace 
--			      join pg_class tbl on tbl.oid = pgi.indrelid 
--			      join pg_namespace tnsp on tnsp.oid = tbl.relnamespace 
--			      join pg_indexes pid on insp.nspname = pid.schemaname 
--			      and tbl.relname = pid.tablename 
--			      and idx.relname = pid.indexname 
--			    where 
--			      pgi.indisunique = true 
--			      and indisprimary = false 
--			      and tnsp.nspname = _schema
--			      and tbl.relname = _table
--			  ) y on x.conindid = y.indexrelid 
--			union 
		  	-- All non primary and non unique indexes
			select 
			  tbl.relname as "table_name", 
			  tnsp.nspname as "schema_name", 
			  schemaname || '.' || indexname as "name", 
			  (
			    replace(
			        replace (indexdef, 'ONLY', ''), 
			        'CREATE INDEX', 
			        'CREATE INDEX IF NOT EXISTS'
			    ) || ';'
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
			  and tbl.relname = _table loop 
			  	_inserts := array_append(_inserts, '(''' || _r.table_name || ''', ''' || _r.schema_name || ''', ''' || _r.name || ''', ''' || (REGEXP_REPLACE(_r.def, $$([^'])'([^'])$$, $$\1''\2$$ ,'g')) || ''', ''' || _r.drop_def || ''', ''' || _r.type || ''')');
			  end loop;
			  if cardinality(_inserts) > 0 then
				select async_query into _worker from public.async_query('insert into global.index_drop_create (
				  	table_name, schema_name, "name", def, drop_def, "type"
				) VALUES ' || (ARRAY_TO_STRING(_inserts, ', ', ''))  || ' ON CONFLICT DO NOTHING;');
				perform public.async_query_status(_worker, 'insert');
			end if;
			/* Planned for partitions
			for _nested_schema, _nested_table in select
				nmsp_child.nspname::varchar,
				child.relname::varchar
			from
				pg_inherits
			join pg_class parent on
				pg_inherits.inhparent = parent.oid
			join pg_class child on
				pg_inherits.inhrelid = child.oid
			join pg_namespace nmsp_parent on
				nmsp_parent.oid = parent.relnamespace
			join pg_namespace nmsp_child on
				nmsp_child.oid = child.relnamespace
			where
				nmsp_parent.nspname = _schema
				and parent.relname = _table
			order by
				nmsp_parent.nspname,
				parent.relname asc
			loop
				perform global.create_drop_index_list_ingestion(_nested_schema, _nested_table, true);
			end loop;
			*/
			FOR _rs in select
				jsonb_build_object('def', drop_def, 'type', (case when "type" in ('u', 'c', 'f') then 'constraint' when "type" in ('i') then 'index' end))
			from
				global.index_drop_create
			where
				"schema_name" = _schema
				and "table_name" = _table
			ORDER BY POSITION("type" IN 'i, u, c, f') loop
				select async_query into _worker from public.async_query(_rs->>'def');
				_rs := _rs || jsonb_build_object('worker', _worker);
				_rss := array_append(_rss, _rs);
			end loop;
			if cardinality(_rss) > 0 THEN
				FOREACH _rs in array _rss loop
					select async_query_status into _worker_status from public.async_query_status(_rs->>'worker', _rs->>'type');
					_workers_status := _workers_status and _worker_status;
				end loop;
			end if;
			raise notice '_workers_status: %', _workers_status;
		else
			/* Planned for partitions
			for _nested_schema, _nested_table in select
				nmsp_child.nspname::varchar,
				child.relname::varchar
			from
				pg_inherits
			join pg_class parent on
				pg_inherits.inhparent = parent.oid
			join pg_class child on
				pg_inherits.inhrelid = child.oid
			join pg_namespace nmsp_parent on
				nmsp_parent.oid = parent.relnamespace
			join pg_namespace nmsp_child on
				nmsp_child.oid = child.relnamespace
			where
				nmsp_parent.nspname = _schema
				and parent.relname = _table
			order by
				nmsp_parent.nspname,
				parent.relname asc
			loop
				perform global.create_drop_index_list_ingestion(_nested_schema, _nested_table, false);
			end loop;
		*/
--		FOR _rs in select
--			jsonb_build_object('def', def, 'type', (case when "type" in ('f', 'c', 'u') then 'constraint' when "type" in ('i') then 'index' end))
--		from
--			global.index_drop_create
--		where
--			"schema_name" = _schema
--			and "table_name" = _table
--		ORDER BY POSITION("type" IN 'fk_ch, uc, i') loop
--			select async_query into _worker from public.async_query(_rs->>'def');
--			_rs := _rs || jsonb_build_object('worker', _worker);
--			_rss := array_append(_rss, _rs);
--		end loop;
--		FOREACH _rs in array _rss loop
--			select async_query_status into _worker_status from public.async_query_status(_rs->>'worker', _rs->>'type');
--			_workers_status := _workers_status and _worker_status;
--		end loop;
--		raise notice '_workers_status: %', _workers_status;
	end if;
end $function$
;
