--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_oms_high_level_summary_6 runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:MTP-91512_2
--comment: Added view_by_allowed_values parameter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary(refcursor, jsonb, jsonb, text);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary(refcursor, jsonb, jsonb, text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_high_level_summary(input refcursor, jsonb, jsonb, hierarchy text, view_by_allowed_values jsonb DEFAULT '[]'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                  text:='';
  v_high_level_summary_sql  text:='';
  v_search_cls text := '';
  v_limit_cls text := '';
  search_json jsonb:= '{}'; 
  limit_json jsonb:= '{}';
begin
  v_pa_sql := inventory_smart.form_main_table_filters(
    'ph_master',
    $2
  );
  v_pa_sql := REPLACE(v_pa_sql, 'style', 'paf.style');

  search_json = $3;
     if $3 <> '{}' and  $3 -> 'limit' is not null then
        -- Extract the 'limit' object
        limit_json := $3 -> 'limit';
        search_json := search_json - 'limit';
        v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json)) ;
      end if;

  v_search_cls := global.form_table_query(search_json);

  v_high_level_summary_sql := '
  WITH cte1 AS (
	select
          *
        from (
		SELECT
		    paf.' || hierarchy || ',
		    paf.l1_name AS dc_or_channel,
		    COUNT(distinct paf.style) AS eligible_styles,
		    COUNT(distinct oor.style) AS recom_styles
		FROM
		(select * from "global".product_attributes_filter  where  ordering=''Y'') paf
		 left join 
		(select product_code, style from inventory_smart.oms_orders_recommended ) oor
		on oor.product_code = paf.product_code
    	' || v_pa_sql || '
		GROUP BY
		    paf.' || hierarchy || ', paf.l1_name
		) X ' || v_search_cls || '
	)

		,cte2 AS (
					SELECT DISTINCT ' || hierarchy || '
					FROM cte1
					ORDER BY ' || hierarchy || ' 
					'|| v_limit_cls || ' 
		)

		,cte3 AS (
			select
		          *
		        from (
				SELECT
				    paf.' || hierarchy || ',
				    ''-'' AS dc_or_channel,
				    COUNT(distinct paf.style) AS eligible_styles,
				    COUNT(distinct oor.style) AS recom_styles
				FROM
				(select * from "global".product_attributes_filter  where  ordering=''Y'') paf
				 left join 
				(select product_code, style from inventory_smart.oms_orders_recommended ) oor
				on oor.product_code = paf.product_code
		    	' || v_pa_sql || '
				GROUP BY
				paf.' || hierarchy || '
				) X ' || v_search_cls || '
		)

		SELECT cte1.*
		FROM
		(select * from cte1 union all select * from cte3) as cte1
		JOIN cte2 ON cte1.' || hierarchy || ' = cte2.' || hierarchy ;

   raise notice 'v_high_level_summary_sql %',v_high_level_summary_sql;
   open $1 for execute v_high_level_summary_sql;
   RETURN v_high_level_summary_sql;
 end
 $function$
;