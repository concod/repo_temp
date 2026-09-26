--liquibase formatted sql
--changeset liquibase:get_mapped_products runOnChange:true stripComments:false splitStatements:false context:MTP-45816 labels:MTP-45816
--comment: MTP-45816  updated by from id to name
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_mapped_products(input refcursor, product_filter jsonb, meta_filter jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_mapped_products(input refcursor, product_filter jsonb, meta_filter jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_get_mapped_products_sql  text:='';
  v_pa_sql text:='';
   v_meta_cls text:=''; 

begin
	
	
   v_pa_sql :=global.form_main_table_filters(
		  'product_attributes_filter',
		  product_filter
		);
                                                   
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;
                                                   
                                         

                                         
  v_get_mapped_products_sql :='
		 SELECT new.l0_name new_l0_name, new.l1_name new_l1_name, new.l2_name new_l2_name, new.l3_name new_l3_name, new.l4_name new_l4_name,
	       new.style_color_id new_style_color_id, new.product_description new_product_description,
		   paf.l0_name old_l0_name, paf.l1_name old_l1_name, paf.l2_name old_l2_name, paf.l3_name old_l3_name, paf.l4_name old_l4_name, paf.supersede_flag,
	       paf.style_color_id old_style_color_id, paf.product_description old_product_description, effective_date,
		   new.updated_at, new.updated_by, new.priority,
	       new_article, old_article,
		   ARRAY_AGG(old_product_code) old_product_codes,
		   ARRAY_AGG(size) old_sizes,
	       ARRAY_AGG(new.new_product_code) new_product_codes,
	       ARRAY_AGG(new.new_size) new_sizes,
	       ARRAY_AGG(new.new_size_name) new_size_names,
	       ARRAY_AGG(size_name) old_size_names
	FROM (
	    SELECT *, UNNEST(old_product_codes) old_product_code, UNNEST(product_codes) new_product_code, UNNEST(sizes) new_size, UNNEST(size_names) new_size_name
	    FROM (
	        SELECT l0_name, l1_name, l2_name, l3_name, l4_name, style_color_id, product_description, new_article, old_article, effective_date, supersede_flag,
					smt.updated_at, um.name updated_by, COALESCE(smt.priority, 1) priority,
	        		ARRAY_AGG(new_product_code) product_codes,
	        		ARRAY_AGG(size) sizes,
	                ARRAY_AGG(size_name) size_names,
	        		ARRAY_AGG(old_product_code) old_product_codes
	        FROM global.product_attributes_filter paf
	        JOIN inventory_smart.style_mapping_table smt on paf.product_code = new_product_code
			JOIN global.user_master um ON smt.updated_by = um.email
 			'||v_pa_sql||' 
	        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14

	    ) new
	) new
	LEFT JOIN global.product_attributes_filter paf on paf.product_code = new.old_product_code
	GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21  
	'||v_meta_cls ;

          
  
  raise notice 'v_get_mapped_products_sql %',v_get_mapped_products_sql;
 
  open $1 for execute v_get_mapped_products_sql;
  RETURN $1;
end
$function$
;
