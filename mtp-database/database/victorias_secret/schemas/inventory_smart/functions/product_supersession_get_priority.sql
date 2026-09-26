--liquibase formatted sql
--changeset liquibase:product_supersession_get_priority runOnChange:true stripComments:false splitStatements:false context:MTP-49021 labels::MTP-49021
--comment: add store priority to supersession mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_supersession_get_priority(input, text);
CREATE OR REPLACE FUNCTION inventory_smart.product_supersession_get_priority(input refcursor, article text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_get_priority_sql text := '';
  v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
  v_get_priority_sql := '
    SELECT 
      store,
      ARRAY_AGG(x.article) new_articles,
      ARRAY_AGG(x.old_article) old_article,
      ARRAY_AGG(x.priority) priority
    FROM (
      (
      SELECT 
        ''default'' as store, 
        smt.article, 
        smt.old_article, 
        smt.priority 
      FROM 
        inventory_smart.product_supersession_mapping smt
      WHERE smt.article = '''||article||'''
      GROUP BY 1, 2, 3, 4
      )

      UNION ALL
	   (
      SELECT 
        ssp.store, 
        smt.article, 
        smt.old_article, 
        smt.priority
      FROM
        inventory_smart.product_supersession_mapping smt
      INNER JOIN inventory_smart.product_supersession_store_priority ssp USING (ps_code)
      WHERE smt.article = '''||article||'''
      GROUP BY 1, 2, 3, 4
      )
    ) x
    GROUP BY 1
  ';

  RAISE NOTICE 'v_get_priority_sql %',v_get_priority_sql;
 
  OPEN $1 FOR EXECUTE v_get_priority_sql;
    perform  global.sp_log(v_gen_random_uuid,'inventory_smart.product_supersession_get_priority', 'Before Return',v_get_priority_sql,jsonb_build_object('article', $2));
  RETURN $1;
END
$function$
;
