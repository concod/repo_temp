--liquibase formatted sql
--changeset liquibase:compare_product_hierarchy runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for compare_product_hierarchy
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.compare_product_hierarchy(input jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.compare_product_hierarchy(input jsonb, jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
	declare
--	_query_pm text := '';
	_query_pa1 text := '';
	_query_pa2 text := '';
--	_query_table_filters text := '';
	_query_combine text := '';
	_is_compareable bool := false;
	_jon_con text[];
	_cols text[];
	_key text;
	_value text;
	begin
		select
			sum(case when x.key is null then 0 else 1 end) = sum(case when y.key is null then 0 else 1 end) into _is_compareable
		from
			jsonb_each_text($1) x
		full outer join (
			select
				*
			from
				jsonb_each_text($2))y on
			x.key = y.key;
		if _is_compareable then
			for _key, _value in SELECT * FROM jsonb_each_text($1) loop
				_jon_con := array_append(_jon_con, ('t1.' || _key || ' = t2.' || _key));
				_cols := array_append(_cols, _key);
			end loop;
		raise notice '%', _cols[1];
			_query_pa1 := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $1);
 			_query_pa2 := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
 			_query_combine := 'select
	sum(case when t1.' || _cols[1] || ' is null then 0 else 1 end) = sum(case when t2.' || _cols[1] || ' is null then 0 else 1 end) FROM (select ' || ARRAY_TO_STRING(_cols, ', ', '') || ' FROM (' || _query_pa1 || ') x group by ' || ARRAY_TO_STRING(_cols, ', ', '') || ') t1 full outer JOIN (select ' || ARRAY_TO_STRING(_cols, ', ', '') || ' FROM (' || _query_pa2 || ') x group by ' || ARRAY_TO_STRING(_cols, ', ', '') || ') t2 ON ' || ARRAY_TO_STRING(_jon_con, ' AND ', '');
			raise notice '%',_query_combine;
			execute _query_combine into _is_compareable;
			return _is_compareable;
 		else 
			return false;
		end if;
end $function$
;
