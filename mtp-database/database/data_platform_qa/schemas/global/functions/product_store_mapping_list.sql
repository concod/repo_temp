--liquibase formatted sql
--changeset chaitanyaprasad.reddy:MTP-11651 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-11651
--comment: added count logic to the SP by adding a new boolean parameter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_store_mapping_list(input refcursor, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS global.product_store_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.product_store_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
   /*
    calling statement :
    select * from global.product_store_mapping_list('{}', 
 '{"l0_name": [{"type": "list", "operator": "in", "values": ["Accessories"]}], "l1_name": [], "l2_name": [], "l3_name": [], "style": [], "color": [], "size": []}', 
 '{"range": [], "sort": [], "search": [], "limit": {"page": 1, "limit": 10}}') 
    
    */
 	
 	declare
 		_query_pm text := '';
 		_query_pa text := '';
 		_query_table_filters text := '';
 		_query_combine text;
 		_final_query text;
 	begin
 		--select jsonb_object_agg(key, value) into $2 from (select * from jsonb_each_text($3) where key != 'is_deleted' union select 'is_deleted', '[{"type":"custom","operator":"in","values":"false"}]') x;
 		_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $2));
  		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
 		_query_table_filters := "global".form_table_query($4);
 		_query_combine := '
 			SELECT
 			  *
 			FROM (
 			  SELECT
 				--psm.mapped_stores_count::int4,
 				pm.*
 
 			  FROM (
 				SELECT
 				  main.product_name,
 				  main.product_description,
 				  attributes.*
 				FROM (' || _query_pm || ') main
 				JOIN (' || _query_pa || ') attributes
 				ON
 				  main.product_code = attributes.product_code) pm
 			  /*LEFT JOIN (
 				SELECT
 				  product_code,
 				  COUNT(*) AS mapped_stores_count
 					
 				FROM
 				  "global".product_store_mapping
 				where validity is not null
 				GROUP BY
 				  product_code ) psm
 			  ON
 				pm.product_code = psm.product_code
 			   LEFT JOIN -- store group count removed as per DAT-70
 			  (WITH store_sg AS (
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
 				   group by prod_sg.product_code
 			  ) psgm
 			 on pm.product_code = psgm.product_code	 */) X ' || _query_table_filters;
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

