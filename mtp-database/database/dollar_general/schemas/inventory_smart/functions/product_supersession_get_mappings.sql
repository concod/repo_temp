--liquibase formatted sql
--changeset jitendra.singh:product_supersession_get_mappings runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_supersession_get_mappings
--rollback: SELECT 1
--function fetches details of new supersession mapping;
DROP FUNCTION IF EXISTS inventory_smart.product_supersession_get_mappings(refcursor, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_supersession_get_mappings(input refcursor, mapping_json jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_get_mappings_sql  text:='';
begin

                                         
  v_get_mappings_sql := '
	WITH base as (
		SELECT key old_article, value new_article FROM JSON_EACH_TEXT('''||concat(mapping_json)||'''))
	,new as (
	    SELECT new_article, product_code as new_product_code, l0_name new_l0_name, l1_name new_l1_name, l2_name new_l2_name, l3_name new_l3_name, l4_name new_l4_name, product_description new_product_description
	    FROM base
	    LEFT JOIN global.product_attributes_filter paf on paf.article = base.new_article
	    group by 1,2,3,4,5,6,7
	)
	,old as (
	    SELECT old_article, product_code as old_product_code, l0_name old_l0_name, l1_name old_l1_name, l2_name old_l2_name, l3_name old_l3_name, l4_name old_l4_name, product_description old_product_description
	    FROM base
	    LEFT JOIN global.product_attributes_filter paf on paf.article = base.old_article
	    group by 1,2,3,4,5,6,7
	)
	,combined as (
	    SELECT new.*, old.*
	    FROM base
	    JOIN new USING(new_article)
	   	JOIN old ON base.old_article = old.old_article
	)
	SELECT * FROM combined
';

  raise notice 'v_get_mappings_sql %',v_get_mappings_sql;
  open $1 for execute v_get_mappings_sql;
  RETURN $1;
end
$function$
;

