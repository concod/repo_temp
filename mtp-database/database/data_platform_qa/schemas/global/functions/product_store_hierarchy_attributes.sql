--liquibase formatted sql
--changeset chaitanyaprasad.reddy:product_store_hierarchy_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:product_store_hierarchy_attributes
--comment: initial changeset for product_store_hierarchy_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_store_hierarchy_attributes(input refcursor, character varying[], jsonb);
CREATE OR REPLACE FUNCTION global.product_store_hierarchy_attributes(input refcursor, character varying[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
	_query text := '';
	_where_caluse text := '';
	_projection_queries text[];
	_col text;
	begin
		_where_caluse := ("global".form_main_table_filters('product_store_hierarchy_mapping', $3));
		FOREACH _col IN ARRAY $2 LOOP
			IF _where_caluse = '' THEN
				_where_caluse := 'WHERE ' || _col || ' IS NOT NULL';
			ELSE
				_where_caluse := _where_caluse || ' AND ' || _col || ' IS NOT NULL';
			END IF;
			_projection_queries := array_append(
				_projection_queries, 
				'array_agg(distinct ' || _col || ') as ' || _col || '');
		END LOOP;

		_query := 'select
				' || ARRAY_TO_STRING(_projection_queries, ', ', '') || ' 
			from
				global.product_store_hierarchy_mapping X ' || _where_caluse;
 		raise notice '%',_query;
		open $1 for execute _query;
 		RETURN $1;
	end
$function$
;