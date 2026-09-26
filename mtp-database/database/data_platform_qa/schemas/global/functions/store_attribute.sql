--liquibase formatted sql
--changeset liquibase:store_attribute runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attribute
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_attribute(input text, jsonb);
CREATE OR REPLACE FUNCTION global.store_attribute(input text, jsonb)
 RETURNS TABLE(attribute character varying)
 LANGUAGE plpgsql
AS $function$
	declare
	_query text := '';
	begin
		_query := 'select
			' || $1 || '::varchar as attribute
		from
			(' || ("global".form_attribute_table_filters_v2('store_attributes', 'store_code', $2)) || ' ) X
		where '|| $1 ||' is not null
		group by
			1
		order by
			1 asc;';
		RETURN QUERY EXECUTE _query;
	end
$function$
;
CREATE OR REPLACE FUNCTION global.store_attribute(input text)
 RETURNS TABLE(attribute character varying)
 LANGUAGE plpgsql
AS $function$
	declare 
		_query text := '';
	begin
		_query := 'select
			' || $1 || '::varchar
		from
			"global".store_attributes_filter
			where  ' || $1 || ' is not null
			group by 1
			order by 1 asc;
		';
		RETURN QUERY EXECUTE _query;
	end
$function$
;