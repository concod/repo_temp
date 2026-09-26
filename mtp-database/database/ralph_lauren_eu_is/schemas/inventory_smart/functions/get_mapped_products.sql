--liquibase formatted sql
--changeset liquibase:get_inventory_breakdown runOnChange:true stripComments:false splitStatements:false context:MTP-66691 labels:MTP-66691
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
	
	
   v_pa_sql := inventory_smart.form_main_table_filters(
		  'product_attributes_filter',
		  product_filter
		);
                                                   
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;
                                                   
                                         


  v_get_mapped_products_sql :='
		SELECT * FROM ( 
			SELECT l0_name new_l0_name, l1_name new_l1_name, l2_name new_l2_name, l3_name new_l3_name, l4_name new_l4_name,
				style_color_id new_style_color_id, product_description new_product_description, model_description  new_model_description, brand new_brand,
				old_l0_name, old_l1_name, old_l2_name, old_l3_name, old_l4_name, old_cvsc old_style_color_id, old_product_description, old_model_description,old_brand,
				new_article, old_article,
				TO_CHAR(effective_date, ''DD-MM-YYYY'') AS effective_date,  smt.updated_at, um.name updated_by, smt.upload_flag, COALESCE(smt.priority, 1) priority, supersede_flag,
				ARRAY_AGG(new_product_code) new_product_codes,
				ARRAY_AGG(size) new_sizes,
				ARRAY_AGG(size_name) new_size_names,
				ARRAY_AGG(old_product_code) old_product_codes,
				ARRAY_AGG(old_size) old_sizes,
				ARRAY_AGG(old_size_name) old_size_names
			FROM global.product_attributes_filter paf
			JOIN inventory_smart.style_mapping_table smt on paf.product_code = new_product_code
			JOIN global.user_master um ON smt.updated_by = um.email
			'||v_pa_sql||'
			GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26
			ORDER BY updated_at desc
		) tbl
	'||v_meta_cls  ;

          
  
  raise notice 'v_get_mapped_products_sql %',v_get_mapped_products_sql;
 
  open $1 for execute v_get_mapped_products_sql;
  RETURN $1;
end
$function$
;