--liquibase formatted sql
--changeset liquibase:get_mapped_products runOnChange:true stripComments:false splitStatements:false context:MTP-32382 labels:MTP-36756
--comment: https://impactanalytics.atlassian.net/browse/MTP-36756
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
    SELECT
    paf.product_description old_product_description,
    paf.l0_name old_l0_name,
    paf.l1_name old_l1_name,
    paf.l2_name old_l2_name,
    paf.l3_name old_l3_name,
    
    new.product_description new_product_description,
    new.l0_name new_l0_name,
    new.l1_name new_l1_name,
    new.l2_name new_l2_name,
    new.l3_name new_l3_name,
    
    effective_date,
    new.updated_at,
    new.updated_by,
    new.priority,
    new_article,
    old_article,
    ARRAY_AGG(old_product_code) old_product_codes,
    ARRAY_AGG(size) old_sizes,
    ARRAY_AGG(new.new_product_code) new_product_codes,
    ARRAY_AGG(new.new_size) new_sizes,
    ARRAY_AGG(new.new_size_descriptions) new_size_names,
    ARRAY_AGG(size_description) old_size_names
FROM (
        SELECT
            *,
            UNNEST(old_product_codes) old_product_code,
            UNNEST(product_codes) new_product_code,
            UNNEST(sizes) new_size,
            UNNEST(size_descriptions) new_size_descriptions
        FROM (
                SELECT
                    l0_name,
                    l1_name,
                    l2_name,
                    l3_name,
                    article,
                    product_description,
                    new_article,
                    old_article,
                    effective_date,
                    smt.updated_at,
                    smt.updated_by,
                    COALESCE(smt.priority, 1) priority,
                    ARRAY_AGG(new_product_code) product_codes,
                    ARRAY_AGG(size) sizes,
                    ARRAY_AGG(size_description) size_descriptions,
                    ARRAY_AGG(old_product_code) old_product_codes
                FROM
                    global.product_attributes_filter paf
                    JOIN inventory_smart.style_mapping_table smt on paf.product_code = new_product_code
                    '||v_pa_sql||'
                GROUP BY
                    1,2,3,4,5,6,7,8,9,10,11,12
) new
) new
LEFT JOIN global.product_attributes_filter paf on paf.product_code = new.old_product_code
GROUP BY
    1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16
    '||v_meta_cls ;
  
  raise notice 'v_get_mapped_products_sql %',v_get_mapped_products_sql;
 
  open $1 for execute v_get_mapped_products_sql;
  RETURN $1;
end
$function$
;