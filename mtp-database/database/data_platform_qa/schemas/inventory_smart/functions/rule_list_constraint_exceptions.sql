--liquibase formatted sql
--changeset linu.nazil:rule_list_constraint_exceptions runOnChange:true stripComments:false splitStatements:false context:Release_1_16 labels:liquibase_project_start
--comment: initial changeset for rule_list_constraint_exceptions
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.rule_list_constraint_exceptions(refcursor, integer[], jsonb, text[], jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.rule_list_constraint_exceptions(refcursor, integer[], jsonb, text[], jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_where text := '';
_query_final text := '';
_query_meta_filters text;
_query_sa text;
_query_pa text;
_dimension text[];
_hash_cols text;
_rcl_codes integer[];

/*
Description: Inputs: $1 = set all/ selections values, $2 = list ofnrule codes, $3 = store filters, $4 = validity, $5 = meta filters, $6 = product filters.
This function is to list all the active exceptions on rcl constraint master table rules.
sample call: select * from global.rule_list_constraint_exceptions('cur', '{}'::int4[],
'{}'::jsonb,'{}'::text[], '{"limit":{
"limit":10, "page":1
}}'::jsonb, '{}');
fetch all from "cur";*/
begin
    _query_meta_filters := inventory_smart.form_rcl_table_query($5);
   	select * from inventory_smart.form_product_store_filters('exception_stores_table',$6,$3) into _query_sa, _query_final;
   
   	_query_pa := global.form_main_table_filters('product_attributes_filter', $6);
	select
		array_agg(rcl_code),
		'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hashes' into _rcl_codes, _hash_cols 
	from global.rcl_master 
	where not is_deleted
	and module_code = '170'
	group by is_deleted;

	raise notice '_query_pa: %', _query_pa;

if cardinality($2) > 0 then
	if _query_pa is not null then
	_where := 'join (
		with paf as materialized(
	 select rcl_hash from (
	           select unnest(rcl_hashes) as rcl_hash from (select ' || _hash_cols || ' from global.product_attributes_filter ' || _query_pa || ' and active and psa_codes <> ''{}''
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
	else 
	_where := ' JOIN inventory_smart.rcl_constraint_master_rule r using(rule_code, rcl_code) where r.rule_code = any('|| quote_literal($2) ||')';
	end if;
else
	_where := 'join (
		with paf as materialized(
	 select rcl_hash from (
	           select unnest(rcl_hashes) as rcl_hash from (select ' || _hash_cols || ' from global.product_attributes_filter ' || _query_pa || ' and active and psa_codes <> ''{}''
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
end if;
    _query_part := 'SELECT 
					c.rcl_code,
					c.rule_code,
					r.rule_name,
					r.rcl_dimension,
					c.psa_code,
					c.psa_name,
					c.store_code,
				    jsonb_agg(jsonb_build_object(
				        ''wos'', c.wos,
				        ''min_stock'', c.min_stock,
				        ''max_stock'', c.max_stock,
				        ''start_date'', lower(validity),
						''end_date'', (upper(validity)-1),
						''created_at'', c.created_at,
						''created_by'', c.created_by,
						''updated_at'', coalesce(c.updated_at, c.created_at),
						''updated_by'', coalesce(c.updated_by, c.created_by),
						''user_code'', u.user_code,
						''user'', u.user_name
				    )) as data FROM "inventory_smart".rcl_constraint_master_exceptions c
					left join global.user_master u on u.user_code = coalesce(c.updated_by, c.created_by)
	' || _where || ' and current_date < upper(c.validity) GROUP BY c.rcl_code, c.rule_code, r.rule_name, c.psa_name, c.psa_code, c.store_code, r.rcl_dimension';
    _query_combine := '
   select a.* from (select p.*, rm.is_default
            FROM
                (' || _query_part || ') p
join (select store_code, psa_name, psa_code '||_query_sa||') s using(store_code, psa_code)
            JOIN global.rcl_master rm
                USING (rcl_code)
            WHERE NOT rm.is_deleted) a 
            ' || _query_meta_filters ;
	raise notice 'query_combine: %', _query_combine;
    open $1 for execute _query_combine;
	return $1;
end
$function$
;