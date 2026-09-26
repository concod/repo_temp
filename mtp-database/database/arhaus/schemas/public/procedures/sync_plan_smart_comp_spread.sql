--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:sync_plan_smart_comp_spread_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-48528
--comment:  updated l0, l1, l2, l3.
--rollback: SELECT 1
DROP PROCEDURE if exists public.sync_plan_smart_comp_spread();
CREATE OR REPLACE PROCEDURE public.sync_plan_smart_comp_spread()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_plan_smart_comp_spread';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
  v_cls1                    text;
  v_cls2                    text;
  v_cls3                    text;
  v_cls4                    text;
  v_sql_text                text;
  v_constraint_sql          text;
  v_const_tbl_name          text;
  v_constraint_name         text; 
  v_affected_rows           int;
  v_actual_refresh_min_week int;
  v_channel_part            text;
  v_cnt                     int := 0;
  i                         record;
  j                         record;
  v_channel_part_wf         text;
  v_channel_part_wp         text;
  v_channel_part_tp         text;
 begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 	
	  select 
	    'channel,l3_name,current_week,hierarchy_code,' || string_agg(kpis.name, ',') as cls1,
	    'channel,class,current_week,hierarchy_code,' || string_agg(kpis.column_actual_name, ',') as cls2,
	     string_agg(kpis.column_actual_name || ' = excluded.' || kpis.column_actual_name, ',') as cls3,
	     string_agg(kpis.column_actual_name || ' = csl.' || kpis.name, ',') as cls4
	  into 
	    v_cls1, 
	    v_cls2, 
	    v_cls3, 
	    v_cls4
	  from 
	     (    select 
	            distinct tkm.name,ttcm.column_actual_name 
	           from 
	             meta_schema.tb_kpi_config tkc 
	           left join 
	             meta_schema.tb_kpi_master tkm
	           on 
	             tkc.kpi_id = tkm.id  
	           left join 
	             meta_schema.tb_table_columns_mst ttcm
	           on  
	             tkm.column_id = ttcm.id 
	     ) kpis
	right join  
	    (SELECT column_name 
	     FROM information_schema.columns
	     WHERE table_catalog = current_database()
	       AND table_schema = 'public'
	       AND table_name = 'comp_spread_lvl1'
	       AND column_name NOT in ('bucket','comp_flag','l0_name','l1_name','l2_name','l2_name_channel','l3_name','compared_week','l3_name_channel')
	    ) cols ON kpis.name = cols.column_name ;
	

 
  /*select array_agg(distinct channel) , array_agg(distinct compared_week)
  into v_channels,v_weeks
  from public.actual_ly_temp;*/
  /*
  for v_const_tbl_name,v_constraint_name in (
        select 
          key,
          value 
        from 
          jsonb_each_text('{"actual_ly_temp":"pk_actual_ly_temp", "po_oo_committed_table":"pk_po_oo_committed_table"}'::jsonb)
      )
  loop 
    if not exists (select constraint_name 
                     from information_schema.constraint_column_usage 
                    where table_name = v_const_tbl_name  and constraint_name = v_constraint_name) then
      
      v_constraint_sql := 'alter table '||v_const_tbl_name||' add CONSTRAINT pk_'||v_constraint_name||' PRIMARY KEY (channel, current_week, class, hierarchy_code)';        
      execute v_constraint_sql;
    end if;
  end loop;
  */

  select attribute_value->>'value' into v_actual_refresh_min_week 
  from "global".default_attributes;
  
  raise notice '%', v_actual_refresh_min_week;
  
  v_sql_text := 'create index if not exists idx_comp_spread_lvl1 on public.comp_spread_lvl1(channel,current_week)';
  execute v_sql_text;
 
  v_sql_text := 'analyze public.comp_spread_lvl1';
  execute v_sql_text;
  
  for i in (select channel,current_week from public.comp_spread_lvl1
            where current_week > v_actual_refresh_min_week
            group by channel,current_week
			order by channel,current_week)
  loop
	v_channel_part_wf := regexp_replace(i.channel, '[ /.-]', '', 'g');
    raise notice 'step1: %',  v_channel_part_wf;
    
    call plan_smart.create_plan_schema('wf_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    	  
	v_sql_text := format('
    update
      %s wms
    set
      kpi250 = Coalesce(written_comp_spread_perc,0)
    from
      public.comp_spread_lvl1 csl
    where
      csl.channel = %L
    and
      wms.channel = csl.channel
    and
      csl.current_week  = %s
    and
      wms.current_week = csl.current_week 
    and
      wms.class = csl.l3_name
    and
      wms.hierarchy_code = csl.hierarchy_code'
	,'plan_smart.wf_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
	,i.channel
	,i.current_week
    );
    
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
    --GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end loop;
 
  
  for i in (select channel,current_week from public.comp_spread_lvl1
            group by channel,current_week
			order by channel,current_week)
  loop
	v_channel_part_wp := regexp_replace(i.channel, '[ /.-]', '', 'g');
    raise notice 'step1: %',  v_channel_part_wp;
    
    call plan_smart.create_plan_schema('wp_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    	  
	v_sql_text := format('
    update
      %s wps
    set
      kpi250 = Coalesce(written_comp_spread_perc,0)
    from
       public.comp_spread_lvl1 csl
    where
      csl.channel = %L
    and
      wps.channel = csl.channel
    and
      csl.current_week  = %s
    and
      wps.current_week = csl.current_week 
    and
      wps.class = csl.l3_name
    and
      wps.hierarchy_code = csl.hierarchy_code'
	,'plan_smart.wp_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
	,i.channel
	,i.current_week
    );
    
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
    --GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end loop;
  
  for i in (select channel,current_week from public.comp_spread_lvl1
            group by channel,current_week
			order by channel,current_week)
  loop
	v_channel_part_tp := regexp_replace(i.channel, '[ /.-]', '', 'g');
    raise notice 'step1: %',  v_channel_part_tp;
    
    call plan_smart.create_plan_schema('tp_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    	  
	v_sql_text := format('
    update
      %s tps
    set
      kpi250 = Coalesce(written_comp_spread_perc,0)
    from
       public.comp_spread_lvl1 csl
    where
      csl.channel = %L
    and
      tps.channel = csl.channel
    and
      csl.current_week  = %s
    and
      tps.current_week = csl.current_week 
    and
      tps.class = csl.l3_name
    and
      tps.hierarchy_code = csl.hierarchy_code'
	,'plan_smart.tp_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
	,i.channel
	,i.current_week
    );
    
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
    --GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end loop;
  
  
  for i in (select channel,current_week from plan_smart.wf_master_1
            where current_week > v_actual_refresh_min_week
            group by channel,current_week
			order by channel,current_week)
  loop
	v_channel_part_wf := regexp_replace(i.channel, '[ /.-]', '', 'g');

    call plan_smart.create_plan_schema('wf_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    	  
	v_sql_text := format('
    update
      %s wms
    set
        kpi248 =  (Coalesce(kpi32,0)*Coalesce(kpi250,0)),
        kpi249 =  Coalesce(kpi32,0) - (Coalesce(kpi32,0)*Coalesce(kpi250,0))'
	,'plan_smart.wf_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
    );
    
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
    --GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end loop;
  

  for i in (select channel,current_week from plan_smart.wp_master_1
            group by channel,current_week
			order by channel,current_week)
  loop
	v_channel_part_wp := regexp_replace(i.channel, '[ /.-]', '', 'g');

    call plan_smart.create_plan_schema('wp_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    	  
	v_sql_text := format('
    update
      %s wps
    set
        kpi248 =  (Coalesce(kpi32,0)*Coalesce(kpi250,0)),
        kpi249 =  Coalesce(kpi32,0) - (Coalesce(kpi32,0)*Coalesce(kpi250,0))'
	,'plan_smart.wp_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
    );
    
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
    --GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end loop;

  
  for i in (select channel,current_week from plan_smart.tp_master_1
            group by channel,current_week
			order by channel,current_week)
  loop
	v_channel_part_wp := regexp_replace(i.channel, '[ /.-]', '', 'g');

    call plan_smart.create_plan_schema('tp_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    	  
	v_sql_text := format('
    update
      %s tps
    set
        kpi248 =  (Coalesce(kpi32,0)*Coalesce(kpi250,0)),
        kpi249 =  Coalesce(kpi32,0) - (Coalesce(kpi32,0)*Coalesce(kpi250,0))'
	,'plan_smart.tp_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
    );
    
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
    --GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end loop;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$
;