--liquibase formatted sql
--changeset adesh:product_supersession_get_products_attributes_v2 runOnChange:true stripComments:false splitStatements:false context:fix-duplicates labels:fix-duplicates
--comment: fix-duplicates:removing-product_code
--rollback: SELECT 1
--function to get products eligible for supersession mapping;
DROP FUNCTION IF EXISTS inventory_smart.product_supersession_get_products_attributes(refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_supersession_get_products_attributes(input refcursor, product_filter jsonb, meta_filter jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql               text:='';
  v_get_proudcts_sql     text:='';
  v_meta_cls             text:=''; 
 _query_pa text:='';
begin
  raise notice '%',$2;
                                                   
  _query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
   raise notice '%',_query_pa;
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;
  
v_get_proudcts_sql := '
        WITH paf_data AS (
            SELECT
                l1_name,
                l2_name,
                l3_name,
                l4_name,
                l5_name,
                l6_name,
                l8_name,
                article,
                article_orig,
                product_description,
                product_code,
                assortment_indicator
            FROM global.product_attributes_filter ' || _query_pa || '
        ),
        base AS (
            SELECT
                *,
                CASE
                    WHEN product_code NOT IN (
                        SELECT old_article FROM inventory_smart.product_supersession_mapping
                    )
                    AND product_code NOT IN (
                        SELECT article FROM inventory_smart.product_supersession_mapping
                    )
                    THEN true ELSE false
                END AS old_eligible,
                CASE
                    WHEN product_code NOT IN (
                        SELECT old_article FROM inventory_smart.product_supersession_mapping
                    )
                    AND product_code NOT IN (
                        SELECT article FROM inventory_smart.product_supersession_mapping
                    )
                    THEN true ELSE false
                END AS new_eligible
            FROM paf_data
        )
        SELECT distinct
            l1_name,
            l2_name,
            l3_name,
            l4_name,
            l5_name,
            l6_name,
            l8_name,
            article,
            article_orig,
            product_description,
            assortment_indicator,
            old_eligible,
            new_eligible
        FROM base
        ' || v_meta_cls || '
    ';
  
  raise notice 'v_get_proudcts_sql %',v_get_proudcts_sql;
  open $1 for execute v_get_proudcts_sql;
  RETURN $1;
end
$function$
;
