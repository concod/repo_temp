--liquibase formatted sql
--changeset charan.reddy:oms_rule_list_constraint_update_20 runOnChange:true stripComments:false splitStatements:false context:MTP-92753:oms_rule_list_constraint_update9
--comment: intial changeset for oms_rule_list_constraint_update17
--rollback: SELECT 1
DROP FUNCTION IF EXISTS oms.oms_rule_list_constraint_pack(refcursor, jsonb, text[], jsonb);
CREATE OR REPLACE FUNCTION oms.oms_rule_list_constraint_pack(refcursor, jsonb, text[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_where text := '';
_article_column text = '';
_query_meta_filters text;
_hash_cols text;
_rcl_codes integer[];
_pa_query text := '';
/*
 description: inputs $2 = product_filter, $3 = validity, $4 = meta filters.
This function is to list all the active rules on product_mapping_product_store table rules.
Sample call: select * from oms.oms_rule_list_constraint('cur', '{
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
    "l2_name": [],
    "article": [],
    "l1_name": [],
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

    _article_column := '
            r.product_attribute_5,
            r.product_attribute_8,
            r.article,
            r.product_description,
            r.primary_vendor_name,
    ';

    _where := ' join (
        with paf as materialized(
            select * from
                (
                select unnest(rcl_hashes) as rcl_hash_paf, * from
                    (
                    select ' || _hash_cols || ', * from global.product_attributes_filter ' || _pa_query || ' and active and ordering = ''Y''
                    )x 
                ) y where rcl_hash is not null
            )
        select rcl_code, rule_code, rule_name, md5(rcl_dimension::text) rcl_hash, rcl_dimension, paf.*
        from oms.rcl_oms_constraint_master_rule 
        join paf on md5(rcl_dimension::text) = paf.rcl_hash_paf
        where rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[])
        ) r on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code 
    left join oms.oms_constraints_status ocs on ocs.product_code = r.product_code';

    _query_meta_filters := oms.oms_form_rcl_table_query($4);

    _query_part := 'SELECT c.rcl_code,
        c.rule_code,
        r.rule_name,
        r.rcl_dimension,
        CASE
            WHEN r.rcl_dimension ? ''article'' THEN
            EXISTS (
                SELECT 1
                FROM oms.oms_pack_config pc
                WHERE pc.article = r.rcl_dimension ->>''article''
              )
            ELSE FALSE
        END AS pack_exist,
        c.min_replenishment_quantity,
        c.max_replenishment_quantity,
        c.level_of_application,
        c.order_multiple,
        c.moq_tolerance,
        MAX(CASE WHEN r.rcl_dimension ? ''article'' THEN r.product_attribute_5 ELSE NULL END) AS product_attribute_5,
        MAX(CASE WHEN r.rcl_dimension ? ''article'' THEN r.product_attribute_8 ELSE NULL END) AS product_attribute_8,
        MAX(CASE WHEN r.rcl_dimension ? ''article'' THEN r.article ELSE NULL END) AS article,
        MAX(CASE WHEN r.rcl_dimension ? ''article'' THEN r.product_description ELSE NULL END) AS product_description,
        MAX(CASE WHEN r.rcl_dimension ? ''article'' THEN r.primary_vendor_name ELSE NULL END) AS primary_vendor_name,
        c.pack_selection,
        jsonb_agg(jsonb_build_object(
            ''min_replenishment_quantity'', c.min_replenishment_quantity,
            ''max_replenishment_quantity'', c.max_replenishment_quantity,
            ''moq_tolerance'', c.moq_tolerance,
            ''order_multiple'', c.order_multiple,
            ''level_of_application'', c.level_of_application,
            ''pack_selection'',c.pack_selection,
            ''created_at'', c.created_at,
            ''created_by'', u1.name,
            ''updated_by'', u2.name,
            ''updated_at'', coalesce(c.updated_at, c.created_at),
            ''user_code'', u1.user_code,
            ''user'', u1.email,
            ''rcl_oms_constraint_code'', c.rcl_oms_constraint_code
    )) as data FROM "oms".rcl_oms_constraint_master c 
    left join
        global.user_master u1 on u1.user_code =c.created_by
    left join 
        global.user_master u2 on u2.user_code =c.updated_by
     ' || _where || ' 
--    WHERE current_date <= upper(validity) and not c.is_deleted
    GROUP BY c.rcl_code, c.rule_code, r.rule_name, r.rcl_dimension,
    c.min_replenishment_quantity,
    c.max_replenishment_quantity,
    c.level_of_application,
    c.order_multiple,
    c.moq_tolerance,
    c.pack_selection';

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
            from oms.rcl_oms_constraint_master_rule rocmr where 1=2;
    else
        open $1 for execute _query_combine;
    end if;
    return $1;
END
$function$
;
