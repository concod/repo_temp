--liquibase formatted sql
--changeset shashwat.yadav:rcl_network_rule_list runOnChange:true stripComments:false splitStatements:false context:MTP-74818 labels:MTP-74818
--comment: MTP-74818 Used to list all rcl network rules
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.rcl_network_rule_list(refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.rcl_network_rule_list(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
_query_part text:='';
_query_combine text:='';
_where text := '';
_query_meta_filters text:='';
_hash_cols text;
_rcl_codes integer[];
_pa_query text := '';
_network_name text;
_network_id int;
_l0_name text[];


v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin   
    _pa_query := global.form_main_table_filters('product_attributes_filter', $2);
    raise notice '_pa_query: %', _pa_query;

    select
        array_agg(rcl_code),
        'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hash' into _rcl_codes, _hash_cols 
    from global.rcl_master 
    where not is_deleted
    and module_code = '71'
    group by is_deleted;

    _where := 'join (
    select rcl_code, rule_code, rule_name, md5(r.rcl_dimension::text) rcl_hash, rcl_dimension from inventory_smart.rcl_network_rule r join (
        select ' || _hash_cols || ' from global.product_attributes_filter ' || _pa_query || ' and active group by 1
    ) paf on md5(r.rcl_dimension::text) = any(rcl_hash)
    and r.rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[])
    group by 1,2,3,4
    ) r ON r.rcl_code = c.rcl_code and r.rule_code = c.rule_code';
    raise notice '_where: %', _where;

    _query_meta_filters := inventory_smart.form_rcl_table_query($3);
    raise notice 'before _query_meta_filters: %', _query_meta_filters;

    SELECT replace(replace(value::json->>'values', '[', '{'), ']', '}')
    INTO _l0_name
    FROM jsonb_array_elements($2->'l0_name') AS elem
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
            r.rule_name as rule_name,
            r.rcl_dimension,
            ' || quote_literal(_network_name) || ' as supply_network_name,
            ' || _network_id || ' as supply_network_id,
            jsonb_agg(jsonb_build_object(
                ''start_date'', lower(c.validity),
                ''end_date'', upper(c.validity),
                ''created_at'', c.created_at,
                ''updated_at'', c.updated_at,
                ''updated_by'', c.updated_by,
                ''created_by'', c.created_by,
                ''user_code'', u.user_code,
                ''user'', u.email,
                ''supply_network_name'', CASE 
                    WHEN sn.network_id IS NOT NULL AND sn.active 
                    THEN sn.network_name 
                    ELSE ' || quote_literal(_network_name) || '
                END,
                ''supply_network_id'', CASE WHEN sn.network_id IS NOT NULL THEN sn.network_id ELSE  ' || _network_id || ' END
            )) as store_details 
        FROM 
            inventory_smart.rcl_network_master c
            LEFT JOIN global.user_master u on u.user_code = coalesce(c.updated_by, c.created_by)
            LEFT JOIN inventory_smart.supply_network sn ON sn.network_id = c.supply_network

            ' || _where || ' 

		WHERE current_date <= upper(c.validity)
        GROUP BY c.rule_code, c.rcl_code, r.rcl_dimension, r.rule_name';

    _query_combine := '
    select A.*
    from         
    (
        SELECT 
            p.*, rm.is_default
        FROM
            (' || _query_part || ') p
            JOIN global.rcl_master rm ON p.c_rcl_code = rm.rcl_code
        WHERE NOT rm.is_deleted ORDER BY rm.is_default desc) as A ' || _query_meta_filters ;

    raise notice 'query_combine: %', _query_combine;
    open $1 for execute _query_combine;
	 perform  global.sp_log(v_gen_random_uuid,'inventory_smart.rcl_network_rule_list', 'Before Return',_query_combine,jsonb_build_object('$2', $2,'$3' , $3));
    return $1;

END;
$function$
;
