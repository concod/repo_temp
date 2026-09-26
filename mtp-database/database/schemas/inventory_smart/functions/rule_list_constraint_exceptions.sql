--liquibase formatted sql
--changeset shashwat.yadav:rule_list_constraint_exceptions_generic runOnChange:true stripComments:false splitStatements:false context:Release_1_16 labels:liquibase_project_start
--comment: initial changeset for rule_list_constraint_exceptions_generic
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.rule_list_constraint_exceptions(refcursor, jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.rule_list_constraint_exceptions(refcursor, jsonb, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_where text := '';
_query_final text := '';
_query_meta_filters text;
_query_sa text;
_query_pa text;
_dimension text[];
_hash_cols text;
_rcl_codes integer[];
_select_product_columns text;
_select_columns text;
_store_columns text;
_psaf_join text;
_store_group_join text;

/*
sample call: 
select * from inventory_smart.generic_rule_list_constraint_exceptions('fb232835-2636-4ea9-ad71-5d82593e93a2',
'{}',
'{"search": [{"column": "store_attribute", "type": "str", "search_type": "contains", "pattern": "DGP21"}], "sort": [], "range": [], "limit": {"limit": 10, "page": 1, "offset": 0, "sub_offset": 0}, "query_type": "AND"}',
'{"l0_name": [{"type": "list", "operator": "in", "values": ["2884_2024 Gift Sets"]}], "l1_name": [{"type": "list", "operator": "in", "values": ["102_BEAUTY CARE"]}], "l3_name": [{"type": "list", "operator": "in", "values": ["1068_GIFT SETS"]}], "l4_name": [{"type": "list", "operator": "in", "values": ["10067_GIFT SETS", "11020_ADULT LIP", "11021_ADULT NAIL", "11022_FACE COSMETICS", "11023_FACE MASK", "11024_WOMENS FRAGRANCE", "11025_MENS BATH", "11026_MENS FRAGRANCE", "11027_WOMENS BATH", "11029_YOUTH LIP", "11030_YOUTH NAIL", "11031_YOUTH BATH"]}]}',
'{"select_product_columns": ", set_date, l0_name, l1_name, l3_name, l4_name", "select_columns": ", psaf.store_group_description, set_date", "store_columns": ", store_attribute", "psaf_join": "", "store_group_join": "JOIN (SELECT DISTINCT store_group_description, l0_name, l1_name, l3_name, l4_name, store_code from global.product_store_attributes_filter) psaf USING (l0_name, l1_name, l3_name, l4_name, store_code)"}'
);
fetch all from "fb232835-2636-4ea9-ad71-5d82593e93a2";
*/
begin
    _query_meta_filters := inventory_smart.form_rcl_table_query($3);
   	_query_sa := global.form_main_table_filters('store_attributes_filter', $2);
   	_query_pa := global.form_main_table_filters('product_attributes_filter', $4);

	_select_product_columns :=  coalesce($5->>'select_product_columns', '');
    _select_columns := coalesce($5->>'select_columns', '');
    _store_columns := coalesce($5->>'store_columns', '');
    _psaf_join := coalesce($5->>'psaf_join', '');
    _store_group_join := coalesce($5->>'store_group_join', '');

	select
		array_agg(rcl_code),
		'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hashes' into _rcl_codes, _hash_cols 
	from global.rcl_master 
	where not is_deleted
	and module_code = '170'
	group by is_deleted;

	raise notice '_query_pa: %', _query_pa;

	_where := 'join (
				with paf as materialized(
				select rcl_hash '|| _select_product_columns ||' from (
					select unnest(rcl_hashes) as rcl_hash '|| _select_product_columns ||' from (
					select ' || _hash_cols || ' '|| _select_product_columns ||' from global.product_attributes_filter ' || _query_pa || ' and active
					)x 
				) y 
				where rcl_hash is not null 
				group by 1 '|| _select_product_columns ||'
			)
		select rcl_code, rule_code, rule_name, md5(rcl_dimension::text) rcl_hash, rcl_dimension '|| _select_product_columns ||'
		FROM inventory_smart.rcl_constraint_master_rule
		JOIN paf on md5(rcl_dimension::text) = paf.rcl_hash
		WHERE rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[])
		GROUP BY 1,2,3,4,5 '|| _select_product_columns ||'
		) r on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code ';

    _query_part := 'SELECT 
					c.rcl_code,
					c.rule_code,
					r.rule_name,
					c.exception_rule_name,
					r.rcl_dimension,
					c.store_code
					'|| _select_product_columns ||',
				    jsonb_agg(jsonb_build_object(
				        ''wos'', c.wos,
                        ''dos'', c.dos,
						''st'', c.st,
				        ''min_stock'', c.min_stock,
				        ''max_stock'', c.max_stock,
				        ''start_date'', lower(validity),
						''end_date'', (upper(validity)-1),
						''created_at'', c.created_at,
						''created_by'', c.created_by,
						''updated_at'', coalesce(c.updated_at, c.created_at),
						''updated_by'', coalesce(c.updated_by, c.created_by),
						''user_code'', u.user_code,
						''user'', u.user_name
				    )) as data FROM "inventory_smart".rcl_constraint_master_exceptions c
					left join global.user_master u on u.user_code = coalesce(c.updated_by, c.created_by)
                    ' || _where || ' and current_date < upper(c.validity) 
                    and exists (select
                                        1
                                    from
                                        inventory_smart.rcl_constraint_master rcm
                                    where
                                        rcm.rcl_code = c.rcl_code
                                        and rcm.rule_code = c.rule_code
                                        and current_date < upper(rcm.validity))
                    GROUP BY c.rcl_code, c.rule_code, r.rule_name, c.exception_rule_name, c.store_code, r.rcl_dimension '|| _select_product_columns ||'';

    _query_combine := '
   		SELECT 
			a.* 
		FROM (
			SELECT rcl_code, rule_code, rule_name, exception_rule_name, rcl_dimension, data, s.*, rm.is_default '|| _select_columns ||' FROM (' || _query_part || ') p
			JOIN (
				select store_code '|| _store_columns ||' from global.store_attributes_filter 
				' || case when nullif(_query_sa, '') is null then ' where ' else _query_sa || ' and ' end || 'active
				) s USING(store_code)
            ' || _psaf_join || '
			JOIN global.rcl_master rm USING(rcl_code)
			' || _store_group_join || '
            WHERE NOT rm.is_deleted
			) a ' || _query_meta_filters ;
	raise notice 'query_combine: %', _query_combine;
    open $1 for execute _query_combine;
	return $1;
end
$function$
;