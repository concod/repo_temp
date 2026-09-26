--liquibase formatted sql
--changeset swapnil.bhange@impactanalytics.co:generate_rcl_constraint_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-54520
--comment: initial changeset for generate_rcl_constraint_data
--rollback: SELECT 1
DROP FUNCTION if exists "inventory_smart".generate_rcl_constraint_data(_inputs jsonb, _module_code integer, _date date);
DROP FUNCTION if exists "inventory_smart".generate_rcl_constraint_data(_inputs jsonb, _module_code integer, _date date, _hide_non_match boolean);
----	CREATE OR REPLACE FUNCTION inventory_smart.generate_rcl_constraint_data(_inputs jsonb, _module_code integer, _date date, _hide_non_match boolean DEFAULT true)
----	 RETURNS TABLE(product_code text, store_code text, rcl_code integer, wos real, transit_time real, safety_stock real, min_stock real, max_stock real, aps real, ros real, st real)
----	 LANGUAGE plpgsql
----	AS $function$ 
----	#variable_conflict use_column 
----	declare 
----		_rcl_code integer;
----		_rcl_codes integer[];
----		_hash_query text;
----		_rcl_last_modified timestamp;
----		_query_combine text;
----		_query_pa text;
----		_query_parts text[] := '{}'::text[];
----		_input_table_id varchar;
----		_input_table_ids varchar[] := '{}'::varchar[];
----		_input_cols varchar;
----		_loop_counter int := 0;
----		_remaining_inputs int := 99999999;
----		_filter_con text := case when _hide_non_match then ' WHERE rcl_code is not null' else '' end;
----	begin
----	------ Get rcls ------
----		select
----			array_agg(rcl_code order by priority asc),
----			string_agg(global.get_rcl_hash_query(rcl_code,level), ', '),
----			max(greatest(updated_at, created_at)) into _rcl_codes, _hash_query, _rcl_last_modified
----		from global.rcl_master where
----			not is_deleted
----			and module_code = _module_code
----			and validity @> _date
----		group by is_deleted;
----		raise notice '_rcl_codes:%, _hash_query:%', _rcl_codes, _hash_query;
----	------ Get Inputs ------ Must be Async Query because of commit for next call
----		_query_pa := 'select 
----			product_code,
----			store_code,
----			psa_codes,
----			null::int4 as rcl_code,
----			null::float as wos
----			, null::float as transit_time
----			, null::float as safety_stock
----			, null::float as min_stock
----			, null::float as max_stock
----			, null::float as aps
----			, null::float as ros,
----			' || _hash_query || ' from (select
----			value->>''p'' as product_code,
----			value->>''s'' as store_code,
----			(select psa_codes from global.product_store_attributes_filter_lookup where store_code = value->>''s'') as psa_codes
----		from
----			jsonb_array_elements(''' || _inputs || ''')
----		) x join global.product_attributes_filter y using(product_code)';
----		raise notice '_query_pa: %', _query_pa;
----		select * from 
----		  cache.wrap_sp('inventory_smart', 'rcl_constraint_master_input', 
----		  jsonb_build_object('map', _inputs, 'rcl_codes', _rcl_codes, 'rcl_last_modified', _rcl_last_modified), 
----		  _query_pa, '{}'::varchar[], '{schema_name}:{sp_name}:{request}') into _input_table_id;
----		raise notice '_input_table_id: %', _input_table_id;
----	
----		SELECT string_agg('x.' || a.attname, ', ') into _input_cols
----		FROM pg_attribute a
----		  JOIN pg_class t on a.attrelid = t.oid
----		  JOIN pg_namespace s on t.relnamespace = s.oid
----		WHERE 
----		a.attnum > 0 
----		--  AND NOT a.attisdropped
----		  AND t.relname = _input_table_id
----		  AND s.nspname = 'cache'
----		  AND a.attname not in('rcl_code', 'is_active', 'wos', 'transit_time', 'safety_stock', 'min_stock', 'max_stock', 'aps', 'ros');
----	   	raise notice '_input_cols: %', _input_cols;
----	------ Loop rcls ------
----		foreach _rcl_code in array _rcl_codes loop
----			if array_length(_input_table_ids, 1) > 0 then
----				execute 'SELECT COUNT(1) FROM cache."' || _input_table_id || '" WHERE rcl_code is null' into _remaining_inputs;
----			end if;
----			if _remaining_inputs > 0 then
----				_query_combine := format($$ 
----					with inp as materialized (
----						select 
----						  * 
----						from 
----						  cache."%3$s" 
----						where 
----						  rcl_code is null
----					),
----					inp_rule as (
----						select x.*, y.rcl_code as e_rcl_code, y.rule_code from inp x left join (
----							select
----								rcl_code,
----								rule_code,
----								md5(rcl_dimension::text) as rcl_dimention
----							from
----								inventory_smart.rcl_constraint_master_rule
----							where
----								rcl_code = %1$s
----						) y on x.rcl_hash_%1$s = y.rcl_dimention
----					),
----					re as materialized (
----						select 
----						  %2$s, 
----						  x.e_rcl_code,
----						  x.rule_code,
----						  y.rcl_code,
----						  y.wos,
----						  y.transit_time,
----						  y.safety_stock,
----						  y.min_stock,
----						  y.max_stock,
----						  y.aps,
----						  y.ros,
----						  y.st
----						from 
----						  inp_rule x 
----						  left join (
----						  	select rcl_code, rule_code, store_code, wos,
----							  transit_time,
----							  safety_stock,
----							  min_stock,
----							  max_stock,
----							  aps,
----							  ros,
----							  st from inventory_smart.rcl_constraint_master_exceptions where rcl_code = %1$s 
----						  	and validity @> '%4$s'::date
----						  ) y
----						  on x.e_rcl_code is not null and x.e_rcl_code = y.rcl_code and x.rule_code = y.rule_code and x.store_code = y.store_code
----					),
----					rd as materialized (
----						select 
----						  %2$s, 
----						  coalesce(x.rcl_code, y.rcl_code) as rcl_code, 
----	--					  coalesce(x.is_active, y.is_active) as is_active
----							coalesce(x.wos, y.wos) as wos,
----							coalesce(x.transit_time, y.transit_time) as transit_time,
----							coalesce(x.safety_stock, y.safety_stock) as safety_stock,
----							coalesce(x.min_stock, y.min_stock) as min_stock,
----							coalesce(x.max_stock, y.max_stock) as max_stock,
----							coalesce(x.aps, y.aps) as aps,
----							coalesce(x.ros, y.ros) as ros,
----							coalesce(x.st, y.st) as st
----						from 
----						  re x 
----						  left join (
----						  	select rcl_code, rule_code, psa_code, wos,
----							  transit_time,
----							  safety_stock,
----							  min_stock,
----							  max_stock,
----							  aps,
----							  ros,
----							  st from inventory_smart.rcl_constraint_master where rcl_code = %1$s 
----						  	and validity @> '%4$s'::date
----						  ) y on x.e_rcl_code is not null and x.rcl_code is null and x.e_rcl_code = y.rcl_code and x.rule_code = y.rule_code and y.psa_code = any(x.psa_codes)
----					)
----					select
----						*
----					from
----						rd $$, _rcl_code, _input_cols, _input_table_id, _date);
----				raise notice '_query_combine: %', _query_combine;
----				select * from 
----				  cache.wrap_sp('inventory_smart', 'generate_rcl_constraint_master_data', 
----				  jsonb_build_object('input_table', _input_table_id, 'rcl_code', _rcl_code, 'date', _date), 
----				  _query_combine, '{}'::varchar[], '{schema_name}:{sp_name}:{request}') into _input_table_id;
----	--			raise notice '_input_table_id: %', _input_table_id;
----				_input_table_ids := array_append(_input_table_ids, _input_table_id);
----			end if;
----		end loop;
----	------ Build final query ------
----		foreach _input_table_id in array _input_table_ids loop
----			_loop_counter := _loop_counter + 1;
----			if _loop_counter = array_length(_input_table_ids, 1) then
----				_query_parts := array_append(_query_parts, 'SELECT product_code, store_code, rcl_code, wos, transit_time, safety_stock,	min_stock, max_stock, aps, ros, st FROM cache."' || _input_table_id || '"');
----			else
----				_query_parts := array_append(_query_parts, 'SELECT product_code, store_code, rcl_code, wos, transit_time, safety_stock,	min_stock, max_stock, aps, ros, st FROM cache."' || _input_table_id || '" WHERE rcl_code is not null');
----			end if;
----		end loop;
----		raise notice '_query_parts: %', _query_parts;
----		select string_agg(q, ' UNION ALL ') into _query_combine from unnest(_query_parts) as q;
----		if _hide_non_match then
----			_query_combine := 'select * from (' || _query_combine || ') X where rcl_code is not null';
----		end if;
----		raise notice '_query_combine: %', _query_combine;
----		return query execute _query_combine;
----	end
----	$function$
----	;

