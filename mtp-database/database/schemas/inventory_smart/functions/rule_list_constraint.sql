--liquibase formatted sql
--changeset linu.nazil:rule_list_constraint_generic runOnChange:true stripComments:false splitStatements:false context:Release_1_9 labels:liquibase_project_start
--comment: initial changeset for rule_list_constraint_generic
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.rule_list_constraint(refcursor, jsonb, text[], jsonb);
DROP FUNCTION IF EXISTS inventory_smart.rule_list_constraint(refcursor, jsonb, text[], jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.rule_list_constraint(refcursor, jsonb, text[], jsonb, additional_data jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_where text := '';
_query_meta_filters text;
_hash_cols text;
_rcl_codes integer[];
_pa_query text := '';
_store_hierarchy_columns text := '';
_key text;
_all_store_hierarchies text := '';
_module_code int;
_additional_select_columns text := '';
_article_key text;
_size_key text;
/*
 description: inputs $2 = product_filter, $3 = validity, $4 = meta filters.
This function is to list all the active rules on product_mapping_product_store table rules.
Sample call: select * from inventory_smart.rule_list_constraint('cur', '{
    "l0_name": [{
            "type": "list",
            "operator": "in",
            "values": [
                "2628_2023 Trim a Tree"
            ]
        }],
    "l1_name": [
        {
            "type": "list",
            "operator": "in",
            "values": [
                "410_HOLIDAY EVENTS"
            ]
        }
    ],
    "color": [],
    "size": [],
    "l4_name": [],
    "article": [],
    "l3_name": [],
    "l2_name": []
}'::jsonb,'{"(11-11-2023, 12-12-2023)"}'::text[], '{"limit":{
"limit":10, "page":1
}}'::jsonb); 

fetch all from "cur";*/

begin
	-- fetch article_key & size_key, default to 'article' & 'size' if not present
	SELECT 
	    COALESCE(attribute_value->'value'->>'article_key', 'article'),
	    COALESCE(attribute_value->'value'->>'size_key', 'size')
	INTO _article_key, _size_key
	FROM global.tenant_attribute_master
	WHERE name = 'hierarchy_key';

	_pa_query := global.form_main_table_filters('product_attributes_filter', $2);
	SELECT module_code::int into _module_code
    FROM global.module_master
    WHERE module_name = 'Rules Constraints';
	select
		array_agg(rcl_code),
		'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hashes' into _rcl_codes, _hash_cols 
	from global.rcl_master 
	where not is_deleted
	and module_code = _module_code
	group by is_deleted;

    _additional_select_columns := coalesce($5->>'select_columns', '');

	FOR _key IN execute 'select  attribute_name from inventory_smart.rcl_master_attribute_list
						 where attribute_name <> ''psa_level'' and attribute_dimension = ''store''' loop
		_all_store_hierarchies := _all_store_hierarchies ||  ',' ||  _key;
    	_store_hierarchy_columns := _store_hierarchy_columns || ', (case when ' || _key || ' is null then ''all'' else ' || _key || ' end )';
    	raise notice '_store_hierarchy_columns: %', _store_hierarchy_columns;
    end loop; 

	raise notice '_pa_query: %', _pa_query;

    _where := ' 
        join (
            with paf as materialized (
	            select
                    rcl_hash 
                    ' || _additional_select_columns || '
                from (
	                select 
                        unnest(rcl_hashes) as rcl_hash 
                        ' || _additional_select_columns || '
                    from (
                        select 
                        ' || _hash_cols || '
                        ' || _additional_select_columns || '
                        from global.product_attributes_filter ' || _pa_query || ' and active ) x 
                    ) y where rcl_hash is not null group by 1 ' || _additional_select_columns || '
                )
	        select 
                rcl_code, 
	            rule_code, 
			    rule_name,
			    store_hierarchy_level,
	            md5(rcl_dimension::text) rcl_hash, 
	            rcl_dimension 
                ' || _additional_select_columns || '
	        from inventory_smart.rcl_constraint_master_rule
            join paf on rcl_hash = md5(rcl_dimension::text)
	        WHERE  rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[])
            GROUP BY 1,2,3,4,5,6 ' || _additional_select_columns || '
	    ) r on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code ';

    _query_meta_filters := inventory_smart.form_rcl_table_query($4);

    _query_part := 'SELECT c.rcl_code,
	    c.rule_code,
        r.rule_name,
		c.psa_code,
		r.rcl_dimension,
        CASE 
            WHEN (r.rcl_dimension ? ' || quote_literal(_article_key) || ') 
                 AND NOT (r.rcl_dimension ? ' || quote_literal(_size_key) || ')
            THEN TRUE
            ELSE FALSE
        END AS is_article_level,
		r.store_hierarchy_level
        ' || _additional_select_columns || '
		' || _store_hierarchy_columns || ',
        jsonb_agg(jsonb_build_object(
            ''wos'', c.wos,
            ''dos'', c.dos,
            ''st'', c.st,
            ''min_stock'', c.min_stock,
            ''min_distribution'', c.min_distribution,
            ''max_stock'', c.max_stock,
            ''start_date'', lower(validity),
            ''end_date'', (upper(validity)-1),
            ''created_at'', c.created_at,
            ''created_by'', c.created_by,
            ''updated_by'', coalesce(c.updated_by, c.created_by),
            ''updated_at'', coalesce(c.updated_at, c.created_at),
            ''user_code'', u.user_code,
            ''user'', u.user_name,
            ''rcl_constraint_code'', c.rcl_constraint_code
    )) as data FROM "inventory_smart".rcl_constraint_master c 
	join inventory_smart.rcl_psa_config_table psaf on c.psa_code = psaf.psa_code
	left join global.user_master u on u.user_code = coalesce(c.updated_by, c.created_by)
    ' || _where || ' and current_date < upper(c.validity) 
    GROUP BY c.rcl_code, c.rule_code, r.rule_name, c.psa_code, r.rcl_dimension, r.store_hierarchy_level ' || _all_store_hierarchies || ' ' || _additional_select_columns || ' ';

    _query_combine := '

   select A.*
   from         
   (SELECT
                p.*, rm.is_default
            FROM
                (' || _query_part || ') p
            JOIN global.rcl_master rm
            USING (rcl_code)
            WHERE NOT rm.is_deleted ORDER BY rm.priority DESC)as A
            ' || _query_meta_filters;
	raise notice 'query_combine: %', _query_combine;
     open $1 for execute _query_combine;
	return $1;

END
$function$
;