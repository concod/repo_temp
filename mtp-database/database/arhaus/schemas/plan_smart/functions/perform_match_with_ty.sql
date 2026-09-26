--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:perform_match_with_ty_chg8 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-57375
--comment:  fixed the issue for perform_match_with_ty
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.perform_match_with_ty(p_kpis_to_copy text[], kpis_to_calculate jsonb, p_from_plan_code integer, p_to_plan_code integer, p_from_version integer, p_plan_type character varying);
CREATE OR REPLACE FUNCTION plan_smart.perform_match_with_ty(p_kpis_to_copy text[], kpis_to_calculate jsonb, p_from_plan_code integer, p_to_plan_code integer, p_from_version integer, p_plan_type character varying DEFAULT 'SALES'::character varying)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
 /*
------------------------------------
|Function to copy compatible plans |
-------------------------------------------------------------------------------------------------
|to_plan_code |p_from_plan_code
-------------------------------------------------------------------------------------------------
|SP           |SP   --> copy from plan modifications into to plan modications
-------------------------------------------------------------------------------------------------
|wp           |SP   --> copy from plan modifications into working plan
-------------------------------------------------------------------------------------------------
|SP           |WP   --> no need to copy anything, just delete associated plan modification data 
-------------------------------------------------------------------------------------------------
|SP           |OP   --> delete from plan modications and re-insert plan modifications
-------------------------------------------------------------------------------------------------
|WP           |OP   --> delete from master plan table and insert into master plan table from final
-------------------------------------------------------------------------------------------------

p_from_plan_code to be sent as null when copying from final plans versions

*/
  
 
declare
  v_from_status             int;
  v_to_classes              text;
  v_to_weeks                text;
  v_weeks                   integer[];
  v_to_channels             text;
  v_to_status               int;
  v_to_l0_name              text;
  v_to_l1_name              text;
  v_to_l2_name              text;
  v_to_l3_name              text;
  v_sql                     text;
  v_return                  bool:= false;
  v_from_partition          text:='plan_smart.plan_modifications_'||p_from_plan_code;
  v_to_partition            text:='plan_smart.plan_modifications_'||p_to_plan_code;
  v_kpi_str                 text;
  v_kpi_str_set             text;
  v_kpi_str_set_final       text;
  v_edit_from               text;
  v_last_actualised_week    int;
  v_calc_cols_formula       text;
  v_calc_cols_formula_final text;
  v_product_filters         text;
  v_to_hierarchy_codes      text;
  v_plan_version_cd         text;
  v_affected_rows         int:=0; 
  i  record;
  j  record;
  v_kpis_in_calulated_kpi  text[];
  v_calulated_kpi_value    text;
  v_kpi                    text;
   v_user_code             int;
begin
	
 select 
   user_code
 into
   v_user_code
 from
  "global".user_master;
 
  select 
    status
  into
    v_from_status
  from
    plan_smart.vw_plan_master 
  where
    plan_code = p_from_plan_code
  and
    is_deleted = false;
   
   raise notice 'v_from_status:%', v_from_status;

  select 
    channels,
    l0_name,
    l1_name,
    l2_name,
    l3_name,
    weeks,
    status
  into
    v_to_channels,
    v_to_l0_name,
    v_to_l1_name,
    v_to_l2_name,
    v_to_l3_name,
    v_to_weeks,
    v_to_status
  from
    plan_smart.vw_plan_master 
  where
    plan_code = p_to_plan_code
  and
    is_deleted = false;
   
    raise notice 'v_to_status:%', v_to_status;
   
   
  v_calc_cols_formula := ''; 
  v_calc_cols_formula_final := '';
  for i in (select key, value from jsonb_each_text(kpis_to_calculate::jsonb))
  loop
      v_kpis_in_calulated_kpi := array(select distinct  unnest(regexp_matches(i.value, 'kpi\d+', 'g')));
      raise notice 'v_kpis_in_calulate_kpi : %',v_kpis_in_calulated_kpi;
      v_calulated_kpi_value := i.value;

      foreach v_kpi in array v_kpis_in_calulated_kpi
      loop
        if  array[v_kpi]::text[] <@ p_kpis_to_copy
        then
          v_calulated_kpi_value := replace(v_calulated_kpi_value, v_kpi, 'src.'|| v_kpi );
          --raise notice 'src - v_calulated_kpi_value: %',v_calulated_kpi_value;     
        else
          if v_to_status in (2,3)
          then
            v_calulated_kpi_value := replace(v_calulated_kpi_value, v_kpi, v_to_partition||'.'|| v_kpi);
           
          else
             v_calulated_kpi_value := replace(v_calulated_kpi_value, v_kpi, 'tgt.'|| v_kpi);

          end if;
        raise notice 'tgt - v_calulated_kpi_value: %',v_calulated_kpi_value;
        end if;
      end loop;
      if v_calc_cols_formula is not null 
       then
          v_calc_cols_formula := v_calc_cols_formula || ',' || (i.key || ' = ' || v_calulated_kpi_value);
          v_calc_cols_formula_final := v_calc_cols_formula_final || ',' || (i.key || ' = ' || v_calulated_kpi_value);
      else
          v_calc_cols_formula := ' ';
          v_calc_cols_formula_final := ' ';
      end if;
      raise notice 'v_calc_cols_formula : %', v_calc_cols_formula;
      raise notice 'v_calc_cols_formula_final : %', v_calc_cols_formula_final;
      raise notice 'v_calulated_kpi_value : %', v_calulated_kpi_value;
   end loop;

