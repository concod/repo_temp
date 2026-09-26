--liquibase formatted sql
--changeset karthikeswar.saravanan:rule_list_constraint runOnChange:true stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for rule_list_constraint
--rollback: SELECT 1
drop function if exists inventory_smart.rule_list_constraint(refcursor, jsonb, text[], jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.rule_list_constraint(refcursor, jsonb, text[], jsonb)
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

	_pa_query := global.form_main_table_filters('product_attributes_filter', $2);
	select
		array_agg(rcl_code),
		'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hashes' into _rcl_codes, _hash_cols
	from global.rcl_master
	where not is_deleted
	and module_code = '170'
	group by is_deleted;

	raise notice '_pa_query: %', _pa_query;

    _where := ' join (
		with paf as materialized(
	 select rcl_hash from (
	           select unnest(rcl_hashes) as rcl_hash from (select ' || _hash_cols || ' from global.product_attributes_filter ' || _pa_query || ' and active
	)x ) y where rcl_hash is not null group by 1)
	select
	          	rcl_code,
	          rule_code,
			rule_name,
	          md5(rcl_dimension::text) rcl_hash
	          ,
	          rcl_dimension
	          from inventory_smart.rcl_constraint_master_rule
	    WHERE  rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[])
	          	and exists (
                            select 1 from paf where rcl_hash = md5(rcl_dimension::text)
                            )
	          	group by 1,2,3,4,5
	) r on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code ';

    _query_meta_filters := inventory_smart.form_rcl_table_query($4);

    _query_part := 'SELECT c.rcl_code,
	    c.rule_code,
        r.rule_name,
		c.psa_name,
		c.psa_code,
		r.rcl_dimension,
        jsonb_agg(jsonb_build_object(
            ''wos'', c.wos,
            ''dos'', c.dos,
            ''min_stock'', c.min_stock,
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
	left join global.user_master u on u.user_code = coalesce(c.updated_by, c.created_by)
 ' || _where || ' and current_date < upper(c.validity) GROUP BY c.rcl_code, c.rule_code, r.rule_name, c.psa_name, c.psa_code, r.rcl_dimension ';

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
     open $1 for execute _query_combine;
	return $1;

END
$function$
;