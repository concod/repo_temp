--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_product_level_id_column runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_get_product_level_id_column
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_get_product_level_id_column;
CREATE OR REPLACE FUNCTION price_markdown.fn_get_product_level_id_column(product_level_id integer)
 RETURNS character varying
	LANGUAGE plpgsql
AS $function$
begin
	return format('product_h%1$s_id',product_level_id);
end
$function$
;