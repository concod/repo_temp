--liquibase formatted sql
--changeset linu.nazil:rcl_create_add_constraints runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_create_add_constraints
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.rcl_create_add_constraints(text, jsonb, int4, int4);
DROP FUNCTION IF EXISTS inventory_smart.rcl_create_add_constraints(text, jsonb, int4, int4, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.rcl_create_add_constraints(_temp_tbl_name text, _product_filters jsonb, _created_by integer, _rcl_code integer, _psaf_hierarchy_level varchar)
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
/*select * from inventory_smart.rcl_create_constraints('_temp_tbl_name', '{
    "l0_name": [{
            "type": "list",
            "operator": "in",
            "values": [
                "2260_2021 NCSA Canning",
				"2263_2021 NCSA Stationary Gift Set"
            ]
        }],
    "l1_name": [
        {
            "type": "list",
            "operator": "in",
            "values": [
                "200_HOUSEWARE",
				"140_STATIONERY"
            ]
        }
    ],
    "l4_name": [],
    "article": [],
    "l3_name": [],
    "l2_name": []
}'::jsonb, 3); 
*/
BEGIN
	foreach _hierarchy in array string_to_array(_psaf_hierarchy_level, ',') loop
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
    _query_part := 'create table public.' || $1 || ' as
WITH aggregated_data AS (
    SELECT 
        jsonb_build_object(' || _jsonb_body || ') AS rcl_dimension,
        NULL::int4 AS rcl_code,
        NULL::float AS wos,
        NULL::float AS min_stock,
        NULL::float AS max_stock,
        NULL::daterange AS validity,
        ' || _created_by || '::int4 AS created_by,
        ' || quote_literal(now()) || '::timestamp AS created_at,
        ' || _agg_hierarchy_str || ',
        nextval(''inventory_smart.rcl_constraint_master_rule_rule_code_seq'') as rule_code
    FROM global.product_attributes_filter paf
    ' || _product_filter || '
    GROUP BY 1
),
constraints_cte as (select
	rcl_dimension,
	psa_code,
	rule_code,
	rule_name
from
	inventory_smart.rcl_constraint_master_rule rcmr
join inventory_smart.rcl_constraint_master rcm
		using (rcl_code, rule_code)
		where not is_deleted and upper(rcm.validity) > current_date)
select psa_code,psa_name,rcl_dimension,rcl_code,wos,min_stock,max_stock,validity,created_by,created_at,case when existing_rule_psa is null and existing_rule is not null then existing_rule_code else rule_code end as rule_code,existing_rule_psa,rule_name,existing_rule,existing_rule_code
 from(SELECT
    x.*,
    rcmr.rcl_dimension AS existing_rule_psa,
    rcmr.rule_name AS rule_name,
    rcmr2.rcl_dimension as existing_rule,
    rcmr2.rule_code as existing_rule_code
FROM
    (SELECT 
    psaf.psa_code, 
    psaf.psa_name, 
    ad.rcl_dimension, 
    ad.rcl_code, 
    ad.wos, 
    ad.min_stock, 
    ad.max_stock, 
    ad.validity, 
    ad.created_by, 
    ad.created_at, 
    ad.rule_code
FROM aggregated_data ad
' || _unnest_hierarchy_str || '
JOIN global.product_store_attributes_filter psaf USING (' || _psaf_hierarchy_level || ')
GROUP BY 
    psaf.psa_code, 
    psaf.psa_name, 
    ad.rcl_dimension, 
    ad.rcl_code, 
    ad.wos, 
    ad.min_stock, 
    ad.max_stock, 
    ad.validity, 
    ad.created_by, 
    ad.created_at, 
    ad.rule_code)x
left join constraints_cte rcmr2 on
x.rcl_dimension = rcmr2.rcl_dimension 
left join constraints_cte rcmr on
x.rcl_dimension = rcmr.rcl_dimension 
and rcmr.psa_code = x.psa_code) y
where existing_rule_psa is null
group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15
;';
   	raise notice '_query_part: %', _query_part;
   EXECUTE _query_part;
END
$function$
;