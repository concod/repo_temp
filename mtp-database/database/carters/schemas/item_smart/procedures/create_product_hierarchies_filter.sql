--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:create_product_hierarchies_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for item_smart.create_product_hierarchies_filter
--rollback: SELECT 1


DROP PROCEDURE IF EXISTS item_smart.create_product_hierarchies_filter();


CREATE OR REPLACE PROCEDURE item_smart.create_product_hierarchies_filter()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
begin
	DROP TABLE IF EXISTS item_smart.product_hierarchies_filter_item;
	
	CREATE TABLE item_smart.product_hierarchies_filter_item AS 

		SELECT 
		    hierarchy_code,
		        level,jsonb_strip_nulls(
		                jsonb_build_object(
		                    'style', CASE WHEN style <>''  THEN style else null end,
							'country', CASE WHEN country <> '' THEN country else null end,
		                    'l2_name', CASE WHEN l2_name <>'' THEN l2_name  else null end,
		                    'l3_name', CASE WHEN l3_name <>'' THEN l3_name  else null end,
		                    'l4_name', CASE WHEN l4_name <>'' THEN l4_name else null end,
		                    'l5_name', CASE WHEN l5_name <>'' THEN l5_name else null end
		                ) )AS json_col
		FROM item_smart.product_hierarchies_filter_flattened_item;
   
END;
$procedure$
;