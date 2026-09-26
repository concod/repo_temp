--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:get_corporate_otb_reports_chg5 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-41228
--comment:  Implement Business Unit check while fetching product hierarchy codes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_corporate_otb_reports(p_refcursor refcursor, p_formula_string character varying, p_product_filter jsonb, p_channels text[], p_weeks integer[], p_plan_version integer[], p_plan_code integer);
CREATE OR REPLACE FUNCTION plan_smart.get_corporate_otb_reports(p_refcursor refcursor, p_formula_string character varying, p_product_filter jsonb, p_channels text[], p_weeks integer[], p_plan_version integer[], p_plan_code integer DEFAULT NULL::integer, p_group_by text[] DEFAULT '{current_week}'::text[], p_grouping_set boolean DEFAULT false)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

declare
 v_select_clause   text := '';
 v_where_clause    text := '';    
 v_group_by_clause text := '';
 v_order_by_clause text := '';
 v_level_id        int4;
 v_table_name      text;
 v_query_combine   text   := '';
 v_query_filter    text   := '';
 v_hierarchy_code_list text[];
 v_phf_code_sql    text;
 ver               int;
 ver_sum           int:=0;
 v_sql             text;
 cur_sql text;
 v_grouping_sets_clause text := '';
 v_kpi_str         text;
 v_prod_filter_cols_filter text:='';
 i                 record;
begin
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
      v_prod_filter_cols_filter:= ' and '||i.col_name||' = ANY(''{'||i.val||'}''::text[]) ';
    elsif ver_sum > i.ver
    then
      v_prod_filter_cols_filter := v_prod_filter_cols_filter||' and '||i.col_name||' = ANY(''{'||i.val||'}''::text[]) ';
    end if;
  end loop;
  
 raise notice 'v_prod_filter_cols_filter:%', v_prod_filter_cols_filter;
 
 ver:=null;
 ver_sum=0;	
	
 for ver in (select unnest(p_plan_version) as vesion)
 loop
  ver_sum = ver + ver_sum; 
  select
    plan_table_text,
    product_hierarchy_filter_level_id
  into
    v_table_name,
    v_level_id
  from
    -- p_query_level is hardcoded to 1 
    -- for master plan KPI listing to aggregate on closest source of truth
    plan_smart.get_pg_query_source(1,ver); 

  if ver in (2,3) and p_plan_code is not null
  then
    select string_agg(kpi,',') as kpi_str 
    into v_kpi_str
    from (select 'coalesce(pm.kpi'||kpino||',p.kpi'||kpino||') as kpi'||kpino as kpi
            from generate_series(1,250) kpino 
         ) a;
        
    v_table_name :=format( 
       '(select 
          p.channel,
 	      p.hierarchy_code,
          p.current_week,
          p.class,
          %s
      from 
          %s p
      left join 
          plan_smart.plan_modifications_%s pm
      on
          pm.current_week = p.current_week
      and 
 	      pm.hierarchy_code  = p.hierarchy_code
 	    and
 	      pm.channel = p.channel
 	    and 
 	      pm."class" = p."class")'
        ,v_kpi_str
        ,v_table_name
        ,p_plan_code::text
        );
    raise notice 'SP Query : %s', v_table_name;
  end if;
   
  if p_product_filter !='{}' and ver_sum = ver
  then
  cur_sql:='current_week, ';
    v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filter);
    v_phf_code_sql := 'select array_agg(hierarchy_code) 
                         from ('||v_query_filter|| ' 
                                 and level = '||v_level_id||' 
                                 and business_unit @> plan_smart.get_bu(''{' || array_to_string(p_channels, ',') || '}'')
                              ) phf';
    raise notice '%', v_phf_code_sql;
    execute v_phf_code_sql into v_hierarchy_code_list;
  end if ;
  if  p_product_filter ='{}' then
    cur_sql:='channel,current_week ';
  end if ;
  	
  if ver_sum = ver
  then
    select
      -- Build the Select clause by concatenating the column names 
      cur_sql||coalesce(string_agg(key , ' , '),'') AS select_clause,
      -- Build the WHERE clause by concatenating the column names and values
      --'WHERE ' || string_agg(key || ' = ' ||''''||value||'''', ' AND ') AS where_clause,
      -- Build the GROUP BY clause by concatenating the column names
      coalesce('GROUP BY current_week, ' || string_agg(key, ', ') , 'GROUP BY (current_week)') AS group_by_clause,
      coalesce(string_agg(key , ' , ' order by key desc), ' ') ||', current_week , plan_version' AS order_by_clause
    into
      v_select_clause,
      v_group_by_clause,
      v_order_by_clause
    from jsonb_each_text(p_product_filter) ;
   
   select * 
     into v_grouping_sets_clause 
     from plan_smart.generate_grouping_sets(p_group_by::text[],p_grouping_set::bool);
   
  end if;      
  /*select
    -- Build the WHERE clause by concatenating the column names and values
    'WHERE ' || string_agg(key || ' = ' ||''''||value||'''', ' AND ') AS where_clause
  into
    v_where_clause
  from jsonb_each_text(p_product_filter) where value <> '';*/
 

  v_query_combine :=format('
    select
      %L as plan_version,
      %s,
      %s
    from 
      %s p
    join
      plan_smart.product_hierarchies_filter phf
    on 
      p.hierarchy_code = phf.hierarchy_code
    %s
    where
      current_week = ANY(%L)'
    ,(case when ver = 0 then 'WP'
	       when ver = 1 then 'OP'
           when ver = 2 then 'SP'
           when ver = 3 then 'SF'
           when ver = 4 then 'WF' 
           when ver = 5 then 'LF'
      end
     )
    ,array_to_string(p_group_by::text[],',')--v_select_clause
    ,p_formula_string
    ,v_table_name
    ,v_prod_filter_cols_filter
    ,p_weeks);
  
  if cardinality(p_channels) != 0
  then
    v_query_combine := format('%s
  and
    channel = ANY(%L)',v_query_combine,p_channels);
  end if; 
 		
  if v_hierarchy_code_list is not null
  then
    v_query_combine := format('%s
  and
    p.hierarchy_code = ANY(%L)',v_query_combine,v_hierarchy_code_list);
  end if;
 
  v_query_combine := format('%s
    %s',v_query_combine,v_grouping_sets_clause);
  
  if ver_sum = ver
  then
    v_sql := v_query_combine;
  elsif ver_sum > ver
  then
    v_sql := v_sql||' union all '||v_query_combine;
  end if;
 
 end loop;
 v_sql := format('
  select *
   from (%s
  ) complete_vw
 ',v_sql);


 raise notice '%', v_sql;
 
 OPEN $1 FOR execute v_sql;
 RETURN $1;   
end
$function$
;
