--liquibase formatted sql
--changeset kailash.kangne@impactanalytics.co:order_repo_summary_count_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-127541
--comment: Order repo summary count function
--rollback: SELECT 1


DROP FUNCTION IF EXISTS oms.order_repo_summary_count(refcursor, jsonb, jsonb, text, jsonb);

CREATE OR REPLACE FUNCTION oms.order_repo_summary_count(input refcursor, jsonb, jsonb, hierarchy text, view_by_allowed_values jsonb DEFAULT '[]'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                        text:='';
  v_high_level_summary_count_sql  text:='';
 
begin
  v_pa_sql := oms.form_main_table_filters(
    'ph_master',
    $2
  );
  v_pa_sql := REPLACE(v_pa_sql, 'article', 'paf.article');



  v_high_level_summary_count_sql := '
  select
          *
    from (
		SELECT
		    DISTINCT ' || hierarchy || '
		FROM
		(select * from "global".product_attributes_filter) paf
		 left join 
		(select product_code, article, loc_code from oms.oms_orders_recommended) oor
		on oor.product_code = paf.product_code
    INNER JOIN
	      global.distribution_centres dc
	      ON oor.loc_code = dc.linked_store_code
		' || v_pa_sql || '
		GROUP BY
		    ' || hierarchy || ', dc.name
    ) X ' || global.form_table_query($3);

   raise notice 'v_high_level_summary_count_sql %',v_high_level_summary_count_sql;
   open $1 for execute v_high_level_summary_count_sql;
   RETURN v_high_level_summary_count_sql;
 end
 $function$
;
