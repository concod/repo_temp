--liquibase formatted sql
--changeset liquibase:get_products_attributes,MTP-117673 runOnChange:true stripComments:false splitStatements:false context:MTP-41563 labels:MTP-41563,MTP-117673
--comment:  MTP-41563  model_description added,MTP-117673
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


        v_get_proudcts_sql :=
        
            'WITH style_map_old AS (
                SELECT DISTINCT old_article
                FROM inventory_smart.style_mapping_table
        ),
                style_map_new AS (
                    SELECT DISTINCT new_article
                    FROM inventory_smart.style_mapping_table
        ),
        filtered_products AS (
            SELECT DISTINCT
                article,
                style_color_id,
                product_description,
                model_description,
                l0_name,
                l1_name,
                l2_name,
                l3_name,
                l4_name,
                brand
            from global.product_attributes_filter
            where active
            and product_code in (
                    select sqq.product_code
                        from ('||v_pa_sql||') sqq
                )
        )
    SELECT
        fp.*,
        (smo.old_article IS NULL AND smn.new_article IS NULL) AS old_eligible,
        (smo.old_article IS NULL) AS new_eligible
    FROM filtered_products fp
    LEFT JOIN style_map_old smo ON fp.article = smo.old_article
    LEFT JOIN style_map_new smn ON fp.article = smn.new_article
    ' ||v_meta_cls;

          
  
  raise notice 'v_get_proudcts_sql %',v_get_proudcts_sql;
  open $1 for execute v_get_proudcts_sql;
  RETURN $1;
end
$function$
;