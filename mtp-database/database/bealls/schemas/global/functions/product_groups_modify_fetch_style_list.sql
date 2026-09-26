--liquibase formatted sql
--changeset prashant.singh@impactsmart.co:MTP-111395-fix-function runOnChange:true stripComments:false splitStatements:false context:product_status_agg_list labels:product_status_agg_list
--comment: added this in order to fix group modification: MTP-111395 fixed
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_groups_modify_fetch_style_list(input refcursor, jsonb, jsonb, jsonb, integer, boolean);
CREATE OR REPLACE FUNCTION global.product_groups_modify_fetch_style_list(input refcursor, jsonb, jsonb, jsonb, integer, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	select_clause text := '';
 	group_clause text := '';
 	_final_query text := '';
	begin
	    set cursor_tuple_fraction TO 1.0;
		$3 := $3 || $2;
		_query_pm := 'SELECT * from (SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $2));
 		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
		_query_table_filters := global.form_table_query($4);

		select * from global.aggregation_level_select_group_clause($3) into select_clause, group_clause;
 		_query_combine := '
			select * from (
			select
				*, CASE
        WHEN EXISTS (
            SELECT 1
            FROM jsonb_array_elements(products) AS product_info
            WHERE product_info->>''is_mapped'' = ''true''
        ) THEN true
        ELSE false
    END AS is_mapped
			from
				(
				select ' || select_clause ||
					', jsonb_agg(
						jsonb_build_object(''product_code'', pm.product_code, ''is_mapped'', (case
							when pgm.product_code is null then false
							else true
						end))
					) as products
				from
					(' || _query_pa || ')
					pm
				LEFT JOIN (
					select
						product_code
					from
						"global".product_groups_mapping
					where
						pg_code = ' || $5 || ') pgm on
					pm.product_code = pgm.product_code
				group by '  || group_clause  ||
			' ) X ) Y ' || _query_table_filters;
		raise notice '%',_query_combine;
		if $6 is true then
 			_final_query := 'select count(*) from (' || _query_combine || ') temp' ;
	 	else
	 		_final_query := _query_combine;
	 	end if;
	 	OPEN $1 FOR execute _final_query;
	 	RETURN _final_query;
	end $function$
;
