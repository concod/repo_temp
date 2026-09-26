--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:get_plans_by_its_dims runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-23229
--comment: initial changeset for get_plans_by_its_dims
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_plans_by_its_dims(p_refcursor refcursor, p_channel text, p_product_filter jsonb, p_weeks integer[], p_plan_status integer[]);
CREATE OR REPLACE FUNCTION plan_smart.get_plans_by_its_dims(p_refcursor refcursor, p_channel text, p_product_filter jsonb, p_weeks integer[] ,p_plan_status integer[])
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_prod_filter_cols        text;
  v_prod_filter_cols_filter text:='';
  v_sql                     text;
  i                         record;
  ver                       int;
  ver_sum                   int:=0;
begin
  select
    string_agg(key ||'::text[]', ' , ') AS prod_filter_cols
  into
    v_prod_filter_cols
  from
    jsonb_each_text(p_product_filter) ;
  
  for i in (select
              a.key as col_name,
              string_agg(a.val,',') as val ,
              row_number() over(order by a.key) as ver
            from
              (select
                 key,
                 jsonb_array_elements(((jsonb_array_elements(value::jsonb))->>'values')::jsonb)::text as val
               from
                 jsonb_each_text(p_product_filter::jsonb) 
              ) a
            group by
              a.key
            )
  loop
	ver_sum = i.ver + ver_sum;
    if ver_sum = i.ver
    then
      v_prod_filter_cols_filter:= ' and '||i.col_name||' && ''{'||i.val||'}''::text[] ';
    elsif ver_sum > i.ver
    then
      v_prod_filter_cols_filter := v_prod_filter_cols_filter||' and '||i.col_name||' && ''{'||i.val||'}''::text[] ';
    end if;
  end loop;
  
  raise notice 'v_prod_filter_cols_filter:%', v_prod_filter_cols_filter;
  v_sql := format('
    select
      array_agg(plan_code) as plan_codes 
    from 
      (select
	     plan_code,
         channel,
         %s,
	     weeks::int[]
       from
	     plan_smart.vw_plan_master
       where
         status = ANY(%L)
      ) as plans
    where
      plans.channel = %L
    and
      plans.weeks && %L 
    %s'
    ,v_prod_filter_cols
    ,p_plan_status
    ,p_channel
    ,p_weeks
    ,v_prod_filter_cols_filter
    );
  raise notice '%', v_sql;
  OPEN $1 FOR execute v_sql;
  return $1;
END;
 $function$
;