/*  if v_calc_cols_formula is not null 
  then
    v_calc_cols_formula := ','|| v_calc_cols_formula;
    v_calc_cols_formula_final := ','|| v_calc_cols_formula_final;
  else
    v_calc_cols_formula := ' ';
    v_calc_cols_formula_final := ' ';
  end if;*/
 
  select
    string_agg('kpi'||kpino||' = src.kpi'||kpino, ' , ') as kpi_str_set,
    string_agg('kpi'||kpino||' = excluded.kpi'||kpino, ' , ') as kpi_str_set_final
  into
    v_kpi_str_set,
    v_kpi_str_set_final
  from
    generate_series(1,250) kpino
  where
    'kpi' || kpino = ANY(p_kpis_to_copy);
   
  select
    string_agg('kpi'||kpino, ',') as kpi_str
  into
    v_kpi_str
  from
    generate_series(1,250) kpino;   
  
  select (attribute_value -> 'value')::int 
    into v_last_actualised_week
    from "global".default_attributes
   where attribute_type  = 'actual_refresh_min_week';
  
  raise notice 'v_last_actualised_week=%',v_last_actualised_week;
 
  if v_to_status in (2,3) and v_from_status in (2,3)
  then
    select
      array_agg(distinct current_week)
    into
      v_weeks
    from
      plan_smart.plan_modifications pm
    where
      plan_code = p_from_plan_code;
  
    if v_weeks is not null then 
      v_product_filters := format( 
 	  '{"l0_name": [{"type": "list", "operator": "in", "values": [%s]}], 
        "l1_name": [{"type": "list", "operator": "in", "values": [%s]}],
        "l2_name": [{"type": "list", "operator": "in", "values": [%s]}],
        "l3_name": [{"type": "list", "operator": "in", "values": [%s]}]
       }'
         ,replace(replace(v_to_l0_name, '{', ''), '}', '')
         ,replace(replace(v_to_l1_name, '{', ''), '}', '')
         ,replace(replace(v_to_l2_name, '{', ''), '}', '')
         ,replace(replace(v_to_l3_name, '{', ''), '}', '')
      );
     
      raise notice 'v_product_filters=%',v_product_filters;
      raise notice 'v_weeks=%',v_weeks;
   
      perform plan_smart.record_plan_modifications
      (p_plan_code       => p_to_plan_code,
       p_product_filters => v_product_filters::jsonb,
       p_weeks           => v_weeks,
       p_user            => v_user_code::int
      );
    end if;
    
    v_sql := format(
    'update %s
        set %s
       from %s src
      where %s.channel = src.channel
        and %s."class" = src."class"
        and %s.hierarchy_code = src.hierarchy_code
        and %s.current_week = src.current_week %s'
    ,v_to_partition
    ,v_kpi_str_set||v_calc_cols_formula
    ,v_from_partition
    ,v_to_partition
    ,v_to_partition
    ,v_to_partition
    ,v_to_partition
    ,case when v_to_status = 3 then 'and '||v_to_partition||'.current_week > '||v_last_actualised_week else '' end);
   
    raise notice '%', v_sql;
    execute v_sql;
    GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
  end if;
 
  if v_to_status in (0,4) and v_from_status in (2,3)
  then
    for i in (select distinct plan_table
                from plan_smart.query_source_mappings
               where plan_status = v_to_status
                 and plan_type   = p_plan_type
             )
    loop
      for j in (select distinct i.plan_table||'_'||
                       lower(regexp_replace(channel, '[ /.-]', '', 'g'))||'_'||current_week::text as part_name
                 from  plan_smart.plan_modifications
                where  plan_code = p_from_plan_code
               )
      loop
	    
	    if v_to_status = 0
	    then
          v_sql := 'update '||j.part_name||' tgt
                     set '||v_kpi_str_set||v_calc_cols_formula||'
                    from (
                          select channel,class, current_week, hierarchy_code,'||v_kpi_str||'
                            from plan_smart.plan_modifications 
                           where plan_code='||p_from_plan_code||'
                         ) src
                    where  tgt.channel        = src.channel 
                      and  tgt.class          = src.class
                      and  tgt.hierarchy_code = src.hierarchy_code 
                      and  tgt.current_week   = src.current_week';
        
        elsif v_to_status = 4
        then
       
          v_sql := 'update '||j.part_name||' tgt
                     set '||v_kpi_str_set||v_calc_cols_formula||'
                    from (
                          select channel,class, current_week, hierarchy_code,'||v_kpi_str||'
                            from plan_smart.plan_modifications 
                           where plan_code='||p_from_plan_code||'
                         ) src
                    where  tgt.channel        = src.channel 
                      and  tgt.class          = src.class
                      and  tgt.hierarchy_code = src.hierarchy_code 
                      and  tgt.current_week   = src.current_week
                      and  tgt.current_week   >'||v_last_actualised_week;
        end if;
       
        raise notice '%', v_sql;
        execute v_sql;
        GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
      end loop;
    end loop;  
  end if;
 
  if v_to_status in (2,3) and v_from_status in (0,4)
  then
    v_sql := 'delete from '||v_to_partition;
    raise notice '%', v_sql;
    execute v_sql;    
  end if;
  
  if p_from_version = 1
  then
    v_plan_version_cd = 'OP';
  elsif p_from_version = 5
  then
    v_plan_version_cd = 'LF';
  end if;
 
  if v_to_status in (2,3) and v_from_status is null
  then
    if v_to_status = 2 
    then
      v_edit_from := '''OP''';
    elsif v_to_status = 3
    then
      v_edit_from := '''LF''';
    end if;
   
    for i in (select distinct plan_table,product_hierarchy_filter_level
                from plan_smart.query_source_mappings qsm
               where plan_status = v_to_status
                 and plan_type = p_plan_type
             )
    loop
	  select '{'||string_agg(distinct hierarchy_code::text,',')||'}'
	  into v_to_hierarchy_codes
	  from plan_smart.product_hierarchies_filter 
	  where l0_name = ANY(select unnest(l0_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_to_plan_code)
	  and l1_name = ANY(select unnest(l1_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_to_plan_code)
	  and l2_name = ANY(select unnest(l2_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_to_plan_code)
	  and l3_name = ANY(select unnest(l3_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_to_plan_code)
      and level = i.product_hierarchy_filter_level;
     
      v_sql :=   
       'insert into '||v_to_partition||'
        select 
           '||p_to_plan_code||' as plan_code,
           channel,
 		   class,
 	       current_week,
           hierarchy_code,'||
			v_kpi_str||',
            '||v_edit_from||'
        from '||replace(i.plan_table,split_part(split_part(i.plan_table,'.',2),'_',1),v_plan_version_cd)||'
        where channel = any('''||v_to_channels||''')
        and class = any('''||v_to_l3_name||''')
        and hierarchy_code = any('''||v_to_hierarchy_codes||''')
        and current_week = any('''||v_to_weeks||''')
        on conflict ON CONSTRAINT plan_modifications_'||p_to_plan_code||'_pkey'||' do update
        set '||v_kpi_str_set_final||REPLACE(REPLACE(v_calc_cols_formula_final, 'tgt', 'plan_modifications_' || p_to_plan_code), 'src', 'excluded'); 
       
      raise notice '%', v_sql;
      execute v_sql;
      GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
    end loop;
  end if;

  if v_to_status in (0,4,9) and v_from_status is null
  then
    for i in (select distinct plan_table,product_hierarchy_filter_level
                from plan_smart.query_source_mappings qsm
               where plan_status = v_to_status
                 and plan_type = p_plan_type
             )
    loop
	  select '{'||string_agg(distinct hierarchy_code::text,',')||'}'
	  into v_to_hierarchy_codes
	  from plan_smart.product_hierarchies_filter 
	  where l0_name = ANY(select unnest(l0_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_to_plan_code)
	  and l1_name = ANY(select unnest(l1_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_to_plan_code)
	  and l2_name = ANY(select unnest(l2_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_to_plan_code)
	  and l3_name = ANY(select unnest(l3_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_to_plan_code)
      and level = i.product_hierarchy_filter_level;
     
	  if v_to_status = 4 
	  then
	    v_sql :=format(
	     'select ''{''|| string_agg(week::text,'','') ||''}''::text
          from (select unnest(''%s''::int[]) as week) tab
          where week > %s'
         ,v_to_weeks
         ,v_last_actualised_week
         );
        raise notice 'sql=%',v_sql;
        execute v_sql into v_to_weeks;
       
      end if;

    v_sql :=   
       'insert into '||i.plan_table||' 
        select
           channel,
 		   class,
 	       current_week,
           hierarchy_code,'||
		   v_kpi_str||'
         from '||replace(i.plan_table,split_part(split_part(i.plan_table,'.',2),'_',1),v_plan_version_cd)||'
        where channel = any('''||v_to_channels||''')
          and class = any('''||v_to_l3_name||''')
          and hierarchy_code = any('''||v_to_hierarchy_codes||''')
          and current_week = any('''||v_to_weeks||''')
        on conflict ON CONSTRAINT pk_'||split_part(i.plan_table,'.',2)||' do update
        set '||v_kpi_str_set_final||REPLACE(REPLACE(v_calc_cols_formula_final, 'tgt', i.plan_table), 'src', 'excluded'); 

      raise notice '%', v_sql;
      execute v_sql;
      GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
    end loop;
  end if;
  return v_affected_rows;
end
$function$
;
