--liquibase formatted sql
--changeset shashwat.yadav@impactanalytics.co:create_rcl_constraint_exception_generic runOnChange:true stripComments:false splitStatements:false context:MTP-104346 labels:MTP-104346
--comment: create_rcl_constraint_exception_generic optimized
--rollback: SELECT 1
DROP FUNCTION if exists inventory_smart.rcl_create_constraints_exceptions(varchar, int4[], jsonb, text[], jsonb, _created_by int, _product_filters jsonb, store_filters jsonb, additional_data jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.rcl_create_constraints_exceptions(character varying, integer[], jsonb, text[], _created_by integer, _product_filters jsonb, store_filters jsonb, additional_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_rule_filter text;
_index_query text;
_pa_query text;
_sa_query text;
_pa_where text;
_rcl_codes text;
_hash_cols text;
_columns_to_check text[] := array['store_name'];
_dynamic_columns text := '';
_column_name text;
_query_meta_filters text;
_select_columns text;
_paf_join text;
_psaf_join text;
_psa_code_column text;
_where_psa_code_clause text;
_store_group_join text;
_select_product_columns text;
/*
Sample Call - 
select * from inventory_smart.generic_rcl_create_constraints_exceptions('temp_rcl_constraints_exception_9a4f5f57',
'{112617}',
'{"search": [], "sort": [], "range": [], "limit": {"limit": 100, "page": 1, "offset": 0, "sub_offset": 0}, "query_type": "AND"}',
'{0001,0005,0006}',
251,
'{"l0_name": [{"type": "list", "operator": "in", "values": ["VSL_Victoria Secret"]}], "l2_name": [{"type": "list", "operator": "in", "values": ["3020_BRAS-INTIMATE APPAREL"]}]}',
'{"s1_name": [{"type": "list", "operator": "in", "values": ["CA", "US"]}]}',
'{}');
*/
begin



    _select_columns := coalesce($8->>'select_columns', '');
    _paf_join := coalesce($8->>'paf_join', 'join paf on rcl_hash = md5(rcl_dimension::text)');
	_psaf_join := coalesce($8->>'psaf_join', 'left join global.product_store_attributes_filter psaf on c.psa_code = psaf.psa_code and m.store_code = psaf.store_code');
    _store_group_join := coalesce($8->>'store_group_join', '');
	_select_product_columns := coalesce($8->>'select_product_columns', '');
	_psa_code_column := coalesce($8->>'psa_code_column', ', psa_code');
	_where_psa_code_clause := coalesce($8->>'where_psa_code_clause', 'WHERE psaf.psa_code IS NOT NULL');
	raise notice '_paf_join %', _paf_join;


	_query_meta_filters := regexp_replace(
	    inventory_smart.form_rcl_table_query($3),
	    '\s+LIMIT\s+\d+(\s+OFFSET\s+\d+)?|\s+OFFSET\s+\d+(\s+LIMIT\s+\d+)?',
	    '',
	    'gi'
	);

	raise notice '_query_meta_filters %', _query_meta_filters;

	if _query_meta_filters is null or trim(_query_meta_filters) = '' then
		_query_meta_filters := 'where true';
	end if;

	-- Prefix store attribute columns with (m). for composite type access
	FOR _column_name IN 
		SELECT jsonb_array_elements($3->'search')->>'column'
	LOOP
		IF EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_schema = 'global' 
			AND table_name = 'store_attributes_filter' 
			AND column_name = _column_name
		) THEN
			_query_meta_filters := regexp_replace(
				_query_meta_filters, 
				'\(' || _column_name || '::', 
				'((m).' || _column_name || '::', 
				'g'
			);
		END IF;
	END LOOP;
	
	raise notice 'removed_limit_query_meta_filters %', _query_meta_filters;

	select
		array_agg(rcl_code),
		'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hashes' into _rcl_codes, _hash_cols 
	from global.rcl_master 
	where not is_deleted
	and module_code = '170'
	group by is_deleted;
    
	-- Build rule_code filter for rcl_constraint_master (dynamic based on $2)
	_rule_filter := '';
	if cardinality($2) > 0 then
		_rule_filter := ' WHERE rule_code = any(' || quote_literal($2) || ')';
		raise notice 'rule_code filter added: %', _rule_filter;
	end if;

	-- Build store filter for store_attributes_filter (always use _sa_query, optionally add store_code filter)
	_sa_query := global.form_main_table_filters('store_attributes_filter', $7);
	if cardinality($4) > 0 then
		_sa_query := _sa_query || ' AND store_code = ANY(' || quote_literal($4) || ')';
		raise notice 'store_code filter added to _sa_query';
	end if;
	raise notice '_sa_query: %', _sa_query;

	-- Build product attributes where clause
	_pa_query := global.form_main_table_filters('product_attributes_filter', $6);
	raise notice '_pa_query: %', _pa_query;

	_pa_where := 'join (
					with paf as materialized (
					select rcl_hash '|| _select_product_columns ||' from (
						select unnest(rcl_hashes) as rcl_hash '|| _select_product_columns ||' from (
						select ' || _hash_cols || ' '|| _select_product_columns ||' 
							from global.product_attributes_filter ' || _pa_query || ' and active) x
						) y where rcl_hash is not null group by 1 '|| _select_product_columns ||'
					)
		select rcl_code, rule_code, rule_name, md5(rcl_dimension::text) rcl_hash, rcl_dimension '|| _select_product_columns ||'
		from inventory_smart.rcl_constraint_master_rule
		' || _paf_join || '
		WHERE rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[])
		group by 1,2,3,4,5 '|| _select_product_columns ||'
		) r on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code ';
	raise notice '_pa_where: %', _pa_where;

	-- Build the main query (unified structure)
	_query_part := 'create table public.' || $1 || ' as '
				|| 'with base as ('
				|| '    select c.rcl_code, c.rule_code, c.validity, c.wos, c.dos, c.min_stock, c.max_stock, c.st, psaf.psa_code as psaf_psa_code, r.rule_name, r.rcl_dimension, m as m ' || _select_columns || '  '
				|| '    from (select rcl_code, rule_code '|| _psa_code_column ||', daterange(min(lower(validity)), max(upper(validity))) as validity, max(wos) as wos, max(dos) as dos, max(min_stock) as min_stock, max(max_stock) as max_stock, max(st) as st from inventory_smart.rcl_constraint_master' || _rule_filter || ' group by 1,2 '|| _psa_code_column ||' ) c '
				|| '    cross join (select * from global.store_attributes_filter ' || _sa_query || ' and active and special_classification <> ''WHS'') m '
				||      _pa_where
				|| '    '|| _psaf_join ||' ' -- All Clients
				|| '    '|| _store_group_join || ' ' -- CARTERS
				|| CASE WHEN _where_psa_code_clause IS NULL OR trim(_where_psa_code_clause) = '' THEN ''
					WHEN _where_psa_code_clause LIKE '%;%' OR _where_psa_code_clause LIKE '%--%' OR _where_psa_code_clause LIKE '%/*%' THEN ''
					ELSE '    ' || _where_psa_code_clause || ' ' END || ' ' -- All Clients Except VS
				|| '), exception_data as materialized ('
				|| '    select rule_code, rcl_code, validity, wos, dos, min_stock, max_stock, st, rule_name, rcl_dimension, m ' || _select_columns || ' from base ' || _query_meta_filters || ' and (m).store_code is not null'
				|| ')'
				|| 'select rule_code, rcl_code, (m).* ' || _select_columns || ', validity, wos, dos, min_stock, max_stock, st, rule_name, rcl_dimension, ' || _created_by || ' as createdby, ' || quote_literal(now()) || '::timestamp as createdate, ''''::text as exception_rule_name from exception_data '
				|| 'union select rule_code, rcl_code, (m).* ' || _select_columns || ', daterange(min(lower(validity)), max(upper(validity))) as validity, max(wos) as wos, max(dos) as dos, max(min_stock) as min_stock, max(max_stock) as max_stock, max(st) as st, max(rule_name) as rule_name, max(rcl_dimension::text)::jsonb as rcl_dimension, ' || _created_by || ' as createdby, ' || quote_literal(now()) || '::timestamp as createdate, ''''::text as exception_rule_name from base where (m).store_code is null and (rule_code, (m).store_code) not in (select rule_code, (m).store_code from exception_data) group by rule_code, rcl_code, m ' || _select_columns || ';';
	raise notice 'query_part: %', _query_part;

	execute _query_part;
END
$function$
;