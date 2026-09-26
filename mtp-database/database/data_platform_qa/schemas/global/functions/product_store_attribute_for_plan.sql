--liquibase formatted sql
--changeset liquibase:product_store_attribute_for_plan runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sp_for_product_not_having_hirarchy
--comment: initial changeset for product_store_attribute_for_plan, this sp is for the products not having hirarchies
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_store_attribute_for_plan(input text);
CREATE OR REPLACE FUNCTION global.product_store_attribute_for_plan(input text)
 RETURNS TABLE(attribute character varying)
 LANGUAGE plpgsql
AS $function$
	declare 
		_query text := '';
	begin
		_query := 'select
			' || $1 || '::varchar
		from
			"global".product_store_hierarchy_mapping
			where  ' || $1 || ' is not null
			group by 1
			order by 1 asc;
		';
		RETURN QUERY EXECUTE _query;
	end
$function$
;

DROP FUNCTION IF EXISTS global.product_store_attribute_for_plan(input text, jsonb);
CREATE OR REPLACE FUNCTION global.product_store_attribute_for_plan(input text, jsonb)
 RETURNS TABLE(attribute character varying)
 LANGUAGE plpgsql
AS $function$
	declare
	_query text := '';
	_where_caluse text := '';
	begin
		_where_caluse := ("global".form_main_table_filters('product_store_hierarchy_mapping', $2));
		if _where_caluse = '' then
			_where_caluse := 'where ' || $1 ||' is not null';
		else
			_where_caluse := _where_caluse || ' and ' || $1 ||' is not null';
		end if;
		_query := 'select
				' || $1 || '::varchar as attribute
			from
				global.product_store_hierarchy_mapping X '
			|| _where_caluse || '
			group by
				1
			order by
				1 asc';
 		raise notice '%',_query;
		RETURN QUERY EXECUTE _query;
	end
$function$
;
