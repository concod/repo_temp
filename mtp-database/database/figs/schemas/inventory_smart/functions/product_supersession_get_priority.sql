--liquibase formatted sql
--changeset shreeraksha.n@impactanalytics.co:product_supersession_get_priority runOnChange:true stripComments:false splitStatements:false context:MTP-106946 labels:MTP-106946
--comment: Create product supersession priority function for figs client
DROP FUNCTION IF EXISTS inventory_smart.product_supersession_get_priority(refcursor, text);

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
      ARRAY_AGG(x.new_article) new_articles,
      ARRAY_AGG(x.old_article) old_article,
      ARRAY_AGG(x.priority) priority
    FROM (
      (
      SELECT 
        ''default'' as store, 
        smt.article AS new_article,  -- Changed: smt.article (not smt.new_article)
        smt.old_article, 
        COALESCE(smt.priority, 1) AS priority  -- Added COALESCE for NULL handling
      FROM 
        inventory_smart.product_supersession_mapping smt
      WHERE smt.article = '''||article||'''
      GROUP BY 1, 2, 3, 4
      )

      UNION ALL
	   (
      SELECT 
        ssp.store, 
        smt.article AS new_article,  -- Changed: smt.article (not smt.new_article)
        smt.old_article, 
        COALESCE(smt.priority, 1) AS priority  -- Added COALESCE for NULL handling
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