--liquibase formatted sql
--changeset liquibase:get_mappings runOnChange:true stripComments:false splitStatements:false context:MTP-41563 labels:41563
--comment:  MTP-41563  model_description added
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_mappings(input refcursor, mapping_json jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_mappings(input refcursor, mapping_json jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_get_mappings_sql  text:='';
begin

                                         
  v_get_mappings_sql :='
	WITH base as (
		SELECT key old_article, value new_article FROM JSON_EACH_TEXT('''||concat(mapping_json)||''')	)
	,new as (
	    SELECT new_article, size, product_code, size_name,
	           l0_name new_l0_name, l1_name new_l1_name, l2_name new_l2_name, l3_name new_l3_name, l4_name new_l4_name,
	           style_color_id new_style_color_id, product_description new_product_description, model_description new_model_description
	    FROM base
	    LEFT JOIN global.product_attributes_filter paf on paf.article = base.new_article
		WHERE paf.is_deleted=false
	    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,12
	)
	,old as (
	    SELECT old_article, size, product_code, size_name,
	           l0_name old_l0_name, l1_name old_l1_name, l2_name old_l2_name, l3_name old_l3_name, l4_name old_l4_name,
	           style_color_id old_style_color_id, product_description old_product_description, model_description old_model_description
	    FROM base
	    LEFT JOIN global.product_attributes_filter paf on paf.article = base.old_article
		WHERE paf.is_deleted=false
	    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,12
	)
	,new_agg as (
		SELECT new_article,
	           new_l0_name, new_l1_name, new_l2_name, new_l3_name, new_l4_name,
	           new_style_color_id, new_product_description, new_model_description,
		 	   ARRAY_AGG(product_code) new_product_code_all,
			   ARRAY_AGG(size) new_size_all,
	           ARRAY_AGG(size_name) new_size_name_all
		FROM new
		GROUP BY 1, 2, 3, 4, 5, 6, 7, 8,9
	)
	,old_agg as (
	    SELECT old_article,
	           old_l0_name, old_l1_name, old_l2_name, old_l3_name, old_l4_name,
	           old_style_color_id, old_product_description, old_model_description,
	  		   ARRAY_AGG(product_code) old_product_code_all,
			   ARRAY_AGG(size) old_size_all,
	           ARRAY_AGG(size_name) old_size_name_all
	    FROM old
		GROUP BY 1, 2, 3, 4, 5, 6, 7, 8,9
	)
	,combined as (
	    SELECT new_article, old.old_article,
	           ARRAY_AGG(new.product_code) new_product_code,
	           ARRAY_AGG(new.size) new_size,
	           ARRAY_AGG(old.product_code) old_product_code,
	           ARRAY_AGG(old.size) old_size
	    FROM base
	    JOIN new USING(new_article)
	    JOIN old ON base.old_article = old.old_article AND new.size = old.size
	    GROUP BY 1, 2
	)
	SELECT * FROM base
	LEFT JOIN combined USING(new_article, old_article)
	LEFT JOIN new_agg USING(new_article)
	LEFT JOIN old_agg USING(old_article)';

          
  
  raise notice 'v_get_mappings_sql %',v_get_mappings_sql;
  open $1 for execute v_get_mappings_sql;
  RETURN $1;
end
$function$
;
