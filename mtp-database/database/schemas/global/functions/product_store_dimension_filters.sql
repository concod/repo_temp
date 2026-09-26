--liquibase formatted sql
--changeset chaitanyaprasad.reddy:product_store_dimension_filters runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_dimension_filters
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_store_dimension_filters(input refcursor, character varying[], jsonb);
CREATE OR REPLACE FUNCTION global.product_store_dimension_filters(input refcursor, character varying[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
 Returns aggregated distinct values for product_store attributes sent in $2
 Calling Statement: 
 	 select * from global.product_store_dimension_filters('abc','{"l0_name"}', 
 	'{"l0_name": []}')
  */
	declare
	_query text := '';
	_projection_queries text[];
	_col text;
	begin
		
		foreach _col in array $2 loop
			_projection_queries := array_append(
				_projection_queries, 
				'array_agg(distinct ' || _col || ') as ' || _col || '');
		end loop;
 		raise notice ' _projection_queries - %',_projection_queries;
 		_query := 'select ' || ARRAY_TO_STRING(_projection_queries, ', ', '') || '
				 from (' || ("global".form_attribute_table_filters_v2('product_store_attributes',
				'', $3)) || ' ) X';
		raise notice ' _query - %',_query;
		open $1 for execute _query;
 	RETURN $1;
	end
$function$
;
