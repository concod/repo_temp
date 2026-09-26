--liquibase formatted sql
--changeset liquibase:sizes_order runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sizes_order
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.sizes_order(input character varying);
CREATE OR REPLACE FUNCTION inventory_smart.sizes_order(input character varying)
 RETURNS TABLE(size_order json)
 LANGUAGE plpgsql
AS $function$
	begin
		
	RETURN QUERY 
		SELECT JSON_OBJECT_AGG(ast.size, ast.order) AS size_order
		FROM inventory_smart.article_status_tag ast
		join "global".product_attributes_filter paf 
		on paf.product_code  = ast.product_code 
		WHERE article = $1 ;

	END;
$function$
;
