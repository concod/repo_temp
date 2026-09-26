--liquibase formatted sql
--changeset liquibase:product_groups_styles_list_MTP-23631 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:get product_description from main
--comment: get product_description from main 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_groups_styles_list(input refcursor, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.product_groups_styles_list(input refcursor, jsonb, jsonb, jsonb, boolean)
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
 		_query_pm := 'SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $2));
  		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
 		_query_table_filters := global.form_table_query($4);
 		select * from global.aggregation_level_select_group_clause($3) into select_clause, group_clause;
 		raise notice 'select query %', select_clause;
 		raise notice 'group query %', group_clause;
  		_query_combine := 'SELECT * FROM (
 			select ' || select_clause ||
 				' , pm.product_description as product_description,jsonb_agg(
 					jsonb_build_object(''product_code'', pm.product_code)
 				) as products
 			from
 				(SELECT main.product_description, attributes.* FROM (' || _query_pm || ') main JOIN (' || _query_pa || ') attributes ON main.product_code = attributes.product_code) pm
 			group by product_description, ' || group_clause  || ' 
 		) X ' || _query_table_filters;
 		if $5 is true then
 			_final_query := 'select count(*) from (' || _query_combine || ') temp' ;
	 	else
	 		_final_query := _query_combine;
	 	end if;
	 	OPEN $1 FOR execute _final_query;
	 	RETURN _final_query;
 		--return query execute _query_combine;
 	end $function$
;


DROP FUNCTION IF EXISTS global.product_groups_styles_list(input refcursor, jsonb, jsonb, jsonb, integer, boolean);
CREATE OR REPLACE FUNCTION global.product_groups_styles_list(input refcursor, jsonb, jsonb, jsonb, integer, boolean)
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
		$3 := $3 || $2;
		_query_pm := 'SELECT * from (SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $2));
 		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
		_query_table_filters := global.form_table_query($4);
		select * from global.aggregation_level_select_group_clause($3) into select_clause, group_clause;
 		_query_combine := '
    SELECT * FROM (
        SELECT
            *, 
            CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements(products) AS product_info
                    WHERE product_info->>''is_mapped'' = ''true''
                ) THEN true
                ELSE false
            END AS is_mapped
        FROM (
            SELECT ' || select_clause || ',
                jsonb_agg(
                    jsonb_build_object(
                        ''product_code'', pm.product_code,
                        ''is_mapped'', CASE 
                            WHEN pgm.product_code IS NULL THEN false
                            ELSE true
                        END
                    )
                ) AS products, pm_.product_description
            FROM 
                (' || _query_pa || ') pm
            JOIN 
                (SELECT product_code, product_description from (' || _query_pm || ') foo) pm) pm_
            ON 
                pm_.product_code = pm.product_code
            LEFT JOIN (
                SELECT product_code
                FROM "global".product_groups_mapping
                WHERE pg_code = ' || $5 || '
            ) pgm 
            ON pm.product_code = pgm.product_code
            GROUP BY  pm_.product_description, ' || group_clause || '
        ) X 
    ) Y ' || _query_table_filters;
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

