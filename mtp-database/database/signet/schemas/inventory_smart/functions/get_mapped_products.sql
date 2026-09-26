--liquibase formatted sql
--changeset liquibase:get_mapped_products runOnChange:true stripComments:false splitStatements:false context:MTP-46842 labels:MTP-47705
--comment: Priority changes
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
	
	
   v_pa_sql :=inventory_smart.form_main_table_filters(
		  'ph_master',
		  product_filter
		);
                                                   
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;
                                                   
                                         
                                         
  v_get_mapped_products_sql :='
    
    SELECT * FROM (
      SELECT
        old_article,
        paf.product_description old_product_description,
        paf.product_channel_name old_product_channel_name,
        paf.l0_name old_l0_name,
        paf.l1_name old_l1_name,
        paf.l2_name old_l2_name,
        paf.merchandise_category old_merchandise_category,
        paf.planning_ownership old_planning_ownership,
        paf.merchandise_brand old_merchandise_brand,
    
    
        new_article,
        new.product_description new_product_description,
        new.product_channel_name new_product_channel_name,
        new.l0_name new_l0_name,
        new.l1_name new_l1_name,
        new.l2_name new_l2_name,
        new.merchandise_category new_merchandise_category,
        new.planning_ownership new_planning_ownership,
        new.merchandise_brand new_merchandise_brand,
    
        new.start_date,
        new.end_date,
        new.updated_at,
        new.updated_by,
        new.priority,
        ARRAY_AGG(old_product_code) old_product_codes,
        ARRAY_AGG(new.new_product_code) new_product_codes,
        ARRAY[''No Size'']::TEXT[] AS old_sizes,
        ARRAY[''No Size'']::TEXT[] AS new_sizes,
        ARRAY[''No Size'']::TEXT[] AS old_size_names,
        ARRAY[''No Size'']::TEXT[] AS new_size_names
      FROM (
           
            SELECT
                article,
                product_description,
                product_channel_name,
                l0_name,
                l1_name,
                l2_name,
                merchandise_category,
                planning_ownership,
                merchandise_brand,
                new_article,
                old_article,
                smt.start_date,
                smt.end_date,
                smt.updated_at,
                smt.updated_by,
                COALESCE(smt.priority, 1) priority,
                new_product_code,
                size new_size,
                old_product_code
            FROM
                global.product_attributes_filter paf
                JOIN inventory_smart.style_mapping_table smt on paf.product_code = new_product_code
        				'||v_pa_sql||'
            ) new
      LEFT JOIN global.product_attributes_filter paf on paf.product_code = new.old_product_code
      WHERE old_article is not NULL
      GROUP BY 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23
    ) tb '||v_meta_cls;
  
  raise notice 'v_get_mapped_products_sql %',v_get_mapped_products_sql;
 
  open $1 for execute v_get_mapped_products_sql;
  RETURN $1;
end
$function$
;

