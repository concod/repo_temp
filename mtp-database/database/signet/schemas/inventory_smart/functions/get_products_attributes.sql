--liquibase formatted sql
--changeset liquibase:get_products_attributes runOnChange:true stripComments:false splitStatements:false context:MTP-45225 labels:MTP-47705
--comment: Priority changes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_products_attributes(input refcursor, product_filter jsonb,meta_filter jsonb, article_type VARCHAR);
CREATE OR REPLACE FUNCTION inventory_smart.get_products_attributes(input refcursor, product_filter jsonb,meta_filter jsonb, article_type VARCHAR)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql               text:='';
  v_get_proudcts_sql  text:='';
  v_meta_cls             text:=''; 
  already_mapped_articles  text:=''; 
begin
  v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                    ,'product_code'
                                                    , $2
                                                    );
                                                   
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;
   
   if $4 <> 'new_article'
   then
   		already_mapped_articles = 'SELECT DISTINCT article from (
      					SELECT old_article as article FROM inventory_smart.style_mapping_table where old_article is not NULL
                        UNION ALL
      					SELECT new_article as article FROM inventory_smart.style_mapping_table
                    ) foo';
    else
   		already_mapped_articles = '
      		SELECT old_article FROM inventory_smart.style_mapping_table where old_article is not NULL
      ';
   end if;
   
  
  
  
  v_get_proudcts_sql := '
  SELECT *, true as old_eligible, true as new_eligible FROM (
			select
            article,
            product_description,
            product_channel_name,
            l0_name,
            l1_name,
            l2_name,
            merchandise_category,
            planning_ownership,
            merchandise_brand
        from
            global.product_attributes_filter paf
        left join inventory_smart.article_status_tag ast on ast.product_code = paf.product_code
        where active and ast.article_status_tag != ''Old'' and paf.product_code in (
                select ssq.product_code
                from ('||v_pa_sql||') ssq
        ) and article NOT IN ('||already_mapped_articles||')
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
    ) sq '||v_meta_cls;
          
  
  raise notice 'v_get_proudcts_sql %',v_get_proudcts_sql;
  open $1 for execute v_get_proudcts_sql;
  RETURN $1;
end
$function$
;