--liquibase formatted sql
--changeset liquibase:style_color_and_size_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for style_color_and_size_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.style_color_and_size_list(input text);
CREATE OR REPLACE FUNCTION global.style_color_and_size_list(input text)
 RETURNS TABLE(colors character varying[], sizes character varying[], metrics jsonb)
 LANGUAGE plpgsql
AS $function$
	declare
		_query_pa text;
		_query text;
		_input jsonb := '{"style":[{"type":"list", "operator":"in", "values":["' || $1 || '"]}], "color":[], "size":[]}';
	begin
		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', _input);
		_query := '
			select
				array_agg(distinct pa.color) as colors,
				array_agg(distinct pa.size) as sizes,
				jsonb_agg(jsonb_build_object(''product_code'', pa.product_code, ''color'', pa.color, ''size'', pa.size)) as metrics
			from
				(' || _query_pa || ' order by size, color ) pa
			group by
				style';
		raise notice '%',_query;
		RETURN QUERY execute _query;
 	end
$function$
;
