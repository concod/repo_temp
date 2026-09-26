--liquibase formatted sql
--changeset saran.srirama@impactanalytics.co:copy_compatible_plan_ty_data_chg4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-34839
--comment:  fixed copy plan for all the plan status
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.copy_compatible_plan_ty_data(p_from_plan_code integer, p_to_plan_code integer, p_plan_type character varying, p_plan_version character varying);
CREATE OR REPLACE FUNCTION plan_smart.copy_compatible_plan_ty_data(p_from_plan_code integer, p_to_plan_code integer, p_plan_type character varying DEFAULT 'SALES'::character varying, p_plan_version character varying DEFAULT NULL::character varying)
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
  v_affected_rows  int:=0;
  v_from_channel            text;
  v_from_classes            text;
  v_from_weeks              text;
  v_from_status             int;
  v_to_channel              text;
  v_to_classes              text;
  v_to_weeks                text;
  v_weeks                   integer[];               
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
  v_columns_to_be_copied    text[];
  v_product_filters         text;
  v_to_hierarchy_codes      text;
  v_from_business_unit      text;
  v_to_business_unit        text;
  i  record;
  j  record;
  _channel text;
begin
 
  select 
    channel,
    l2_name,
    weeks,
    status,
    business_unit
  into
    v_from_channel, 
    v_from_classes,
    v_from_weeks,
    v_from_status,
    v_from_business_unit
  from
    plan_smart.vw_plan_master 
  where
    plan_code = p_from_plan_code
  and
    is_deleted = false;

  select 
    channel,
    l0_name,
    l1_name,
    l2_name,
    l3_name,
    weeks,
    status,
    business_unit
  into
    v_to_channel,
    v_to_l0_name,
    v_to_l1_name,
    v_to_l2_name,
    v_to_l3_name,
    v_to_weeks,
    v_to_status,
    v_to_business_unit
  from
    plan_smart.vw_plan_master 
  where
    plan_code = p_to_plan_code
  and
    is_deleted = false;
  
  if v_to_business_unit = 'Wholesale' 
  then
	  if v_to_status in (0,1,2)
	  then
	    select array_agg(plan_tbl_col_name)::text
	    into v_columns_to_be_copied
	    from plan_smart.app_metrics_config amc 
	    where wholesale_pre_match_with;
	    
	    select string_agg( plan_tbl_col_name||' = '||replace(wholesale_pre_cal_fml,'kpi','src.kpi'),' , ') as calc_cols_formula
	          ,string_agg( plan_tbl_col_name||' = '||replace(wholesale_pre_cal_fml,'kpi','excluded.kpi'),' , ') as v_calc_cols_formula_final
	    into v_calc_cols_formula,v_calc_cols_formula_final
	    from plan_smart.app_metrics_config amc 
	    where wholesale_pre_cal;
	   
	  elsif v_to_status in (3,4,5)
	  then
	    select array_agg(plan_tbl_col_name)::text
	    into v_columns_to_be_copied
	    from plan_smart.app_metrics_config amc 
	    where wholesale_in_match_with;
	    
	    select string_agg( plan_tbl_col_name||' = '||replace(wholesale_in_cal_fml,'kpi','src.kpi'),' , ') as calc_cols_formula
	          ,string_agg( plan_tbl_col_name||' = '||replace(wholesale_in_cal_fml,'kpi','excluded.kpi'),' , ') as v_calc_cols_formula_final
	    into v_calc_cols_formula,v_calc_cols_formula_final
	    from plan_smart.app_metrics_config amc 
	    where wholesale_in_cal;  
	  end if;
  elsif v_to_business_unit = 'CHESTER_DC' 
  then
	  if v_to_status in (0,1,2)
	  then
	    select array_agg(plan_tbl_col_name)::text
	    into v_columns_to_be_copied
	    from plan_smart.app_metrics_config amc 
	    where chester_pre_match_with;
	    
	    select string_agg( plan_tbl_col_name||' = '||replace(chester_pre_cal_fml,'kpi','src.kpi'),' , ') as calc_cols_formula
	          ,string_agg( plan_tbl_col_name||' = '||replace(chester_pre_cal_fml,'kpi','excluded.kpi'),' , ') as v_calc_cols_formula_final
	    into v_calc_cols_formula,v_calc_cols_formula_final
	    from plan_smart.app_metrics_config amc 
	    where chester_pre_cal;
	   
	  elsif v_to_status in (3,4,5)
	  then
	    select array_agg(plan_tbl_col_name)::text
	    into v_columns_to_be_copied
	    from plan_smart.app_metrics_config amc 
	    where chester_in_match_with;
	    
	    select string_agg( plan_tbl_col_name||' = '||replace(chester_in_cal_fml,'kpi','src.kpi'),' , ') as calc_cols_formula
	          ,string_agg( plan_tbl_col_name||' = '||replace(chester_in_cal_fml,'kpi','excluded.kpi'),' , ') as v_calc_cols_formula_final
	    into v_calc_cols_formula,v_calc_cols_formula_final
	    from plan_smart.app_metrics_config amc 
	    where chester_in_cal;  
	  end if;	 
  else
	  if v_to_status in (0,1,2)
	  then
	    select array_agg(plan_tbl_col_name)::text
	    into v_columns_to_be_copied
	    from plan_smart.app_metrics_config amc 
	    where pre_match_with;
	    
	    select string_agg( plan_tbl_col_name||' = '||replace(pre_cal_fml,'kpi','src.kpi'),' , ') as calc_cols_formula
	          ,string_agg( plan_tbl_col_name||' = '||replace(pre_cal_fml,'kpi','excluded.kpi'),' , ') as v_calc_cols_formula_final
	    into v_calc_cols_formula,v_calc_cols_formula_final
	    from plan_smart.app_metrics_config amc 
	    where pre_cal;
	   
	  elsif v_to_status in (3,4,5)
	  then
	    select array_agg(plan_tbl_col_name)::text
	    into v_columns_to_be_copied
	    from plan_smart.app_metrics_config amc 
	    where in_match_with;
	    
	    select string_agg( plan_tbl_col_name||' = '||replace(in_cal_fml,'kpi','src.kpi'),' , ') as calc_cols_formula
	          ,string_agg( plan_tbl_col_name||' = '||replace(in_cal_fml,'kpi','excluded.kpi'),' , ') as v_calc_cols_formula_final
	    into v_calc_cols_formula,v_calc_cols_formula_final
	    from plan_smart.app_metrics_config amc 
	    where in_cal;  
	  end if;
 end if;

  select
    string_agg('kpi'||kpino||' = src.kpi'||kpino, ' , ') as kpi_str_set,
    string_agg('kpi'||kpino||' = excluded.kpi'||kpino, ' , ') as kpi_str_set_final
  into
    v_kpi_str_set,
    v_kpi_str_set_final
  from
    generate_series(1,250) kpino
  where
    'kpi' || kpino = ANY(v_columns_to_be_copied);
   
  select
    string_agg('kpi'||kpino, ',') as kpi_str
  into
    v_kpi_str
  from
    generate_series(1,250) kpino;   
  
