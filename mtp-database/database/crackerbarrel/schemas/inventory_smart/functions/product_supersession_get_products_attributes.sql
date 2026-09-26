--liquibase formatted sql
--changeset adesh:product_supersession_get_products_attributes runOnChange:true stripComments:false splitStatements:false context:MTP-64252 labels:MTP-64252
--comment: MTP-74463
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
WITH
  paf_data AS (
  SELECT
    l2_name,
    l3_name,
    l4_name,
    l5_name,
    article,
    product_code,
    product_description,
    primary_trait_desc,
    product_type,
    item_status,
    ia_sku_type,
    active
  FROM
    global.product_attributes_filter  '||_query_pa||'),
  temp_result AS (
  SELECT
    DISTINCT sq.l2_name,
    sq.l3_name,
    sq.l4_name,
    sq.l5_name,
    sq.article,
    sq.product_code,
    sq.product_description,
    sq.primary_trait_desc,
    sq.product_type,
    sq.item_status,
    sq.ia_sku_type,
    sq.active,
    CASE
      WHEN sq.article NOT IN ( SELECT old_article FROM inventory_smart.product_supersession_mapping ) AND sq.article NOT IN ( SELECT article FROM inventory_smart.product_supersession_mapping ) THEN TRUE
      ELSE FALSE
  END
    AS old_eligible,
    CASE
      WHEN sq.article NOT IN ( SELECT old_article FROM inventory_smart.product_supersession_mapping ) AND sq.article NOT IN ( SELECT article FROM inventory_smart.product_supersession_mapping ) THEN TRUE
      ELSE FALSE
  END
    AS new_eligible
  FROM
    paf_data sq
WHERE
    ia_sku_type IN (''baby_sku'',
      ''eaches'') ),
  temp_1_item_status_cte AS (
  SELECT
    article,
    item_status,
    COUNT(*) AS cnt
  FROM
    temp_result
  WHERE
    ia_sku_type IN (''baby_sku'',
      ''eaches'')
    AND active
  GROUP BY
    article,
    item_status ),
  temp_2_item_status_cte AS (
  SELECT
    t1.*,
    t2.max_cnt
  FROM
    temp_1_item_status_cte t1
  JOIN (
    SELECT
      article,
      MAX(cnt) AS max_cnt
    FROM
      temp_1_item_status_cte
    GROUP BY
      article ) t2
  ON
    t1.article = t2.article
  WHERE
    t1.cnt = t2.max_cnt ),
  item_status_cte AS (
  SELECT
    article,
    MIN(item_status) AS item_status
  FROM
    temp_2_item_status_cte
  GROUP BY
    article ),
  temp_1_product_type_cte AS (
  SELECT
    article,
    product_type,
    COUNT(*) AS cnt
  FROM
    temp_result
  WHERE
    ia_sku_type IN (''baby_sku'',
      ''eaches'')
    AND active
  GROUP BY
    article,
    product_type ),
  temp_2_product_type_cte AS (
  SELECT
    t1.*,
    t2.max_cnt
  FROM
    temp_1_product_type_cte t1
  JOIN (
    SELECT
      article,
      MAX(cnt) AS max_cnt
    FROM
      temp_1_product_type_cte
    GROUP BY
      article ) t2
  ON
    t1.article = t2.article
  WHERE
    t1.cnt = t2.max_cnt ),
  product_type_cte AS (
  SELECT
    article,
    MAX(product_type) AS product_type
  FROM
    temp_1_product_type_cte
  GROUP BY
    article ),
  final_cte AS (
  SELECT
    MAX(d.l2_name) l2_name,
    MAX(d.l3_name) l3_name,
    MAX(d.l4_name) l4_name,
    MAX(d.l5_name) l5_name,
    a.article,
    MAX(d.product_description) product_description,
    MAX(d.primary_trait_desc) primary_trait_desc,
    b.product_type,
    a.item_status,
    d.old_eligible,
    d.new_eligible
  FROM
    item_status_cte a
  INNER JOIN
    product_type_cte b
  USING
    (article)
  INNER JOIN (
    SELECT
      article,
      l2_name,
      l3_name,
      l4_name,
      l5_name,
      product_description,
      primary_trait_desc,
      old_eligible,
      new_eligible
    FROM
      temp_result ) d
  USING
    (article)
  GROUP BY
    article,
    product_type,
    item_status,
    old_eligible,
    new_eligible)
  SELECT
  *
  FROM
  final_cte' || v_meta_cls;
  
  raise notice 'v_get_proudcts_sql %',v_get_proudcts_sql;
  open $1 for execute v_get_proudcts_sql;
  RETURN $1;
end
$function$
;
