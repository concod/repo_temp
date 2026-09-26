--liquibase formatted sql
--changeset shameel.zeshan:generate_rcl_dc_store_policy runOnChange:true stripComments:false splitStatements:false context:MTP-43502 labels:MTP-54520
--comment: RCL sp generate_rcl_dc_store_policy for resolving dc-store strategy
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.generate_rcl_dc_store_policy(_inputs text, _module_code integer, _date date, _hide_non_match boolean);
DROP FUNCTION IF EXISTS inventory_smart.generate_rcl_dc_store_policy(_inputs text, _module_code integer, _date date, _hide_non_match boolean, _is_auto_allocation boolean);
CREATE OR REPLACE FUNCTION inventory_smart.generate_rcl_dc_store_policy(_inputs text, _module_code integer, _date date, _hide_non_match boolean DEFAULT true, _is_auto_allocation boolean DEFAULT false)
 RETURNS TABLE(product_code text, rcl_dc_store_policy_code integer, rcl_code integer, default_store_groups integer[], default_product_profile integer, dc_store_rule integer, auto_allocation_rule integer, auto_allocation_schedular integer)
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
	_auto_allocation_query text;
begin
	if _is_auto_allocation then
		_auto_allocation_query := format('
			SELECT 
				product_code::text,
				rcl_dc_store_policy_code::integer,
				rcl_code::integer,
				default_store_groups::integer[],
				default_product_profile::integer,
				dc_store_rule::integer,
				auto_allocation_rule::integer,
				auto_allocation_schedular::integer
			FROM inventory_smart.rcl_dc_store_policy_results
			JOIN  %s x  USING(product_code)
			', _inputs);
		return query execute _auto_allocation_query;
	else
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
			product_code::text as product_code,
	--		store_code::text as store_code,
	--		array[psa_code] as psa_codes,
			null::integer as rcl_code,
	        null::integer as  rcl_dc_store_policy_code,
			null::integer as default_product_profile,
			null::integer as dc_store_rule,
			null::integer as auto_allocation,
	     	null::integer as auto_allocation_schedular,
			null::integer[] as default_store_groups,
	     	null::integer as auto_allocation_rule,
	--		null::float as aps,
	--		null::float as ros,
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
		 _input_cols := 'x.product_code,' || _hash_cols;
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
				_query_combine := format( $$ 
					with inp as materialized (
						%3$s
					),
					inp_rule as (
						select x.* , y.rcl_code as e_rcl_code, y.rule_code from inp x left join (
 
							select
								rcl_code,
								rule_code,
								md5(rcl_dimension::text) as rcl_dimension
							from
								inventory_smart.rcl_dc_store_policy_rule
							where
								rcl_code = %1$s
						) y on x.rcl_hash_%1$s = y.rcl_dimension
					),
	--				re as materialized (
	--					select 
	--					  %2$s, 
	--					  x.e_rcl_code,
	--					  x.rule_code,
	--					  x.rcl_code
	--					from 
	--					  inp_rule x 
	--					  ),
					rd as materialized (
						select 
						  %2$s,  
						  coalesce (x.rcl_code, y.rcl_code) as rcl_code, 
	--					  coalesce (x.rule_code, y.rule_code) as rule_code,
	--					  coalesce(x.is_active, y.is_active) as is_active
						  coalesce (x.rcl_dc_store_policy_code, y.rcl_dc_store_policy_code) as rcl_dc_store_policy_code,
						  coalesce(x.default_product_profile, y.default_product_profile) as default_product_profile,
						  coalesce(
							array(
								select sg_code
								from unnest(coalesce(y.default_store_groups, x.default_store_groups)) as sg(dsg_code)
								join global.store_groups sg_table on sg.dsg_code = sg_table.sg_code
								where not sg_table.is_deleted
							), 
							'{}'
						  ) as default_store_groups,
						  coalesce(x.dc_store_rule, y.dc_store_rule) as dc_store_rule,
						  coalesce(x.auto_allocation_rule, y.auto_allocation_rule) as auto_allocation_rule,
						  coalesce(x.auto_allocation_schedular, y.auto_allocation_schedular) as auto_allocation_schedular
						from 
						  inp_rule x 
						  left join (
						  	select rcl_code ,rcl_dc_store_policy_code,rule_code, default_product_profile,
							  default_store_groups,
							  dc_store_rule,
							  auto_allocation_rule,
							  auto_allocation_schedular
							   from inventory_smart.rcl_dc_store_policy rdsp  where rcl_code = %1$s 
						  	and validity @> '%4$s'::date
						  ) y on 
						  -- x.e_rcl_code is not null and -- commented as need a full index only scan and optimize performace ashish
						  x.e_rcl_code = y.rcl_code and x.rule_code = y.rule_code
					)
			select *
					from
						rd $$, _rcl_code, _input_cols, _input_query, _date);
					raise notice '_query_combine: %', _query_combine;		
	         select * from 
				  cache.wrap_sp('inventory_smart', 'generate_rcl_dc_store_policy', 
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
				_query_parts := array_append(_query_parts, 'SELECT product_code,rcl_dc_store_policy_code,rcl_code,default_store_groups,default_product_profile,dc_store_rule,auto_allocation_rule,auto_allocation_schedular FROM cache."' || _input_table_id || '"');
			else
				_query_parts := array_append(_query_parts, 'SELECT product_code,rcl_dc_store_policy_code,rcl_code,default_store_groups,default_product_profile,dc_store_rule,auto_allocation_rule,auto_allocation_schedular FROM cache."' || _input_table_id || '" WHERE rcl_code is not null');
			end if;
		end loop; 
		raise notice '_query_parts: %', _query_parts;
		select string_agg(q, ' UNION ALL ') into _query_combine from unnest(_query_parts) as q;
		if _hide_non_match then
			_query_combine := 'select * from (' || _query_combine || ') X where rcl_code is not null';
		end if;
		raise notice '_query_combine: %', _query_combine;
		return query execute _query_combine;
	end if;
end
$function$
;