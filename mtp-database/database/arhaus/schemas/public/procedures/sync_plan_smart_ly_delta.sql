--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:sync_plan_smart_ly_delta runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36859
--comment: initial changeset for sync_plan_smart_ly_delta
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_plan_smart_ly_delta(IN p_plan_version integer);
CREATE OR REPLACE PROCEDURE public.sync_plan_smart_ly_delta(IN p_plan_version integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_plan_smart_ly_delta';
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
  v_table_name              text;
  
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	
  if p_plan_version  = 6 
  then
		
	  select 
	    'channel,l2_name,current_week,hierarchy_code,' || string_agg(kpis.name, ',') as cls1,
	    'channel,class,current_week,hierarchy_code,' || string_agg(kpis.column_actual_name, ',') as cls2,
	     string_agg(kpis.column_actual_name || ' = excluded.' || kpis.column_actual_name, ',') as cls3,
	     string_agg(kpis.column_actual_name || ' = act.' || kpis.name, ',') as cls4
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
	inner join  
	    (SELECT column_name 
	     FROM information_schema.columns
	     WHERE table_catalog = current_database()
	       AND table_schema = 'public'
	       AND table_name = 'ly_lvl_1_delta'
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
	
	  v_sql_text := 'create index if not exists idx_ly_lvl_1_delta on public.ly_lvl_1_delta(channel,current_week)';
	  execute v_sql_text;
	 
	  v_sql_text := 'analyze public.ly_lvl_1_delta';
	  execute v_sql_text;
	 
	  for i in (select channel,current_week
	              from public.ly_lvl_1_delta
	          group by channel,current_week
	          order by channel,current_week)
	  loop
		v_channel_part := regexp_replace(i.channel, '[ /.-]', '', 'g');
	    
	    call plan_smart.create_plan_schema('ly_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
	    
	    v_sql_text :=format(
	    'insert into 
	       %s(%s)
	     select %s 
	       from public.ly_lvl_1_delta
	     where 
	       channel = %L
	     and
	       current_week = %s
	     on conflict ON CONSTRAINT %s do update 
	     set %s;'
	     ,'plan_smart.ly_master_1_'||v_channel_part||'_'||i.current_week::text
	     ,v_cls2
	     ,v_cls1
	     ,i.channel
	     ,i.current_week
	     ,'ly_master_1_'||v_channel_part||'_'||i.current_week::text||'_pkey'
	     ,v_cls3
	    );
	    raise notice 'v_upsert_sql : %', v_sql_text;
	    execute v_sql_text;
	    v_cnt := v_cnt + 1;
	    raise notice 'Table processed : %', v_cnt;
	  end loop;
	 
  elsif p_plan_version  = 7
  then
    		
	  select 
	    'channel,l2_name,current_week,hierarchy_code,' || string_agg(kpis.name, ',') as cls1,
	    'channel,class,current_week,hierarchy_code,' || string_agg(kpis.column_actual_name, ',') as cls2,
	     string_agg(kpis.column_actual_name || ' = excluded.' || kpis.column_actual_name, ',') as cls3,
	     string_agg(kpis.column_actual_name || ' = act.' || kpis.name, ',') as cls4
	  into 
	    v_cls1, 
	    v_cls2, 
	    v_cls3, 
	    v_cls4
	  from 
	     (     select 
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
	inner join  
	    (SELECT column_name 
	     FROM information_schema.columns
	     WHERE table_catalog = current_database()
	       AND table_schema = 'public'
	       AND table_name = 'lly_lvl_1_delta'
	       AND column_name NOT in ('bucket','comp_flag','l0_name','l1_name','l2_name','l2_name_channel','l3_name','compared_week','l3_name_channel')
	    ) cols ON kpis.name = cols.column_name ;
	
	
	  v_sql_text := 'create index if not exists idx_lly_lvl_1_delta on public.lly_lvl_1_delta(channel,current_week)';
	  execute v_sql_text;
	 
	  v_sql_text := 'analyze public.lly_lvl_1_delta';
	  execute v_sql_text;
	 
	  for i in (select channel,current_week
	              from public.lly_lvl_1_delta
	          group by channel,current_week
	          order by channel,current_week)
	  loop
		v_channel_part := regexp_replace(i.channel, '[ /.-]', '', 'g');
	    
	    call plan_smart.create_plan_schema('lly_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
	    
	    v_sql_text :=format(
	    'insert into 
	       %s(%s)
	     select %s 
	       from public.lly_lvl_1_delta
	     where 
	       channel = %L
	     and
	       current_week = %s
	     on conflict ON CONSTRAINT %s do update 
	     set %s;'
	     ,'plan_smart.lly_master_1_'||v_channel_part||'_'||i.current_week::text
	     ,v_cls2
	     ,v_cls1
	     ,i.channel
	     ,i.current_week
	     ,'lly_master_1_'||v_channel_part||'_'||i.current_week::text||'_pkey'
	     ,v_cls3
	    );
	    raise notice 'v_upsert_sql : %', v_sql_text;
	    execute v_sql_text;
	    v_cnt := v_cnt + 1;
	    raise notice 'Table processed : %', v_cnt;
	  end loop;
	 end if;
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  raise notice 'ly and lly data updated. Affected rows %', v_affected_rows;
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

