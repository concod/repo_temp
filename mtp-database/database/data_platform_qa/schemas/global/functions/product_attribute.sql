--liquibase formatted sql
--changeset liquibase:product_attribute runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attribute
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_attribute(input text);
CREATE OR REPLACE FUNCTION global.product_attribute(input text)
 RETURNS TABLE(attribute character varying)
 LANGUAGE plpgsql
AS $function$
	declare 
		_query text := '';
	begin
		_query := 'select
			' || $1 || '::varchar
		from
			"global".product_attributes_filter
			where  ' || $1 || ' is not null
			group by 1
			order by 1 asc;
		';
		RETURN QUERY EXECUTE _query;
	end
$function$
;


CREATE OR REPLACE FUNCTION global.product_attribute(input text, jsonb)
 RETURNS TABLE(attribute character varying)
 LANGUAGE plpgsql
AS $function$
	declare
	_query text := '';
	_active_filter jsonb := '{"active": [{"type": "list", "operator": "in", "values": [true]}]}';
	begin
		$2 := $2 || _active_filter;
		_query := 'select
				' || $1 || '::varchar as attribute
			from
				(' || ("global".form_attribute_table_filters_v2('product_attributes', 'product_code', $2)) || ' ) X
			where '|| $1 ||' is not null
			group by
				1
			order by
				1 asc';
 		raise notice '%',_query;
		RETURN QUERY EXECUTE _query;
	end
$function$
;
