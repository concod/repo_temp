--liquibase formatted sql
--changeset liquibase:product_store_mapping_agg_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_mapping_agg_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_store_mapping_agg_list(input refcursor, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.product_store_mapping_agg_list(input refcursor, jsonb, jsonb, jsonb, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
  
  Calling statement:
  select * from global.product_store_mapping_agg_list
 ('abc',
 '{}', 
 '{"l0_name": [{"type": "list", "operator": "in", "values": ["Accessories"]}], "l1_name": [], "l2_name": [], "l3_name": [], "style": [],  "size": []}', 
 '{"range": [], "sort": [], "search": [], "limit": {"page": 1, "limit": 10}}'
 );
 fetch all in "abc"; 
 commit;
 
 
 
 Updated_by       Updated_on      	Purpose
 ----------       -----------     --------
 Kailash Yadav    21-Aug-2022    	Converted static to refcursor SP and added function column_list fucntion to get the dynamic column lists.
 */
 
 declare
 	_query_pm text := '';
 	_query_pa text := '';
 	_query_table_filters text := '';
 	_query_combine text;
 	_select_columns text;
 	_group_by_clause text[]:= array[]::text[];
   	_group_by_clause_txt text;
   	_lst_hierarchy text[];
   	_full_lst_hierarchy text[];
 	_key text;
 	_value text;
 	_str_agg_clause text[];
 	_str_agg_clause_text text;
 	_final_query text;
 	select_clause text;
 	group_clause text;
 	
 	begin
		select array_agg(attribute_name) as full_lst from global.product_attributes_list pal where is_hierarchy is true into _full_lst_hierarchy;
		select * from global.aggregation_level_select_group_clause($3) into select_clause, group_clause;
		--$2 = $2 || '{"product_description": []}';
 		--_select_columns := global.column_list($3);	
 		_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $2));
  		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
 		_query_table_filters := "global".form_table_query($4);
 		_query_combine := '
 			SELECT
 			  *
 			FROM (
 			  SELECT
				string_agg( distinct product_description::text, '','') as product_description,
 				ARRAY_AGG(pm.product_code) AS mapped_products,
 				SUM(psm.mapped_stores_count)::int4,'||
 				select_clause || '
 			  FROM (
 				SELECT
				product_description,
 				  attributes.*
 				FROM (' || _query_pm || ') main
 				JOIN (' || _query_pa || ') attributes
 				ON
 				  main.product_code = attributes.product_code) pm
 			  LEFT JOIN (
 				SELECT
 				  product_code,
 				  COUNT(*) AS mapped_stores_count
 				FROM
 				  "global".product_store_mapping
 				GROUP BY
 				  product_code) psm
 			  ON
 				pm.product_code = psm.product_code
 			  /*LEFT JOIN (
 				WITH store_sg AS (
 		         SELECT sgm.store_code,
 		            sgm.sg_code
 		           FROM global.store_groups_mapping sgm
 		             JOIN global.store_groups sg ON sgm.sg_code = sg.sg_code AND NOT sg.is_deleted
 		        ), prod_sg AS (
 		         SELECT psm.product_code,
 		            s.sg_code
 		           FROM global.product_store_mapping psm
 		             JOIN store_sg s ON psm.store_code::text = s.store_code::text
 					        )
 				 SELECT DISTINCT prod_sg.product_code,
 				    count (prod_sg.sg_code) mapped_store_groups_count
 				   FROM prod_sg
 				   group by prod_sg.product_code) psgm
 			  ON
 				pm.product_code = psgm.product_code*/
 			  GROUP BY '||
 				group_clause
 				||' ) X ' || _query_table_filters;
 		raise notice '%', _query_combine;
 		--RETURN QUERY execute _query_combine;
 		if $5 is false then 
            _final_query := _query_combine;
        else
        	_final_query := 'select count(*) from (' || _query_combine || ') temp' ;
        end if;
 		OPEN $1 FOR execute _final_query;
 		RETURN $1;
  	end
 $function$
;

