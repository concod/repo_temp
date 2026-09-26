--liquibase formatted sql
--changeset shashwat.yadav:rcl_create_network_creation runOnChange:true stripComments:false splitStatements:false context:MTP-74818 labels:MTP-74818
--comment: MTP-74818 Used to create rcl network creation
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.rcl_create_network_creation(refcursor,text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.rcl_create_network_creation(refcursor, _temp_tbl_name text, _product_filters jsonb, _meta_filters jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_product_filter text;
_key text;
_value text;
_keys text[];
_jsonb_arr text[];
_network_name text;
_network_id int;
_jsonb_body text;
_query_meta_filters text;
_l0_name text[];
v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN

    _query_meta_filters := inventory_smart.form_rcl_table_query($4);
    RAISE NOTICE 'before _query_meta_filters: %', _query_meta_filters;

    SELECT replace(replace(value::json->>'values', '[', '{'), ']', '}')
    INTO _l0_name
    FROM jsonb_array_elements($3->'l0_name') AS elem
    WHERE (elem->>'type')::text = 'list' AND (elem->>'operator')::text = 'in';
    RAISE NOTICE '_l0_name: %', _l0_name;

    SELECT 
        COALESCE(nm.network_name, dn.network_name) as network_name,
        COALESCE(nm.network_id, dn.network_id) as network_id
    INTO _network_name, _network_id
    FROM (
        SELECT network_name, network_id
        FROM inventory_smart.supply_network 
        WHERE network_name = any(_l0_name)
    ) nm
    RIGHT JOIN (
        SELECT network_name, network_id
        FROM inventory_smart.supply_network 
        WHERE upper(network_name) = 'DEFAULT NETWORK'
    ) dn ON FALSE;

    RAISE NOTICE '_network_name: %, _network_id: %', _network_name, _network_id;

    _query_part := '
        SELECT 
            c.rule_code as c_rule_code,
            c.rcl_code as c_rcl_code,
            c.rule_name as rule_name,
            c.rcl_dimension,
            ' || quote_literal(_network_name) || ' as supply_network,
            ' || _network_id || ' as network_id,
            jsonb_agg(jsonb_build_object(
                ''start_date'', lower(c.validity),
                ''end_date'', upper(c.validity),
                ''created_at'', c.created_at,
                ''created_by'', c.created_by,
                ''user_code'', u.user_code,
                ''user'', u.email,
                ''supply_network_name'', CASE 
                    WHEN sn.network_name IS NOT NULL AND sn.active
                    THEN sn.network_name 
                    ELSE ' || quote_literal(_network_name) || '
                END,
                ''supply_network_id'', CASE WHEN sn.network_id IS NOT NULL THEN sn.network_id ELSE  ' || _network_id || ' END
            )) as store_details 
        FROM  "public".' || _temp_tbl_name || ' c
            LEFT JOIN global.user_master u on u.user_code = c.created_by
            LEFT JOIN inventory_smart.supply_network sn ON sn.network_id = c.supply_network
        group by c.rule_code, c.rcl_code, c.rcl_dimension, c.rule_name
		order by c_rule_code asc 
        ' || _query_meta_filters ;


    raise notice '_query_part: %', _query_part;
    open $1 for execute _query_part;
	return $1;
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.rcl_create_network_creation', 'Before returning function value',_query_part,jsonb_build_object('_temp_tbl_name',$1,'_meta_filters',$2)) ;		
	   
END
$function$
;