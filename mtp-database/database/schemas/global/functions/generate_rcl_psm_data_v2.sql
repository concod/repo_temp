--liquibase formatted sql
--changeset jitendra.singh@impactanalytics.co:generate_rcl_psm_data_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-58203
--comment: modified changeset for generate_rcl_psm_data
DROP FUNCTION if exists "global".generate_rcl_psm_data_v2(_inputs text, _module_code integer, _date date, _hide_non_match boolean);
CREATE OR REPLACE FUNCTION global.generate_rcl_psm_data_v2(_inputs text, _module_code integer, _date date, _hide_non_match boolean DEFAULT true)
 RETURNS TABLE(product_code text, store_code text, rcl_code integer, is_active boolean)
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
	-- validity top to bottom i.e. rcl -> exception -> main
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
--	raise notice '_rcl_codes:%, _hash_query:%', _rcl_codes, _hash_query;
------ Get Inputs ------ Must be Async Query because of commit for next call
	_input_query := 'select
		product_code::text as product_code,
		store_code::text as store_code,
		array[psa_code] as psa_codes,
		null::int4 as rcl_code,
		null::bool as is_active,
		' || _hash_query || '
	from
		' || _inputs || ' x join global.product_attributes_filter y using(product_code)';
--	raise notice '_query_pa: %', _query_pa;
	 _input_cols := 'x.product_code, x.store_code, x.psa_codes, ' || _hash_cols;
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
							global.rcl_product_mapping_product_store_rule
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
					  y.is_active
					from 
					  inp_rule x 
					  left join (
					  	select rcl_code, rule_code, store_code, false as is_active from global.rcl_product_mapping_product_store_exceptions where rcl_code = %1$s 
					  	and validity @> '%4$s'::date
					  ) y
					  on 
					  -- x.e_rcl_code is not null and -- commented as need a full index only scan and optimize performace ashish
					  x.e_rcl_code = y.rcl_code and x.rule_code = y.rule_code and x.store_code = y.store_code
				),
				rd as materialized (
					select 
					  %2$s, 
					  coalesce(x.rcl_code, y.rcl_code) as rcl_code, 
					  coalesce(x.is_active, y.is_active) as is_active 
					from 
					  re x 
					  left join (
					  	select rcl_code, rule_code, psa_code, (case when validity @> '%4$s'::date then true else false end) as is_active from global.rcl_product_mapping_product_store where rcl_code = %1$s 
--					  	and validity @> '%4$s'::date
					  ) y on 
					  -- x.e_rcl_code is not null and -- commented as need a full index only scan and optimize performace ashish
					  x.rcl_code is null and x.e_rcl_code = y.rcl_code and x.rule_code = y.rule_code and y.psa_code = any(x.psa_codes)
				)
				select
					*
				from
					rd $$, _rcl_code, _input_cols, _input_query, _date);
			raise notice '_query_combine: %', _query_combine;
--			raise notice '_input_table_id: %', _input_table_id;
			select * from 
			  cache.wrap_sp('global', 'generate_rcl_psm_data', 
			  jsonb_build_object('input_table', coalesce(_input_table_id, _inputs), 'rcl_code', _rcl_code, 'date', _date), 
			  _query_combine, '{}'::varchar[], '{schema_name}:{sp_name}:{request}') into _input_table_id;
--			raise notice '_input_table_id: %', _input_table_id;
			_input_table_ids := array_append(_input_table_ids, _input_table_id);
--			raise notice '_input_table_ids: %', _input_table_ids;
		end if;
	end loop;
------ Build final query ------
	foreach _input_table_id in array _input_table_ids loop
		_loop_counter := _loop_counter + 1;
		if _loop_counter = array_length(_input_table_ids, 1) then
			_query_parts := array_append(_query_parts, 'SELECT product_code, store_code, rcl_code, is_active FROM cache."' || _input_table_id || '"');
		else
			_query_parts := array_append(_query_parts, 'SELECT product_code, store_code, rcl_code, is_active FROM cache."' || _input_table_id || '" WHERE rcl_code is not null');
		end if;
	end loop;
--	raise notice '_query_parts: %', _query_parts;
	select string_agg(q, ' UNION ALL ') into _query_combine from unnest(_query_parts) as q;
	if _hide_non_match then
		_query_combine := 'select * from (' || _query_combine || ') X where rcl_code is not null and is_active = true';
	end if;
--	raise notice '_query_combine: %', _query_combine;
	return query execute _query_combine;
end
$function$
;