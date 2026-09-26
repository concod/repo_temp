--liquibase formatted sql
--changeset liquibase:rule_list_product_only runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for rule_list_product_only
--rollback: SELECT 1
drop function if exists global.rule_list_product_only_constraint(refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION global.rule_list_product_only_constraint(refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_final varchar;
_query_meta_filters text;
_pa_query text := '';
_hash_cols text;
_rcl_codes integer[];

/*
sample call:select * from global.rule_list_product_only('cur', '{
    "l0_name": [],
    "l1_name": [
        {
            "type": "list",
            "operator": "in",
            "values": [
                "33-M CLOTHING"
            ]
        }
    ],
    "color": [],
    "size": [],
    "l4_name": [],
    "article": [],
    "l3_name": [],
    "l2_name": []
}'::jsonb, '{"limit":{
"limit":10, "page":1
}}'::jsonb, 'global.rcl_product_mapping_product_store_rule'); 
fetch all from "cur";  
*/
BEGIN
    _query_meta_filters := inventory_smart.form_rcl_table_query($3);

    _pa_query := global.form_main_table_filters('product_attributes_filter', $2);
	select
		array_agg(rcl_code),
		'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hashes' into _rcl_codes, _hash_cols 
	from global.rcl_master 
	where not is_deleted
	and module_code = '170'
	group by is_deleted;

	raise notice '_pa_query: %', _pa_query;

       _query_part := ' with paf as materialized(
					select
						rcl_hash
					from
						(
						select
							unnest(rcl_hashes) as rcl_hash
						from
							(
							select ' || _hash_cols || ' from global.product_attributes_filter ' || _pa_query || ' and active 
					             )x
					) y
					where
						rcl_hash is not null
					group by
						1)
					select
						rcl_code,
						rule_code,
						md5(rcl_dimension::text) rcl_hash,
					    rule_name,
						rcl_dimension
					from
						inventory_smart.rcl_constraint_master_rule
					where
						rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[])
					and exists (
					          		select 1 from paf where rcl_hash = md5(rcl_dimension::text)
					          	)
					group by
						1,
						2,
						3,
						4'
					;


    _query_combine := '
   select *
   from         
   (SELECT
                p.*
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
