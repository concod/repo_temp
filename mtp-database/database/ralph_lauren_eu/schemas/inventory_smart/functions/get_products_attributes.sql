--liquibase formatted sql
--changeset liquibase:get_products_attributes runOnChange:true stripComments:false splitStatements:false context:MTP-35700 labels:MTP-35700
--comment: query optimised
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_products_attributes(input refcursor, product_filter jsonb,meta_filter jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_products_attributes(input refcursor, product_filter jsonb,meta_filter jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql               text:='';
  v_get_proudcts_sql  text:='';
  v_meta_cls             text:=''; 
begin
  v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                    ,'product_code'
                                                    , $2
                                                    );
                                                   
                                                   
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;
  
  
  
  v_get_proudcts_sql := '
    WITH filtered_products AS (
        '|| v_pa_sql ||' and active
        GROUP BY 1,2,3,4,5,6,7,8,9,10
    )
    SELECT 
        f.*,
        (NOT EXISTS (
            SELECT 1 FROM inventory_smart.style_mapping_table sm
            WHERE sm.old_article = f.article OR sm.new_article = f.article
        )) AS old_eligible,
        (NOT EXISTS (
            SELECT 1 FROM inventory_smart.style_mapping_table sm
            WHERE sm.old_article = f.article
        )) AS new_eligible
    FROM filtered_products f
    '||v_meta_cls;

          
  
  raise notice 'v_get_proudcts_sql %',v_get_proudcts_sql;
  open $1 for execute v_get_proudcts_sql;
  RETURN $1;
end
$function$
;