/*  select
    array_to_string(array_agg(key||'='||value)::text[], ',')::text as calc_cols_formula
  into
    v_calc_cols_formula
  from
    json_each_text(p_columns_to_be_calc);*/
  
  
  select (attribute_value -> 'value')::int 
    into v_last_actualised_week
    from "global".default_attributes
   where attribute_type  = 'actual_refresh_min_week';
  
  raise notice 'v_last_actualised_week=%',v_last_actualised_week;
 
  if v_calc_cols_formula is not null
  then 
    v_calc_cols_formula := ','||v_calc_cols_formula;
  else
    v_calc_cols_formula := ' ';
  end if;
 
  raise notice 'v_calc_cols_formula : %', v_calc_cols_formula;
 
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
       p_weeks           => v_weeks
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
          v_sql := 'update '||j.part_name||' 
                     set '||v_kpi_str_set||v_calc_cols_formula||'
                    from (
                          select channel,class, current_week, hierarchy_code,'||v_kpi_str||'
                            from plan_smart.plan_modifications 
                           where plan_code='||p_from_plan_code||'
                         ) src
                    where '||j.part_name||'.channel        = src.channel 
                      and '||j.part_name||'.class          = src.class
                      and '||j.part_name||'.hierarchy_code = src.hierarchy_code 
                      and '||j.part_name||'.current_week   = src.current_week';
        
        elsif v_to_status = 4
        then
       
          v_sql := 'update '||j.part_name||' 
                     set '||v_kpi_str_set||v_calc_cols_formula||'
                    from (
                          select channel,class, current_week, hierarchy_code,'||v_kpi_str||'
                            from plan_smart.plan_modifications 
                           where plan_code='||p_from_plan_code||'
                         ) src
                    where '||j.part_name||'.channel        = src.channel 
                      and '||j.part_name||'.class          = src.class
                      and '||j.part_name||'.hierarchy_code = src.hierarchy_code 
                      and '||j.part_name||'.current_week   = src.current_week
                      and '||j.part_name||'.current_week   >'||v_last_actualised_week;
        end if;
       
        raise notice '%', v_sql;
        execute v_sql;
      end loop;
    end loop;  
  end if;
 
  if v_to_status in (2,3) and v_from_status in (0,4)
  then
    v_sql := 'delete from '||v_to_partition;
    raise notice '%', v_sql;
    execute v_sql;    
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
        from '||replace(i.plan_table,split_part(split_part(i.plan_table,'.',2),'_',1),p_plan_version)||'
        where channel = '''||v_to_channel||'''  
        and class = any('''||v_to_l2_name||''')
        and hierarchy_code = any('''||v_to_hierarchy_codes||''')
        and current_week = any('''||v_to_weeks||''')
        on conflict ON CONSTRAINT plan_modifications_'||p_to_plan_code||'_pkey'||' do update
        set '||v_kpi_str_set_final||case 
	                                  when v_calc_cols_formula_final is not null 
	                                  then ','||v_calc_cols_formula_final
	                                else ' '
	                                end case;
      raise notice '%', v_sql;
      execute v_sql;
    end loop;
  end if;

  if v_to_status in (0,4) and v_from_status is null
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
         from '||replace(i.plan_table,split_part(split_part(i.plan_table,'.',2),'_',1),p_plan_version)||'
        where channel = '''||v_to_channel||'''  
          and class = any('''||v_to_l2_name||''')
          and hierarchy_code = any('''||v_to_hierarchy_codes||''')
          and current_week = any('''||v_to_weeks||''')
        on conflict ON CONSTRAINT pk_'||split_part(i.plan_table,'.',2)||' do update
        set '||v_kpi_str_set_final||case 
	                                  when v_calc_cols_formula_final is not null 
	                                  then ','||v_calc_cols_formula_final
	                                else ' '
	                                end case;

      raise notice '%', v_sql;
      execute v_sql;  
    end loop;
  end if;
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  return v_affected_rows;
end
$function$
;
