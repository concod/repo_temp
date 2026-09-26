--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:perform_match_with_iaf_chg3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-58202
--comment:  updated formula for perform match_with
--rollback: SELECT 1
DROP FUNCTION if exists plan_smart.perform_match_with_iaf(p_kpis_to_copy text[], kpis_to_calculate jsonb, p_from_plan_code integer, p_to_plan_code integer, p_from_version integer, p_plan_type character varying);
CREATE OR REPLACE FUNCTION plan_smart.perform_match_with_iaf(p_kpis_to_copy text[], kpis_to_calculate jsonb, p_from_plan_code integer, p_to_plan_code integer, p_from_version integer, p_plan_type character varying DEFAULT 'SALES'::character varying)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 
declare
  v_to_channels             text;
  v_to_status               int;
  v_to_l0_name              text;
  v_to_l1_name              text;
  v_to_l2_name              text;
  v_to_l3_name              text;
  v_to_weeks                text;
  v_ly_table_name           text;   
  v_sql                     text;
  v_to_partition            text:='plan_smart.plan_modifications_'||p_to_plan_code;
  v_kpi_str_set             text;
  v_last_actualised_week    int;
  v_columns_to_be_copied    text[] := p_kpis_to_copy;
  v_calc_cols_formula       text[];
  v_calc_cols_formula_str   text;
  v_product_filters         text;
  v_to_hierarchy_codes      text;
  v_query                   text;
  v_create_tbl              text;
  v_alter_tbl               text;
  v_drop_tbl                text;
  v_affected_rows         int:=0;
  i  record;
  j  record;
  v_user_code              text;
  v_kpi_string             text;
  v_kpis_in_calulated_kpi  text[];
  v_calulated_kpi_value    text;
  v_kpi                    text;
