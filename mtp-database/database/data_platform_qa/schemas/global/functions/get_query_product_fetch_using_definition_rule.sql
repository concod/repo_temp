--liquibase formatted sql
--changeset liquibase:get_query_product_fetch_using_definition_rule runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_query_product_fetch_using_definition_rule
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_query_product_fetch_using_definition_rule(input text, integer[]);
CREATE OR REPLACE FUNCTION global.get_query_product_fetch_using_definition_rule(input text, integer[])
 RETURNS text
 LANGUAGE plpgsql
AS $function$
/*
 Prepares query from group definition rule
 Input :
  $1: pseudo code rule . for multiple definition join using 'OR'.
  $2: pgr_code for above sub rules.
 Calling Statement:
  select * from global.get_query_product_fetch_using_definition_rule('Sub_Rule_1 AND Sub_Rule_2', '{150, 151}')
 */
 declare
 	n varchar;
	a varchar;
	p text;
	attr jsonb := '{}';
	_query text := '';
 begin
	for n,a,p in 
		select name as n, attribute_name as a, concat(attribute_name, ' = any(''', attribute_values, ''')') as p 
		from 
		(
		

			select name,attribute_name, REGEXP_REPLACE(attribute_values::text , $$([^'])'([^'])$$, $$\1''\2$$ ,'g') attribute_values 
		 	from global.product_group_rules where is_deleted = false and pgr_code = any($2)
		 	) x order by length(name) desc loop
		$1 := regexp_replace($1, '\m' || n || '\M', p); /* /m word /M will look for exact word match instead of replacing the sub strings also */
		--raise notice 'p%',p;
		attr := attr || ('{"' || a || '": []}')::jsonb;
	end loop;
	raise notice 'attr : %s', attr;
	_query := global.form_attribute_table_filters_v2('product_attributes', 'product_code', attr);
	_query := 'SELECT * FROM (' || _query || ') X WHERE ' || $1;
	--_query := regexp_replace(_query,'''S','''''S'); /* Temp fix - we need to address for a generic solution*/
	--_query:= replace (_query,'''','''''');
	raise notice ' query : %s',_query;
	
	return _query;
end $function$
;