--changeset liquibase:generate_rcl_constraint_data_with_tbl_name_input runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for generate_rcl_constraint_data
DROP FUNCTION if exists "inventory_smart".generate_rcl_constraint_data(_inputs text, _module_code integer, _date date);
DROP FUNCTION if exists "inventory_smart".generate_rcl_constraint_data(_inputs text, _module_code integer, _date date, _hide_non_match boolean);
CREATE OR REPLACE FUNCTION inventory_smart.generate_rcl_constraint_data(_inputs text, _module_code integer, _date date, _hide_non_match boolean DEFAULT true)
 RETURNS TABLE(article text, product_code text, store_code text, rcl_code integer, wos real, transit_time real, safety_stock real, min_stock real, max_stock real, aps real, ros real, st real)
 LANGUAGE plpgsql
AS $function$ 
#variable_conflict use_column 
declare 
	_rcl_code integer;
	_rcl_codes integer[];
	_hash_query text;
	_hash_cols text;
	_rcl_last_modified timestamp;
	_query_combine text;
	_query_pa text;
	_query_parts text[] := '{}'::text[];
	_input_query text;
	_input_table_id varchar;
	_input_table_ids varchar[] := '{}'::varchar[];
	_input_cols varchar;
	_loop_counter int := 0;
	_remaining_inputs int := 99999999;
	_filter_con text := case when _hide_non_match then ' WHERE rcl_code is not null' else '' end;
