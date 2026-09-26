--liquibase formatted sql
--changeset tarunreddy.challa:oms_rule_list_constraint_update5 runOnChange:true stripComments:false splitStatements:false context:intial labels:oms_rule_list_constraint_update5
--comment: intial changeset for oms_rule_list_constraint_update5
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.oms_rule_list_constraint(refcursor, jsonb, text[], jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.oms_rule_list_constraint(refcursor, jsonb, text[], jsonb)
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
/*
 description: inputs $2 = product_filter, $3 = validity, $4 = meta filters.
This function is to list all the active rules on product_mapping_product_store table rules.
Sample call: select * from inventory_smart.oms_rule_list_constraint('cur', '{
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
    
    _pa_query := global.form_main_table_filters('product_attributes_filter', $2);
    select
        array_agg(rcl_code),
        'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hashes' into _rcl_codes, _hash_cols 
    from global.rcl_master 
    where not is_deleted
    and module_code = '7001'
    group by is_deleted;

    raise notice '_pa_query: %', _pa_query;

    _where := ' join (
        with paf as materialized(select rcl_hash from
                                    (
                                    select unnest(rcl_hashes) as rcl_hash from
                                        (
                                        select ' || _hash_cols || ' from global.product_attributes_filter ' || _pa_query || ' and active 
                                        )x 
                                    ) y where rcl_hash is not null group by 1
                                )
	        select rcl_code, rule_code, rule_name,md5(rcl_dimension::text) rcl_hash, rcl_dimension from inventory_smart.rcl_oms_constraint_master_rule where rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[]) and md5(rcl_dimension::text) 
                in (
                    select rcl_hash from paf
                    )
                    group by 1,2,3,4,5
                ) r on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code ';

    _query_meta_filters := inventory_smart.form_rcl_table_query($4);

    _query_part := 'SELECT c.rcl_code,
        c.rule_code,
        r.rule_name,
        r.rcl_dimension,
        c.min_replenishment_quantity,
        c.max_replenishment_quantity,
        c.level_of_application,
        c.order_multiple,
        c.moq_tolerance,
        jsonb_agg(jsonb_build_object(
            ''min_replenishment_quantity'', c.min_replenishment_quantity,
            ''max_replenishment_quantity'', c.max_replenishment_quantity,
            ''moq_tolerance'', c.moq_tolerance,
			''order_multiple'', c.order_multiple,
			''level_of_application'', c.level_of_application,
            ''created_at'', c.created_at,
            ''created_by'', u1.name,
            ''updated_by'', u1.name,
            ''updated_at'', coalesce(c.updated_at, c.created_at),
            ''user_code'', u1.user_code,
            ''user'', u1.email,
            ''rcl_oms_constraint_code'', c.rcl_oms_constraint_code
    )) as data FROM "inventory_smart".rcl_oms_constraint_master c 
    left join
        global.user_master u1 on u1.user_code =c.created_by
    left join 
        global.user_master u2 on u2.user_code =c.updated_by
     ' || _where || ' 
--    WHERE current_date <= upper(validity) and not c.is_deleted
    GROUP BY c.rcl_code, c.rule_code, r.rule_name, r.rcl_dimension, c.min_replenishment_quantity, c.max_replenishment_quantity, c.level_of_application, c.order_multiple, c.moq_tolerance';

    _query_combine := '

   select A.*
   from         
   (SELECT
                p.*, rm.is_default
            FROM
                (' || _query_part || ') p
            JOIN global.rcl_master rm
            USING (rcl_code)
            WHERE NOT rm.is_deleted)as A
            ' || _query_meta_filters;
    raise notice 'query_combine: %', _query_combine;
    if _query_combine is null then
        open $1 for select rcl_code, 
            rule_code, 
            rule_name, 
            rcl_dimension, 
            null::jsonb as data
            from inventory_smart.rcl_oms_constraint_master_rule rocmr where 1=2;
    else
        open $1 for execute _query_combine;
    end if;
    return $1;
END
$function$
;
