--liquibase formatted sql
--changeset aman.pareek:oms_rcl_create_constraints3 runOnChange:true stripComments:false splitStatements:false context:MTP-97327:oms_rcl_create_constraints
--comment: pack selection added
--rollback: SELECT 1
DROP FUNCTION IF EXISTS oms.oms_rcl_create_constraints(_temp_tbl_name text, _product_filters jsonb, _created_by integer);
CREATE OR REPLACE FUNCTION oms.oms_rcl_create_constraints(_temp_tbl_name text, _product_filters jsonb, _created_by integer)
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
/*select * from oms.rcl_create_constraints('_temp_tbl_name', '{
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
}'::jsonb, 3, 'applicable_all'); 
*/
BEGIN
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
    _jsonb_body := _jsonb_body || ', ''style_color_desc'', paf.style_color_desc';
    raise notice 'jsonb_body: %', _jsonb_body;
    _query_part := 'create table public.' || $1 || ' as
WITH aggregated_data AS (
    SELECT 
        jsonb_build_object(' || _jsonb_body || ') AS rcl_dimension,
        NULL::int4 AS rcl_code,
        NULL::float AS min_replenishment_quantity,
        NULL::float AS max_replenishment_quantity,
        NULL::int AS order_multiple,
		NULL::float4 AS moq_tolerance,
		NULL::varchar AS pack_selection,
        NULL::varchar as level_of_application,
        NULL::varchar AS rule_name,
        ' || _created_by || '::int4 AS created_by,
        ' || quote_literal(now()) || '::timestamp AS created_at,
        ARRAY_AGG(DISTINCT l0_name)::varchar[] AS l0_names,
        ARRAY_AGG(DISTINCT l1_name)::varchar[] AS l1_names,
        nextval(''oms.rcl_oms_constraint_master_rule_rule_code_seq'') as rule_code
    FROM global.product_attributes_filter paf
    ' || _product_filter || '
    GROUP BY 1
)
 SELECT 
    ad.rcl_dimension, 
    ad.rcl_code, 
    ad.min_replenishment_quantity,
	ad.max_replenishment_quantity,
	ad.order_multiple,
	ad.moq_tolerance,
	ad.pack_selection,
    ad.created_by, 
    ad.created_at, 
    ad.rule_code,
    ad.level_of_application,
    ad.rule_name
FROM aggregated_data ad
CROSS JOIN UNNEST(ad.l0_names) AS l0_name
CROSS JOIN UNNEST(ad.l1_names) AS l1_name
GROUP BY  
    ad.rcl_dimension, 
    ad.rcl_code,
    ad.min_replenishment_quantity,
	ad.max_replenishment_quantity,
	ad.order_multiple,
	ad.moq_tolerance,
	ad.pack_selection,
    ad.created_by, 
    ad.created_at, 
    ad.rule_code,
    ad.level_of_application,
    ad.rule_name;';
    raise notice '_query_part: %', _query_part;
   EXECUTE _query_part;
END
$function$
;