begin
------ Get rcls ------
	select
		array_agg(rcl_code order by priority asc),
		-- string_agg(global.get_rcl_hash_query(rcl_code, level), ', '),
		string_agg('rcl_hash->>' || quote_literal(rcl_code) || ' as rcl_hash_' || rcl_code, ', '),
		string_agg('x.rcl_hash_' || rcl_code, ', '),
		max(greatest(updated_at, created_at)) into _rcl_codes, _hash_query, _hash_cols, _rcl_last_modified
	from global.rcl_master where
		not is_deleted
		and module_code = _module_code
		and validity @> _date
	group by is_deleted;
	raise notice '_rcl_codes:%, _hash_query:%', _rcl_codes, _hash_query;
------ Get Inputs ------ Must be Async Query because of commit for next call
	_input_query := 'select
		y.article::text as article,
		product_code::text as product_code,
		store_code::text as store_code,
		array[psa_code] as psa_codes,
		null::int4 as rcl_code,
		null::float as wos,
		null::float as transit_time,
		null::float as safety_stock,
		null::float as min_stock,
		null::float as max_stock,
		null::float as aps,
		null::float as ros,
		' || _hash_query || '
	from
		' || _inputs || ' x join global.product_attributes_filter y using(product_code)';
--	raise notice '_query_pa: %', _query_pa;
--	select * from 
--	  cache.wrap_sp('global', 'rcl_psm_input', 
--	  jsonb_build_object('map', _inputs, 'rcl_codes', _rcl_codes, 'rcl_last_modified', _rcl_last_modified), 
--	  _query_pa, '{}'::varchar[], '{schema_name}:{sp_name}:{request}') into _input_table_id;
--	raise notice '_input_table_id: %', _input_table_id;
--	SELECT string_agg('x.' || a.attname, ', ') into _input_cols
--	FROM pg_attribute a
--	  JOIN pg_class t on a.attrelid = t.oid
--	  JOIN pg_namespace s on t.relnamespace = s.oid
--	WHERE 
--	a.attnum > 0 
--	--  AND NOT a.attisdropped
--	  AND t.relname = _input_table_id
--	  AND s.nspname = 'cache'
--	  AND a.attname not in('rcl_code', 'is_active');
	 _input_cols := 'x.article, x.product_code, x.store_code, x.psa_codes, ' || _hash_cols;
