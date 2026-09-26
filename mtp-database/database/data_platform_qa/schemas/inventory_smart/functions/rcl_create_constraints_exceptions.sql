--liquibase formatted sql
--changeset linu.nazil:create_rcl_constraint_exception_temp_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_rcl_constraint_exception_temp_table
--rollback: SELECT 1
DROP FUNCTION if exists inventory_smart.rcl_create_constraints_exceptions(varchar, int4[], jsonb, text[], jsonb, _created_by int, _product_filters jsonb, store_filters jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.rcl_create_constraints_exceptions(character varying, integer[], jsonb, text[], _created_by integer, _product_filters jsonb, store_filters jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_rule_filter text;
_index_query text;
_pa_query text;
_sa_query text;
_pa_where text;
_rcl_codes text;
_hash_cols text;
/*
Description: Inputs: $1 = persistent temp table name, $2 = list of rule codes, $3 = meta filters, $4 = list of store codes, $5 = created by, $6 = product filters, $7 = store filters;
Sample call:  select
	*
from
	inventory_smart.rcl_create_constraints_exceptions('rule_store_groups_temp1',
	'{}'::int4[],
	'{}',
	'{}'::text[],
	1,
	'{"l0_name": [{
            "type": "list",
            "operator": "in",
            "values": [
                "USA",
				"CAN"
            ]
        }],
    "l4_name": [
        {
            "type": "list",
            "operator": "in",
            "values": [
                "200_HOUSEWARE",
				"0-24M"
            ]
        }
    ]}'::jsonb,
	'{"channel":[{
            "type": "list",
            "operator": "in",
            "values": [
                "E-Commerce", "Brick __ia_char_13 Mortar"
            ]
        }],
    "city": [
        {
            "type": "list",
            "operator": "in",
            "values": [
                "SEVIERVILLE"
            ]
        }
    ]}'::jsonb
	); */
begin
	
	select
				array_agg(rcl_code),
				'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hashes' into _rcl_codes, _hash_cols 
			from global.rcl_master 
			where not is_deleted
			and module_code = '170'
			group by is_deleted;
    
	if cardinality($2) > 0 and cardinality($4) > 0 then
		raise notice 'store_code and rule_code provided;';
		_query_part := 'create table public.' || $1 || ' as select s.rcl_code, s.rule_code, r.rule_name, s.validity, m.store_code, s.wos, s.min_stock, s.max_stock, s.psa_name, s.psa_code, r.rcl_dimension, ' || _created_by || ' as created_by,' || quote_literal(now()) || '::timestamp as created_at FROM inventory_smart.rcl_constraint_master s
						join global.product_store_attributes_filter m using(psa_code)
					    join inventory_smart.rcl_constraint_master_rule r using(rule_code)
						WHERE rule_code = any(' ||  quote_literal($2) || ') AND store_code = ANY('|| quote_literal($4) ||');';
					raise notice 'query_part: %', _query_part;
	elseif cardinality($2) > 0 and cardinality($4) = 0 then
		raise notice 'store filters and rule_code provided;';
		_sa_query := global.form_main_table_filters('store_attributes_filter',  $7);
		raise notice '_sa_query: %', _sa_query;
		
		_query_part := 'create table public.' || $1 || ' as select s.rcl_code, s.rule_code, r.rule_name, s.validity, m.store_code, s.wos, s.min_stock, s.max_stock, s.psa_name, s.psa_code, r.rcl_dimension, ' || _created_by || ' as created_by,' || quote_literal(now()) || '::timestamp as created_at FROM inventory_smart.rcl_constraint_master s
						join global.product_store_attributes_filter m using(psa_code)
						join (select store_code from global.store_attributes_filter ' || _sa_query || ' AND active)b using(store_code)
					    join inventory_smart.rcl_constraint_master_rule r using(rule_code)
						WHERE rule_code = any(' ||  quote_literal($2) || ');';
					raise notice 'query_part: %', _query_part;
	elseif cardinality($2) = 0 and cardinality($4) > 0 then 
		raise notice 'store_code and product filters provided;';
		_pa_query := global.form_main_table_filters('product_attributes_filter', $6);

_pa_where := ' join (
				with paf as materialized(
			 select rcl_hash from (
			           select unnest(rcl_hashes) as rcl_hash from (select ' || _hash_cols || ' from global.product_attributes_filter ' || _pa_query || ' and active and psa_codes <> ''{}''
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

		raise notice '_pa_where: %', _pa_where;
		_query_part := 'create table public.' || $1 || ' as select c.rcl_code, c.rule_code, r.rule_name, c.validity, m.store_code, c.wos, c.min_stock, c.max_stock, c.psa_name, c.psa_code, r.rcl_dimension, ' || _created_by || ' as created_by,' || quote_literal(now()) || '::timestamp as created_at FROM inventory_smart.rcl_constraint_master c
					join global.product_store_attributes_filter m using(psa_code)
					' || _pa_where || ' where store_code = ANY('|| quote_literal($4) || ');';
					
		raise notice 'query_part: %', _query_part;
	else
		raise notice 'store filter and product filter provided;';
		_pa_query := global.form_main_table_filters('product_attributes_filter', $6);
			raise notice '_pa_query: %', _pa_query;

		_pa_where := ' join (
				with paf as materialized(
			 select rcl_hash from (
			           select unnest(rcl_hashes) as rcl_hash from (select ' || _hash_cols || ' from global.product_attributes_filter ' || _pa_query || ' and active and psa_codes <> ''{}''
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

		_sa_query := global.form_main_table_filters('store_attributes_filter',  $7);
			raise notice '_pa_where: %', _pa_where;
			raise notice '_sa_query: %', _sa_query;
	

	_query_part := 'create table public.' || $1 || ' as select c.rcl_code, c.rule_code, r.rule_name, c.validity, m.store_code, c.wos, c.min_stock, c.max_stock, c.psa_name, c.psa_code, r.rcl_dimension, ' || _created_by || ' as created_by,' || quote_literal(now()) || '::timestamp as created_at FROM inventory_smart.rcl_constraint_master c
					join global.product_store_attributes_filter m using(psa_code)
					join (select store_code from global.store_attributes_filter ' || _sa_query || ' AND active)b using(store_code)
					' || _pa_where || ';';
					
		raise notice 'query_part: %', _query_part;
	
	end if;

	execute _query_part;
END
$function$
;