begin
	
 select 
   user_code
 into
   v_user_code
 from
   "global".user_master;

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
  
  raise notice 'p_to_plan_code = %', p_to_plan_code;
  raise notice 'v_to_channels = %', v_to_channels; 
  raise notice 'v_to_l0_name = %', v_to_l0_name; 
  raise notice 'v_to_l1_name = %', v_to_l1_name; 
  raise notice 'v_to_l2_name = %', v_to_l2_name;
  raise notice 'v_to_l3_name = %', v_to_l2_name;
  raise notice 'v_to_weeks = %', v_to_weeks; 
 
 for i in (select key, value from jsonb_each_text(kpis_to_calculate::jsonb))
  loop
      v_kpis_in_calulated_kpi := array(select distinct unnest(regexp_matches(i.value, 'kpi\d+', 'g')));
      raise notice 'v_kpis_in_calulate_kpi : %',v_kpis_in_calulated_kpi;
      v_calulated_kpi_value := i.value;
      foreach v_kpi in array v_kpis_in_calulated_kpi
      loop
        if  array[v_kpi]::text[] <@ v_columns_to_be_copied
        then
          v_calulated_kpi_value := replace(v_calulated_kpi_value, v_kpi, 'src.'|| v_kpi);
          raise notice 'src - v_calulated_kpi_value: %',v_calulated_kpi_value;     
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
      raise notice 'v_calulated_kpi_value : %', v_calulated_kpi_value;
      v_calc_cols_formula := v_calc_cols_formula || (i.key || ' = ' || v_calulated_kpi_value);
      raise notice 'v_calc_cols_formula : %', v_calc_cols_formula;
  end loop;

 
  select ARRAY(select distinct unnest(v_columns_to_be_copied))
    into v_columns_to_be_copied;
  
  raise notice 'v_columns_to_be_copied : %', v_columns_to_be_copied;  

 
  select
    string_agg('kpi'||kpino||' = src.kpi'||kpino, ' , ') as kpi_str_set
  into
    v_kpi_str_set
  from
    generate_series(1,250) kpino
  where
    'kpi' || kpino = ANY(p_kpis_to_copy);
   
  if v_calc_cols_formula is not null 
  then
    v_calc_cols_formula_str := ','||array_to_string(v_calc_cols_formula,',') ;
  else
    v_calc_cols_formula_str := ' ';
  end if;
 
  raise notice 'v_calc_cols_formula_str = %', v_calc_cols_formula_str; 
 
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
     
     
 raise notice 'v_product_filters = %', v_product_filters; 


  select 
    * 
  into 
    v_query
  from 
    plan_smart.get_iaf_query(p_to_plan_code); 
   
   
   raise notice 'v_query=%',v_query;
   
  raise notice 'ly_temp_tbl_query=%',v_query;
  v_ly_table_name := 'plan_modifs_'||p_to_plan_code::text;
  v_drop_tbl   := 'drop table if exists '||v_ly_table_name;
  v_create_tbl := 'create table '||v_ly_table_name||' as ' ||v_query;
  v_alter_tbl  := 'alter table '||v_ly_table_name||' add constraint pk_'||p_to_plan_code::text||' primary key(channel,class,hierarchy_code,current_week)';
  
  raise notice 'v_drop_tbl=%',v_drop_tbl;
  raise notice 'v_create_tbl=%',v_create_tbl;
  raise notice 'v_alter_tbl=%',v_alter_tbl;
 
  execute v_drop_tbl;
  execute v_create_tbl;
  execute v_alter_tbl;
 
  select (attribute_value -> 'value')::int
    into v_last_actualised_week
    from "global".default_attributes
   where attribute_type  = 'actual_refresh_min_week';
  
  raise notice 'v_last_actualised_week=%',v_last_actualised_week;
  
  if v_to_status in (2,3)
  then    
    raise notice 'v_product_filters=%',v_product_filters;
    raise notice 'p_weeks=%',v_to_weeks;
   
    perform plan_smart.record_plan_modifications
        (p_plan_code       => p_to_plan_code,
         p_product_filters => v_product_filters::jsonb,
         p_weeks           => v_to_weeks::int[],
         p_user            => v_user_code::int
        );
    
    v_sql := format(
    'update %s
        set %s
       from %s src
      where %s.channel = src.channel
        and %s."class" = src."class"
        and %s.hierarchy_code = src.hierarchy_code
        and %s.current_week = src.current_week %s'
    ,v_to_partition
    ,v_kpi_str_set||v_calc_cols_formula_str
    ,v_ly_table_name
    ,v_to_partition
    ,v_to_partition
    ,v_to_partition
    ,v_to_partition
    ,case when v_to_status = 3 then 'and '||v_to_partition||'.current_week > '||v_last_actualised_week else '' end);
   
    raise notice '%', v_sql;
    execute v_sql;
    GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
  end if;
 
  if v_to_status in (0,4,9)
  then
    for i in (select distinct plan_table
                from plan_smart.query_source_mappings
               where plan_status = v_to_status
                 and plan_type   = p_plan_type
             )
    loop
	    if v_to_status = 0
	    then
          v_sql := 'update '||i.plan_table||' tgt
                       set '||v_kpi_str_set||v_calc_cols_formula_str||' 
                      from '||v_ly_table_name||' src
                     where tgt.channel        = src.channel 
                       and tgt.class          = src.class
                       and tgt.hierarchy_code = src.hierarchy_code 
                       and tgt.current_week   = src.current_week';
        
        elsif v_to_status = 4
        then
       
          v_sql := 'update '||i.plan_table||' tgt
                       set '||v_kpi_str_set||v_calc_cols_formula_str ||'
                      from '||v_ly_table_name||' src
                     where  tgt.channel        = src.channel 
                       and  tgt.class          = src.class
                       and  tgt.hierarchy_code = src.hierarchy_code 
                       and  tgt.current_week   = src.current_week
                       and  tgt.current_week   >'||v_last_actualised_week;
                      
                      
          elsif v_to_status = 9
          then
       
          v_sql := 'update '||i.plan_table||' tgt
                       set '||v_kpi_str_set||v_calc_cols_formula_str ||'
                      from '||v_ly_table_name||' src
                     where  tgt.channel        = src.channel 
                       and  tgt.class          = src.class
                       and  tgt.hierarchy_code = src.hierarchy_code 
                       and  tgt.current_week   = src.current_week';

                      
        end if;
       
        raise notice '%', v_sql;
        execute v_sql;
        GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
    end loop;  
  end if;
  execute v_drop_tbl;
  return v_affected_rows;
end
$function$
;
