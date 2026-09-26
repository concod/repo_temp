--liquibase formatted sql
--changeset suba.natraj:get_products_attributes-chang3 runOnChange:true stripComments:false splitStatements:false context:MTP-35700 labels:MTP-35700
--comment: Removed Inactive materials from create new mapping
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
SELECT
    sq.*,
    CASE
        WHEN sq.article NOT IN (
            SELECT old_article
            FROM
                inventory_smart.style_mapping_table
        )
        AND sq.article NOT IN (
            SELECT new_article
            FROM
                inventory_smart.style_mapping_table
        ) THEN true
        ELSE false
    END as old_eligible,
    CASE
        WHEN sq.article NOT IN (
            SELECT old_article
            FROM
                inventory_smart.style_mapping_table
        ) THEN true
        ELSE false
    END as new_eligible
FROM (
        select
            article,
            product_description,
            l0_name,
            l1_name,
            l2_name,
            l3_name
        from
            global.product_attributes_filter
        where product_code in (
                select ssq.product_code
                from ('||v_pa_sql||') ssq
            ) and active
        GROUP BY 1, 2, 3, 4, 5, 6
    ) sq '||v_meta_cls;

          
  
  raise notice 'v_get_proudcts_sql %',v_get_proudcts_sql;
  open $1 for execute v_get_proudcts_sql;
  RETURN $1;
end
$function$
;
