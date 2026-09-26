--liquibase formatted sql
--changeset liquibase:product_groups_styles_list_by_pseudo_code_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_groups_styles_list_by_pseudo_code_1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_groups_styles_list_by_pseudo_code(input jsonb, jsonb, jsonb, text, integer[]);
/*
    Display product group based on definition.

    Author: Ashish Gupta

    Update: 2022-03-22 , Added order by clause to fix bug(if multiple rules have same prefix name)

*/

CREATE OR REPLACE FUNCTION global.product_groups_styles_list_by_pseudo_code(input jsonb, jsonb, jsonb, text, integer[])
 RETURNS TABLE(style character varying, avg_st_perc real, rev_con_perc real, products jsonb)
 LANGUAGE plpgsql
AS $function$
	declare
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	n varchar;
	a varchar;
	p text;
	attr jsonb := '{}';
	_query_pa_patch text := '';
begin
		for n,a,p in select name as n, attribute_name as a, concat(attribute_name, ' = any(''', attribute_values, ''')') as p from global.product_group_rules where is_deleted = false and pgr_code = any($5) order by length(name) desc loop 
			$4 := replace($4, n, p);
			attr := attr || ('{"' || a || '": []}')::jsonb;
		end loop;
		_query_pa_patch := global.form_attribute_table_filters_v2('product_attributes', 'product_code', attr);
		_query_pa_patch := 'SELECT * FROM (' || _query_pa_patch || ') X WHERE ' || $4;
		_query_pm := 'SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $1));
 		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
		_query_table_filters := global.form_table_query($3);
 		_query_combine := '
			select
				*
			from (
				select
                style,
				0.0::float4 as avg_st_perc,
				0.0::float4 as rev_con_perc,
				jsonb_agg(
					jsonb_build_object(''product_code'', pm.product_code, ''avg_st_perc'', 0.0, ''rev_con_perc'', 0.0)
				) as products

				from (
					select
						main.product_code,
						main.product_name,
						main.product_description,
						attributes.style,
						attributes.color,
						attributes.size
					from
						(' || _query_pm || ') main
					join (' || _query_pa || ') attributes on
						main.product_code = attributes.product_code
				) pm join (' || _query_pa_patch || ') patch on
				pm.product_code = patch.product_code
				group by style
			) X ' || _query_table_filters;
		raise notice '%',_query_combine;
		return query execute _query_combine;
	end $function$
;
