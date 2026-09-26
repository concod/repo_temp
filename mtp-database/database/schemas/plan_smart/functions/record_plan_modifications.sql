--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:record_plan_modifications_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-25916
--comment: Optimization change record_plan_modifications, removed redundent filter in query and SP to work only for scenario plans
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.record_plan_modifications(p_plan_code integer, p_product_filters jsonb, p_weeks integer[]);
CREATE OR REPLACE FUNCTION plan_smart.record_plan_modifications(p_plan_code integer, p_product_filters jsonb, p_weeks integer[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
 /*   
  Call to API record_plan_modifications : 
 	select plan_smart.record_plan_modifications(
 	719,
 	'{"l0_name": [{"type": "list", "operator": "in", "values": ["Bags"]}]}'::jsonb,
 	'{202340, 202345, 202341}'::integer[]
 	); 
 */
declare
  i                record;
  v_affected_rows  int:=0;
  v_edits_from     text;
  v_channel        text;
  v_classes        text;
  v_plan_status    int4;
  v_plan_type      text;
  v_insert_query   text;
  v_query_filter   text   := '';
  v_kpi_str        text   := '';
  v_plans          int[];
  v_plans_sql      text;
  v_cross_join_cls text:= ' ';
  
begin	
  select string_agg('p.kpi'||kpino, ',') as kpi_str  
    into v_kpi_str
    from generate_series(1,250) kpino ;

  v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filters);
  
  select channel,
         l2_name,
         status,
         case when status = 2 then '''SP'''
              when status = 3 then '''SF'''
              when status = 0 then '''WP'''
              when status = 4 then '''WF'''
         end as edits_from,
         coalesce(plan_type,'SALES')
    into v_channel,
         v_classes,
         v_plan_status,
         v_edits_from,
         v_plan_type
    from plan_smart.vw_plan_master 
   where plan_code = p_plan_code;
  
  raise notice '%', v_channel;
  raise notice '%', v_classes;
  raise notice '%', v_plan_status;
  raise notice '%', v_edits_from;

  for i in (select distinct plan_table ,product_hierarchy_filter_level
              from plan_smart.query_source_mappings
             where plan_status = v_plan_status
               and plan_type = v_plan_type
           )
  loop
    if v_plan_status in (2,3) -- 2: "Scenario Plan", 3: "Scenario Forecast"
    then
      v_insert_query := 
       'insert into plan_smart.plan_modifications '||'
        select '||p_plan_code ||' as plan_code,
          p.channel,
          p.class,
          p.current_week,
          p.hierarchy_code,'
          ||v_kpi_str||','
          ||v_edits_from||'
        from 
         '|| i.plan_table ||' p
 	    inner join (' || (replace(v_query_filter, '"', '')) || ' and level = '||i.product_hierarchy_filter_level||') phf
 	    on p.hierarchy_code = phf.hierarchy_code
        where p.channel = '''||v_channel||''' 
        and p.current_week = any(''{' || array_to_string(p_weeks, ',') || '}'')
        --and p.class = any('''|| v_classes ||''')
        on conflict ON CONSTRAINT pk_plan_modifications do nothing';
      raise notice '%', v_insert_query;
      EXECUTE v_insert_query;
      GET DIAGNOSTICS v_affected_rows = ROW_COUNT;     
    elsif v_plan_status in (0,4)  -- 0: "Working Plan", 4: "Active Forecast"
    then
      v_plans_sql :=
        'select array_agg(plan_code)::int[]
            from plan_smart.vw_plan_master
           where plan_code in
          (select unnest(get_associated_plans_from_filters) as plan_code
           from plan_smart.get_associated_plans_from_filters
                            ('''|| v_channel ||''','||
                             ''''||v_classes ||''','||
                             '''{' || array_to_string(p_weeks, ',') || '}''
                            )
          )
          and is_deleted  = false
          and status = (select case
                                when '||v_plan_status||' = 0 then 2
                                when '||v_plan_status||' = 4 then 3
                               end
                       )' ;
      
      raise notice '%', v_plans_sql;
      EXECUTE v_plans_sql into v_plans;
      raise notice '%', v_plans;
      
      if v_plans is not null 
      then
        raise notice '%', 'v_cross_join_cls';
        v_cross_join_cls :=
        'cross join
          (select unnest(''{' || array_to_string(v_plans, ',') || '}''::int[]) as plan_code
          ) sp';
        raise notice '%', v_cross_join_cls;
        v_insert_query := 
         'insert into plan_smart.plan_modifications '||'
          select sp.plan_code::int,
            p.channel,
            p.class,
            p.current_week,
            p.hierarchy_code,'
            ||v_kpi_str||','
            ||v_edits_from||'
          from 
          '|| i.plan_table ||' p
 	      inner join (' || (replace(v_query_filter, '"', '')) || ' and level = '||i.product_hierarchy_filter_level||') phf
 	      on p.hierarchy_code = phf.hierarchy_code '
          ||v_cross_join_cls||' 
          where p.channel = '''||v_channel||'''
          and p.current_week = any(''{' || array_to_string(p_weeks, ',') || '}'')
          --and p.class = any('''|| v_classes ||''') 
          on conflict ON CONSTRAINT pk_plan_modifications do nothing';
        raise notice '%', v_insert_query;
        EXECUTE v_insert_query;
        GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
      end if;
    end if;
  end loop;
  return v_affected_rows;
end
$function$
;
