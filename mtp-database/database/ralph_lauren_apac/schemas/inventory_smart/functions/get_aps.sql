--liquibase formatted sql
--changeset liquibase:get_aps runOnChange:true stripComments:false splitStatements:false context:MTP-96389 labels:liquibase_project_start
--comment: optimised changes for get_aps
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_aps(input jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_aps(input jsonb)
 RETURNS TABLE(article character varying, aps numeric, wos numeric)
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
	declare
	begin
		return QUERY
		WITH input as (
			SELECT UNNEST(product_codes) as product_code, store_code
				FROM (
					SELECT
							replace(replace(value->>'upc', '[', '{'), ']', '}')::varchar[] as product_codes,
							replace(replace(value->>'store_group_code', '[', '{'), ']', '}')::int4[] as store_group_codes
					FROM
						jsonb_array_elements($1)
				) inp
			LEFT JOIN global.store_groups_mapping sgm 
			ON sgm.sg_code = ANY(inp.store_group_codes)
		)
		,product_store_mapping as (
			SELECT mapping_code, product_code, store_code
			FROM global.product_mapping_product_store pmps 
			WHERE product_code IN (SELECT product_code FROM input) AND store_code IN (SELECT store_code FROM input)
		)
		,article_product_store_mapping as (
			SELECT psm.*, paf.article FROM product_store_mapping psm JOIN global.product_attributes_filter paf 
			ON psm.product_code = paf.product_code
		)
		,constraint_data1 as materialized(
			SELECT mapping_code, aps, wos FROM inventory_smart.constraint_master
			JOIN article_product_store_mapping USING(mapping_code)
		)
		,constraint_data2 as (
			SELECT 
				article, 
				psm.store_code, 
				SUM(aps) as aps, 
				AVG(wos) as wos 
			FROM 
				article_product_store_mapping psm 
				LEFT JOIN constraint_data1 cm USING(mapping_code)
			GROUP BY 
				1, 
				2
		)
		,constraint_data as (
		  SELECT 
		    article, 
		    ROUND(
		      AVG(aps):: numeric, 
		      2
		    ) as aps, 
		    ROUND(
		      AVG(wos):: numeric, 
		      2
		    ) as wos
		  FROM 
		    constraint_data2
		  GROUP BY 
		    1
		)
		SELECT * FROM constraint_data;
	end
$function$
;
