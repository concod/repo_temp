--liquibase formatted sql
--changeset linu.nazil:rcl_create_constraints runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_create_constraints
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.rcl_create_constraints(text, jsonb, int4);
DROP FUNCTION IF EXISTS inventory_smart.rcl_create_constraints(text, jsonb, int4, varchar);
DROP FUNCTION IF EXISTS inventory_smart.rcl_create_constraints(_temp_tbl_name text, _product_filters jsonb, _created_by integer, _psaf_config_level character varying, _store_filters jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.rcl_create_constraints(_temp_tbl_name text, _product_filters jsonb, _created_by integer, _psaf_config_level character varying, _store_filters jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_rule_filter text;
_index_query text;
_product_filter text;
_hierarchy text;
_key text;
_value text;
_keys text[];
_jsonb_arr text[];
_jsonb_body text;
_agg_hierarchy varchar[] := '{}';
_unnest_hierarchy varchar[] := '{}';
_agg_hierarchy_str text;
_unnest_hierarchy_str text;
_store_hierarchy_level varchar[];
_sql text := ' SELECT * FROM ';
_concat text;
_sub_psa_query text;
_jsonb_store_arr text[];
_jsonb_store_body text;
_all_store_hierarchies text := '';
/*select
	*
from
	inventory_smart.rcl_create_constraints('temp_rcl_constraints_3405d006',
	'{"l0_name": [{"type": "list", "operator": "in", "values": ["USA"]}], "l1_name": [{"type": "list", "operator": "in", "values": ["Brick __ia_char_13 Mortar"]}]}',
	1,'l0_name, l1_name',
	'{"region": [{"type": "list", "operator": "in", "values": ["West","East"]}],"psa_name": [{"type": "list", "operator": "in", "values": ["A","B"]}]}');
*/
BEGIN
	--product hierarchy generation
    foreach _hierarchy in array string_to_array(_psaf_config_level, ',') loop
		_agg_hierarchy := array_append(_agg_hierarchy, ' ARRAY_AGG(DISTINCT ' || _hierarchy || ')::varchar[] AS ' || _hierarchy || 's ');
		_unnest_hierarchy := array_append(_unnest_hierarchy, ' CROSS JOIN UNNEST(ad.' || _hierarchy || 's) AS ' || _hierarchy );
	end loop;
	_agg_hierarchy_str := array_to_string(_agg_hierarchy, ',');
	_unnest_hierarchy_str := array_to_string(_unnest_hierarchy, ' ');

    _product_filter := global.form_rcl_product_validity_filter($2, '{}');
    _product_filter := replace(REPLACE(_product_filter, '(rcl_dimension->>''', ''), ''')', '');
    for _key, _value in select * from jsonb_each_text($2) loop

	    	raise notice 'value2: %', _value;
    		_keys := array_append(_keys, _key);

    end loop;
    FOREACH _key IN ARRAY _keys loop
    	_jsonb_arr := array_append(_jsonb_arr, ''|| '''' || _key || '''' || ', ' || _key ||'');
    raise notice 'jsonb_arr: %', _jsonb_arr;
    end loop;
    _jsonb_body := array_to_string(_jsonb_arr, ', ');
    raise notice 'jsonb_body: %', _jsonb_body;

	--store hierarchy generation
	if _store_filters = '{}' or _store_filters is null then
		_sub_psa_query := '(select ''all'' as sub_psa_code)c';
	else
		_store_hierarchy_level := array_agg(attribute_name order by order_of_display )
									from
										(
									select
										jsonb_object_keys(_store_filters) as attribute_name) as attribute_name
								join 
									inventory_smart.rcl_master_attribute_list using(attribute_name)
                                    where attribute_dimension = 'store';
	_concat := string_agg(val, ',''_'',') from (select unnest(_store_hierarchy_level::varchar[]) as val)t;
				
    -- Build dynamic SQL to cross join all arrays
    FOR i IN 1 .. array_length(_store_hierarchy_level, 1) LOOP
        _sql := _sql || '(SELECT jsonb_array_elements_text( ( ' || quote_literal(_store_filters) || '::jsonb->' ||
                      quote_literal(_store_hierarchy_level[i]) || '->0->''values'' ) ) AS ' || (_store_hierarchy_level[i]) || ') t' || i;
        IF i < array_length(_store_hierarchy_level, 1) THEN
            _sql := _sql || ' CROSS JOIN ';
        END IF;
    END LOOP;
	raise notice 'query: %', _sql; 
	_sub_psa_query := '(select concat(' || _concat || ') as sub_psa_code
							from(' || _sql || ')b
						)c';
	end if;

	FOR _key IN execute 'select  attribute_name from inventory_smart.rcl_master_attribute_list
						 where attribute_name <> ''psa_level''
                         and attribute_dimension = ''store''
						 order by order_of_display' loop
		_all_store_hierarchies := _all_store_hierarchies ||  ',' ||  _key;
    	_jsonb_store_arr := array_append(_jsonb_store_arr, ''|| '''' || _key || '''' || ', (case when ' || _key || ' is null then ''all'' else ' || _key || ' end )');
    	raise notice '_jsonb_store_arr: %', _jsonb_store_arr;
    end loop; 
	_jsonb_store_body := array_to_string(_jsonb_store_arr, ', '); --to populate values in the store hierarchy columns--will be handled from the backend.

    _query_part := 'create table public.' || $1 || ' as
					WITH aggregated_data AS (
					    SELECT 
					        jsonb_build_object(' || _jsonb_body || ') AS rcl_dimension,
					        NULL::int4 AS rcl_code,
					        ''''::varchar AS rule_name,
					        NULL::float AS wos,
							NULL::float AS dos,
					        NULL::float AS min_stock,
							NULL::varchar AS min_distribution,
					        NULL::float AS max_stock,
							NULL::float AS st,
					        NULL::daterange AS validity,
							' || quote_literal(coalesce(array_to_string(_store_hierarchy_level, ','),  'all')) || '::varchar AS store_hierarchy_level,
					        ' || _created_by || '::int4 AS created_by,
					        ' || quote_literal(now()) || '::timestamp AS created_at,
					        ' || _agg_hierarchy_str || ',
					        nextval(''inventory_smart.rcl_constraint_master_rule_rule_code_seq'') as rule_code
					    FROM global.product_attributes_filter paf
						' || _product_filter || '
					    GROUP BY 1
					),
					store_aggregated_data as (
						select ad.*, sub_psa_code from aggregated_data ad
						cross join ' || _sub_psa_query || '
					)
					 SELECT 
					    psaf.psa_code, 
					    ad.rcl_dimension, 
						jsonb_build_object(' || _jsonb_store_body || ') AS store_dimension,
					    ad.rcl_code, 
					    ad.rule_name,
					    ad.wos, 
						ad.dos,
					    ad.min_stock,
						ad.min_distribution, 
					    ad.max_stock, 
						ad.st,
					    ad.validity, 
					    ad.created_by, 
					    ad.created_at, 
					    ad.rule_code,
						ad.store_hierarchy_level
						' || _all_store_hierarchies || '
					FROM store_aggregated_data ad
					' || _unnest_hierarchy_str || '
					JOIN inventory_smart.rcl_psa_config_table psaf USING (' || _psaf_config_level || ', sub_psa_code)
					GROUP BY 
					    psaf.psa_code, 
					    ad.rcl_dimension, 
					    ad.rcl_code, 
					    ad.rule_name,
					    ad.wos, 
						ad.dos,
					    ad.min_stock,
						ad.min_distribution, 
					    ad.max_stock, 
						ad.st,
					    ad.validity,
					    ad.created_by, 
					    ad.created_at, 
					    ad.rule_code,
						ad.store_hierarchy_level
						' || _all_store_hierarchies || ';';
	   	raise notice '_query_part: %', _query_part;
	   EXECUTE _query_part;
END;
$function$
;