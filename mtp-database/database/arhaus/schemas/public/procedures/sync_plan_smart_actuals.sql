--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:sync_plan_smart_actuals runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-48528
--comment:  initial changeset for sync_plan_smart_actuals
--rollback: SELECT 1
DROP PROCEDURE if exists public.sync_plan_smart_actuals();
CREATE OR REPLACE PROCEDURE public.sync_plan_smart_actuals()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_plan_smart_actuals';
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
 begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 	
	  select 
	    'channel,l3_name,current_week,hierarchy_code,' || string_agg(kpis.name, ',') as cls1,
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
	       AND table_name = 'actual_ly_temp'
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
  v_sql_text := 'create index if not exists idx_actual_ly_temp on public.actual_ly_temp(channel,current_week)';
  execute v_sql_text;
 
  v_sql_text := 'analyze public.actual_ly_temp';
  execute v_sql_text;
 
  for i in (select channel,current_week
              from public.actual_ly_temp
          group by channel,current_week
          order by channel,current_week)
  loop
	v_channel_part := regexp_replace(i.channel, '[ /.-]', '', 'g');
    
    call plan_smart.create_plan_schema('wf_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    
    v_sql_text :=format(
    'insert into 
       %s(%s)
     select %s 
       from public.actual_ly_temp
     where 
       channel = %L
     and
       current_week = %s
     on conflict ON CONSTRAINT %s do update 
     set %s;'
     ,'plan_smart.wf_master_1_'||v_channel_part||'_'||i.current_week::text
     ,v_cls2
     ,v_cls1
     ,i.channel
     ,i.current_week
     ,'wf_master_1_'||v_channel_part||'_'||i.current_week::text||'_pkey'
     ,v_cls3
    );
    raise notice 'v_upsert_sql : %', v_sql_text;
    execute v_sql_text;
    v_cnt := v_cnt + 1;
    raise notice 'Table processed : %', v_cnt;
  end loop;
 
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  raise notice 'Working forecast updated. Affected rows %', v_affected_rows;
 
  for i in (select plan_code
              from plan_smart.vw_plan_master vpm 
             where status=4
           )
  loop
    v_sql_text :=format(
            'update
                plan_smart.plan_modifications_%s pmd
             set
                %s
             from
                public.actual_ly_temp act
             where
                pmd.channel = act.channel
             and
                pmd.current_week = act.current_week 
             and
                pmd.class = act.l3_name
             and
                pmd.hierarchy_code = act.hierarchy_code'
            ,i.plan_code,v_cls4
            );
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
  
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    raise notice 'Scenario plan_code=% updated. Affected rows %',i.plan_code, v_affected_rows;
  end loop;

  select max(compared_week)
    into v_actual_refresh_min_week 
    from public.actual_ly_temp where written_sales_units > 0;
  
  raise notice '%', v_actual_refresh_min_week;
  
  v_sql_text := 'create index if not exists idx_po_oo_committed_table on public.po_oo_committed_table(channel,current_week)';
  execute v_sql_text;
 
  v_sql_text := 'analyze public.po_oo_committed_table';
  execute v_sql_text;
  
  for i in (select channel,current_week
              from public.po_oo_committed_table
          group by channel,current_week)
  loop
	v_channel_part_wf := regexp_replace(i.channel, '[ /.-]', '', 'g');
    raise notice 'step1: %',  v_channel_part_wf;
    
    call plan_smart.create_plan_schema('wf_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    	  
	v_sql_text := format('
    update
      %s wms
    set
      kpi93 = Coalesce(pcmt.kpi93,0),
      kpi94 = Coalesce(pcmt.kpi94,0),
      kpi100 = Coalesce(pcmt.kpi100,0), 
      kpi101 = Coalesce(pcmt.kpi101,0)
    from
      plan_smart.po_oo_master_1 pcmt
    where
      pcmt.channel = %L
    and
      wms.channel = pcmt.channel
    and
      pcmt.current_week  = %s
    and
      wms.current_week = pcmt.current_week 
    and
      wms.class = pcmt.class
    and
      wms.hierarchy_code = pcmt.hierarchy_code'
	,'plan_smart.wf_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
	,i.channel
	,i.current_week
    );
    
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
    --GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end loop;
 
  for i in  ( select 
               channel,current_week
              from 
                public.po_oo_committed_table 
              where 
                current_week <= v_actual_refresh_min_week
              group by 
                channel,current_week)
  loop
	v_channel_part_wp := regexp_replace(i.channel, '[ /.-]', '', 'g');
    
    call plan_smart.create_plan_schema('wp_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    	  
	v_sql_text := format('
    update
      %s wps
    set
      kpi93 = 0,
      kpi94 = 0,
      kpi100 = 0, 
      kpi101 = 0'   
	, 'plan_smart.wp_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
    );
    
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
    --GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end loop;
 
   for i in (select channel,current_week
              from public.po_oo_committed_table
              where 
                current_week > v_actual_refresh_min_week
          group by channel,current_week)
  loop
	v_channel_part_wp := regexp_replace(i.channel, '[ /.-]', '', 'g');
    raise notice 'step1: %',  v_channel_part_wp;
    
    call plan_smart.create_plan_schema('wp_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    	  
	v_sql_text := format('
    update
      %s wps
    set
      kpi93 = Coalesce(pcmt.kpi93,0),
      kpi94 = Coalesce(pcmt.kpi94,0),
      kpi100 = Coalesce(pcmt.kpi100,0), 
      kpi101 = Coalesce(pcmt.kpi101,0)
    from
       plan_smart.po_oo_master_1  pcmt
    where
      pcmt.channel = %L
    and
      wps.channel = pcmt.channel
    and
      pcmt.current_week  = %s
    and
      wps.current_week = pcmt.current_week 
    and
      wps.class = pcmt.class
    and
      wps.hierarchy_code = pcmt.hierarchy_code'
	,'plan_smart.wp_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
	,i.channel
	,i.current_week
    );
    
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
    --GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end loop;


  
  for i in (select channel,current_week
              from 
                plan_smart.wp_master_1  
          group by channel,current_week)
  loop
	v_channel_part_wp := regexp_replace(i.channel, '[ /.-]', '', 'g');

    call plan_smart.create_plan_schema('wp_master_1',array[i.channel]::text[],array[i.current_week]::int[]);
    	  
	v_sql_text := format('
    update
      %s wps
    set
	    kpi83 = Coalesce(kpi93, 0) + Coalesce(kpi96, 0),
	    kpi84 = Coalesce(kpi94, 0) + Coalesce(kpi97, 0),
	    kpi85 = (Coalesce(kpi83, 0) / NULLIF(Coalesce(kpi50, 0), 0)),
	    kpi86 = Coalesce(kpi100, 0) + Coalesce(kpi103, 0),
	    kpi87 = Coalesce(kpi101, 0) + Coalesce(kpi104, 0),
	    kpi88 = ((Coalesce(kpi100, 0) + Coalesce(kpi103, 0)) / NULLIF(Coalesce(kpi51, 0), 0)),
	    kpi89 = (Coalesce(kpi50, 0) / NULLIF(Coalesce(kpi51, 0), 0)),
	    kpi90 = ((Coalesce(kpi93, 0) + Coalesce(kpi96, 0)) / NULLIF(Coalesce(kpi100, 0) + Coalesce(kpi103, 0), 0)),
	    kpi91 = ((Coalesce(kpi94, 0) + Coalesce(kpi97, 0)) / NULLIF(Coalesce(kpi101, 0) + Coalesce(kpi104, 0), 0)),
	    kpi92 = Coalesce(kpi93, 0) + Coalesce(kpi94, 0),
	    kpi95 = Coalesce(kpi50, 0) - Coalesce(kpi92, 0),
	    kpi96 = (((Coalesce(kpi50, 0) - Coalesce(kpi92, 0)) * Coalesce(kpi83, 0)) / NULLIF(Coalesce(kpi50, 0), 0)),
	    kpi97 = ((Coalesce(kpi50, 0) - Coalesce(kpi92, 0) - (Coalesce(kpi50, 0) - Coalesce(kpi92, 0)) * Coalesce(kpi83, 0)) / NULLIF(Coalesce(kpi50, 0), 0)),
	    kpi99 = Coalesce(kpi100, 0) + Coalesce(kpi101, 0),
	    kpi102 = Coalesce(kpi51, 0) - Coalesce(kpi100, 0) + Coalesce(kpi101, 0),
	    kpi103 = Coalesce(kpi51, 0) - Coalesce(kpi100, 0) + (Coalesce(kpi101, 0) * Coalesce(kpi22, 0)),
	    kpi104 = Coalesce(kpi51, 0) - Coalesce(kpi100, 0) + Coalesce(kpi101, 0) - Coalesce(kpi51, 0) - Coalesce(kpi100, 0) + (Coalesce(kpi101, 0) * Coalesce(kpi22, 0)),
	    kpi23 = ((Coalesce(kpi93, 0) + Coalesce(kpi94, 0)) / NULLIF(Coalesce(kpi100, 0) + Coalesce(kpi101, 0), 0)),
	    kpi24 = ((Coalesce(kpi93, 0)) / NULLIF(Coalesce(kpi100, 0), 0)),
	    kpi25 = (Coalesce(kpi94, 0) / NULLIF(Coalesce(kpi101, 0), 0)),
	    kpi26 = ((Coalesce(kpi50, 0) - Coalesce(kpi92, 0)) / NULLIF(Coalesce(kpi51, 0) - Coalesce(kpi100, 0) + Coalesce(kpi101, 0), 0)),
	    kpi27 = (((Coalesce(kpi50, 0) - Coalesce(kpi92, 0)) * Coalesce(kpi83, 0)) / NULLIF(Coalesce(kpi50, 0), 0)) / NULLIF((Coalesce(kpi51, 0) - Coalesce(kpi100, 0) + Coalesce(kpi101, 0) * Coalesce(kpi22, 0)), 0),
	    kpi28 = (((Coalesce(kpi50, 0) - Coalesce(kpi92, 0) - (Coalesce(kpi50, 0) - Coalesce(kpi92, 0)) * Coalesce(kpi83, 0)) / NULLIF(Coalesce(kpi50, 0), 0)) / NULLIF((Coalesce(kpi51, 0) - Coalesce(kpi100, 0) + Coalesce(kpi101, 0) - (Coalesce(kpi51, 0) - Coalesce(kpi100, 0) + Coalesce(kpi101, 0)) * Coalesce(kpi22, 0)), 0))'
	,'plan_smart.wp_master_1_'||regexp_replace(i.channel, '[ /.-]', '', 'g')||'_'||i.current_week::text
    );
    
    raise notice 'v_update_sql: %', v_sql_text;
    execute v_sql_text;
    --GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  end loop;


  for i in (SELECT child.relname AS part_name
              FROM pg_inherits
              JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
              JOIN pg_class child ON pg_inherits.inhrelid = child.oid
              JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
              JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
              WHERE parent.relname = 'wf_master_1')
  loop
      for j in (SELECT child.relname AS part_name
                FROM pg_inherits
                JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
                JOIN pg_class child ON pg_inherits.inhrelid = child.oid
                JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
                JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
                WHERE parent.relname = i.part_name
                AND split_part(child.relname,'_',-1)::int > v_actual_refresh_min_week)
      loop
	    v_sql_text := format('
        update
          plan_smart.%s wms
        set
			kpi83 = Coalesce(kpi93, 0) + Coalesce(kpi96, 0),
		    kpi84 = Coalesce(kpi94, 0) + Coalesce(kpi97, 0),
		    kpi85 = (Coalesce(kpi83, 0) / NULLIF(Coalesce(kpi50, 0), 0)),
		    kpi86 = Coalesce(kpi100, 0) + Coalesce(kpi103, 0),
		    kpi87 = Coalesce(kpi101, 0) + Coalesce(kpi104, 0),
		    kpi88 = ((Coalesce(kpi100, 0) + Coalesce(kpi103, 0)) / NULLIF(Coalesce(kpi51, 0), 0)),
		    kpi89 = (Coalesce(kpi50, 0) / NULLIF(Coalesce(kpi51, 0), 0)),
		    kpi90 = ((Coalesce(kpi93, 0) + Coalesce(kpi96, 0)) / NULLIF(Coalesce(kpi100, 0) + Coalesce(kpi103, 0), 0)),
		    kpi91 = ((Coalesce(kpi94, 0) + Coalesce(kpi97, 0)) / NULLIF(Coalesce(kpi101, 0) + Coalesce(kpi104, 0), 0)),
		    kpi92 = Coalesce(kpi93, 0) + Coalesce(kpi94, 0),
		    kpi95 = Coalesce(kpi50, 0) - Coalesce(kpi92, 0),
		    kpi96 = (((Coalesce(kpi50, 0) - Coalesce(kpi92, 0)) * Coalesce(kpi83, 0)) / NULLIF(Coalesce(kpi50, 0), 0)),
		    kpi97 = ((Coalesce(kpi50, 0) - Coalesce(kpi92, 0) - (Coalesce(kpi50, 0) - Coalesce(kpi92, 0)) * Coalesce(kpi83, 0)) / NULLIF(Coalesce(kpi50, 0), 0)),
		    kpi99 = Coalesce(kpi100, 0) + Coalesce(kpi101, 0),
		    kpi102 = Coalesce(kpi51, 0) - Coalesce(kpi100, 0) + Coalesce(kpi101, 0),
		    kpi103 = Coalesce(kpi51, 0) - Coalesce(kpi100, 0) + (Coalesce(kpi101, 0) * Coalesce(kpi22, 0)),
		    kpi104 = Coalesce(kpi51, 0) - Coalesce(kpi100, 0) + Coalesce(kpi101, 0) - Coalesce(kpi51, 0) - Coalesce(kpi100, 0) + (Coalesce(kpi101, 0) * Coalesce(kpi22, 0)),
		    kpi23 = ((Coalesce(kpi93, 0) + Coalesce(kpi94, 0)) / NULLIF(Coalesce(kpi100, 0) + Coalesce(kpi101, 0), 0)),
		    kpi24 = ((Coalesce(kpi93, 0)) / NULLIF(Coalesce(kpi100, 0), 0)),
		    kpi25 = (Coalesce(kpi94, 0) / NULLIF(Coalesce(kpi101, 0), 0)),
		    kpi26 = ((Coalesce(kpi50, 0) - Coalesce(kpi92, 0)) / NULLIF(Coalesce(kpi51, 0) - Coalesce(kpi100, 0) + Coalesce(kpi101, 0), 0)),
		    kpi27 = (((Coalesce(kpi50, 0) - Coalesce(kpi92, 0)) * Coalesce(kpi83, 0)) / NULLIF(Coalesce(kpi50, 0), 0)) / NULLIF((Coalesce(kpi51, 0) - Coalesce(kpi100, 0) + Coalesce(kpi101, 0) * Coalesce(kpi22, 0)), 0),
		    kpi28 = (((Coalesce(kpi50, 0) - Coalesce(kpi92, 0) - (Coalesce(kpi50, 0) - Coalesce(kpi92, 0)) * Coalesce(kpi83, 0)) / NULLIF(Coalesce(kpi50, 0), 0)) / NULLIF((Coalesce(kpi51, 0) - Coalesce(kpi100, 0) + Coalesce(kpi101, 0) - (Coalesce(kpi51, 0) - Coalesce(kpi100, 0) + Coalesce(kpi101, 0)) * Coalesce(kpi22, 0)), 0))
'
        ,j.part_name
        );
        raise notice 'v_update_sql: %', v_sql_text;
        execute v_sql_text;
      end loop;
  end loop;
  update global.default_attributes 
  set attribute_value  = jsonb_build_object('value', v_actual_refresh_min_week)
  where attribute_type  = 'actual_refresh_min_week';
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