--  raise notice '_input_cols: %', _input_cols;
---- Loop rcls ------
	foreach _rcl_code in array _rcl_codes loop
		if array_length(_input_table_ids, 1) > 0 then
			execute 'SELECT COUNT(1) FROM cache."' || _input_table_id || '" WHERE rcl_code is null' into _remaining_inputs;
			_input_query := format($$
				select 
				  * 
				from 
				  cache."%1$s" 
				where 
				  rcl_code is null $$, _input_table_id);
		end if;
		if _remaining_inputs > 0 then
			_query_combine := format($$ 
				with inp as materialized (
					%3$s
				),
				inp_rule as (
					select x.*, y.rcl_code as e_rcl_code, y.rule_code from inp x left join (
						select
							rcl_code,
							rule_code,
							md5(rcl_dimension::text) as rcl_dimention
						from
							inventory_smart.rcl_constraint_master_rule
						where
							rcl_code = %1$s
					) y on x.rcl_hash_%1$s = y.rcl_dimention
				),
				re as materialized (
					select 
					  %2$s, 
					  x.e_rcl_code,
					  x.rule_code,
					  y.rcl_code,
					  y.wos,
					  y.transit_time,
					  y.safety_stock,
					  y.min_stock,
					  y.max_stock,
					  y.aps,
					  y.ros,
					  y.st
					from 
					  inp_rule x 
					  left join (
					  	select rcl_code, rule_code, store_code, wos,
						  transit_time,
						  safety_stock,
						  min_stock,
						  max_stock,
						  aps,
						  ros,
						  st from inventory_smart.rcl_constraint_master_exceptions where rcl_code = %1$s 
					  	and validity @> '%4$s'::date
					  ) y
					  on 
					  -- x.e_rcl_code is not null and  -- commented as need a full index only scan and optimize performace ashish
					  x.e_rcl_code = y.rcl_code and x.rule_code = y.rule_code and x.store_code = y.store_code
				),
				rd as materialized (
					select 
					  %2$s, 
					  coalesce(x.rcl_code, y.rcl_code) as rcl_code, 
--					  coalesce(x.is_active, y.is_active) as is_active
						coalesce(x.wos, y.wos) as wos,
						coalesce(x.transit_time, y.transit_time) as transit_time,
						coalesce(x.safety_stock, y.safety_stock) as safety_stock,
						coalesce(x.min_stock, y.min_stock) as min_stock,
						coalesce(x.max_stock, y.max_stock) as max_stock,
						coalesce(x.aps, y.aps) as aps,
						coalesce(x.ros, y.ros) as ros,
						coalesce(x.st, y.st) as st
					from 
					  re x 
					  left join (
					  	select rcl_code, rule_code, psa_code, wos,
						  transit_time,
						  safety_stock,
						  min_stock,
						  max_stock,
						  aps,
						  ros,
						  st from inventory_smart.rcl_constraint_master where rcl_code = %1$s 
					  	and validity @> '%4$s'::date
					  ) y on 
					  -- x.e_rcl_code is not null and  -- commented as need a full index only scan and optimize performace ashish
					  x.rcl_code is null and x.e_rcl_code = y.rcl_code and x.rule_code = y.rule_code and y.psa_code = any(x.psa_codes)
				)
				select
					*
				from
					rd $$, _rcl_code, _input_cols, _input_query, _date);
			raise notice '_query_combine: %', _query_combine;
			select * from 
			  cache.wrap_sp('inventory_smart', 'generate_rcl_constraint_master_data', 
			  jsonb_build_object('input_table', coalesce(_input_table_id, _inputs), 'rcl_code', _rcl_code, 'date', _date), 
			  _query_combine, '{}'::varchar[], '{schema_name}:{sp_name}:{request}') into _input_table_id;
--			raise notice '_input_table_id: %', _input_table_id;
			_input_table_ids := array_append(_input_table_ids, _input_table_id);
		end if;
	end loop;
------ Build final query ------
	foreach _input_table_id in array _input_table_ids loop
		_loop_counter := _loop_counter + 1;
		if _loop_counter = array_length(_input_table_ids, 1) then
			_query_parts := array_append(_query_parts, 'SELECT article, product_code, store_code, rcl_code, wos, transit_time, safety_stock,	min_stock, max_stock, aps, ros, st FROM cache."' || _input_table_id || '"');
		else
			_query_parts := array_append(_query_parts, 'SELECT article, product_code, store_code, rcl_code, wos, transit_time, safety_stock,	min_stock, max_stock, aps, ros, st FROM cache."' || _input_table_id || '" WHERE rcl_code is not null');
		end if;
	end loop;
	raise notice '_query_parts: %', _query_parts;
	select string_agg(q, ' UNION ALL ') into _query_combine from unnest(_query_parts) as q;
	if _hide_non_match then
		_query_combine := 'select * from (' || _query_combine || ') X where rcl_code is not null';
	end if;
	raise notice '_query_combine: %', _query_combine;
	return query execute _query_combine;
end
$function$
;
