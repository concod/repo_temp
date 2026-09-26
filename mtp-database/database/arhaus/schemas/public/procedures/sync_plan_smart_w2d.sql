--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:sync_plan_smart_w2d_chg3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0
--comment:  updated w2d formula 
--rollback: SELECT 1
DROP PROCEDURE if exists public.sync_plan_smart_w2d();
CREATE OR REPLACE PROCEDURE public.sync_plan_smart_w2d()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_plan_smart_w2d';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
  i          record;
  v_sql      text;
  v_hcode    int4;
  v_last_actualised_curr_week int4;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  raise notice 'w2d_contribution_basedata sync in progress..';
  insert into plan_smart.w2d_contribution_basedata(
    channel,
    hierarchy_code,
    current_week,
    delivered_week,
    outstanding_age,
    delivered_rates,
    adjustment_factor,
    non_delivered_rates,
    forecasted_delivered_rates, 
    forecasted_non_delivered_rates
  )
  select
    channel,
    hierarchy_code,
    current_week,
    delivered_week,
    outstanding_age,
    delivered_rates,
    adjustment_factor,
    non_delivered_rates,
    forecasted_delivered_rates, 
    forecasted_non_delivered_rates
  from
    public.w2d_contribution_basedata
  on conflict on constraint pk_w2d 
  do update
  set
    outstanding_age = excluded.outstanding_age,
    adjustment_factor = excluded.adjustment_factor,
    delivered_rates = excluded.delivered_rates,
    non_delivered_rates = excluded.non_delivered_rates,
    forecasted_delivered_rates = excluded.forecasted_delivered_rates,
    forecasted_non_delivered_rates = excluded.forecasted_non_delivered_rates;
  v_sql := 'drop table if exists w2d';
  execute v_sql;
   
  v_sql := '
    create table w2d(
    channel        text,
    hierarchy_code int4,
    current_week   int4,
    kpi10          float,
    kpi42          float,
    kpi8           float,
    kpi9           float,
    kpi13          float,
    kpi43          float,
    kpi11          float,
    kpi12          float,
    kpi16          float,
    kpi21          float,
    kpi14          float,
    kpi15          float)';
  execute v_sql;
 
  raise notice 'W2D KPI calculation sync in progress..';
 
  select (attribute_value -> 'value')::int                                                                                                                                                                                                                                                                                                                                                             
    into v_last_actualised_curr_week                                                                                                                                                                                                                                                                                                                                                                         
    from "global".default_attributes                                                                                                                                                                                                                                                                                                                                                                         
   where attribute_type  = 'actual_refresh_min_week';  
 
  for i in (select
              channel, l0_name, l1_name, l2_name, l3_name, v_last_actualised_curr_week as current_week
            from
              public.actual_ly_temp
            where
              channel in ('Ecom', 'Store', 'Loft')
            group by 
              channel, l0_name, l1_name, l2_name, l3_name
           )
  loop
    select hierarchy_code
    into v_hcode
    from plan_smart.product_hierarchies_filter phf
    where l0_name = i.l0_name
    and l1_name = i.l1_name
    and l2_name = i.l2_name
    and l3_name = i.l3_name
    and level=4;
   
    raise notice 'hcode = % , channel = % , current_week = %',v_hcode , i.channel, i.current_week;
    
    insert into w2d
          select
            w2d.channel,
            w2d.hierarchy_code,
            w2d.delivered_week as current_week,
            ---****----
            -- Fct D Sls $
            sum(coalesce (wf.kpi32,0) * w2d.delivered_rates) as kpi10,
            -- D Sls $
            sum(coalesce (wf.kpi32,0) * w2d.delivered_rates) as kpi42,
            --ND Sls $
            sum(coalesce (wf.kpi32,0) * w2d.non_delivered_rates) as kpi8,
            -- Wgt Age ND Sls $
            sum( coalesce (wf.kpi32,0) * w2d.non_delivered_rates * w2d.outstanding_age)
              / 
            (case when sum(coalesce (wf.kpi32,0) * w2d.non_delivered_rates) = 0
                  then 1 
                  else sum(coalesce (wf.kpi32,0) * w2d.non_delivered_rates) 
             end) AS kpi9,
            ---****----
            -- Fct D Sls U
            sum(coalesce (wf.kpi33,0) * w2d.delivered_rates) as kpi13,
            -- D Sls U
            sum(coalesce (wf.kpi33,0) * w2d.delivered_rates) as kpi43,
            --ND Sls U
            sum(coalesce (wf.kpi33,0) * w2d.non_delivered_rates) as kpi11,
            -- Wgt Age ND Sls U
            sum( coalesce (wf.kpi33,0) * w2d.non_delivered_rates * w2d.outstanding_age)
              / 
            (case when sum(coalesce (wf.kpi33,0) * w2d.non_delivered_rates) = 0
                  then 1 
                  else sum(coalesce (wf.kpi33,0) * w2d.non_delivered_rates) 
             end) AS kpi12,
            ---****----
            --Fct D COGS
            sum(coalesce (wf.kpi4,0) * w2d.delivered_rates) as kpi16,
            --D COGS
            sum(coalesce (wf.kpi4,0) * w2d.delivered_rates) as kpi21,
            --ND COGS
            sum(coalesce (wf.kpi4,0) * w2d.non_delivered_rates) as kpi14,
            -- Wgt Age ND COGS
            sum( coalesce (wf.kpi4,0) * w2d.non_delivered_rates * w2d.outstanding_age)
              / 
            (case when sum(coalesce (wf.kpi4,0) * w2d.non_delivered_rates) = 0
                  then 1 
                  else sum(coalesce (wf.kpi4,0) * w2d.non_delivered_rates) 
             end) AS kpi15
          from
            plan_smart.w2d_contribution_basedata w2d
          join
            plan_smart.wf_master_1 wf 
          on
            w2d.channel  = wf.channel
          and
            w2d.hierarchy_code  = wf.hierarchy_code 
          and
            w2d.current_week  = wf.current_week 
          where
            w2d.channel  = i.channel
          and
            w2d.hierarchy_code = v_hcode
          and
            w2d.delivered_week  > i.current_week
          and
            w2d.current_week <= w2d.delivered_week
          group by
            w2d.channel,
            w2d.hierarchy_code,
            w2d.delivered_week;
  end loop;
 
  raise notice 'w2d table created, wf update in progress..';
 
  update
    plan_smart.wf_master_1 wf
  set
     --Fct D Sls $  
     kpi10 = w2d.kpi10 
     --D Sls $
    ,kpi42 = w2d.kpi42
     --ND Sls $
    ,kpi8 = w2d.kpi8
     --Wgt Age ND Sls $
    ,kpi9 = w2d.kpi9
     --Fct D Sls U
    ,kpi13 = w2d.kpi13
     --D Sls U 
    ,kpi43 = w2d.kpi43
     --ND Sls U    
    ,kpi11 = w2d.kpi11
     --Wgt Age ND Sls U 
    ,kpi12 = w2d.kpi12
     --Fct D COGS  
    ,kpi16 = w2d.kpi16
     --D COGS
    ,kpi21 = w2d.kpi21
     --ND COGS
    ,kpi14 = w2d.kpi14
     --Wgt Age ND COGS  
    ,kpi15 = w2d.kpi15
     --D Sls $ Adj Fctr
    ,kpi17 = w2d.kpi42/nullif(w2d.kpi10,0)
     --D Sls U Adj Fctr 
    ,kpi107 = w2d.kpi43/nullif(w2d.kpi13,0)
     --D COGS Adj Fctr  
    ,kpi108 = w2d.kpi21/nullif(w2d.kpi16,0)
     --D AUR 
    ,kpi45 = (w2d.kpi42)/nullif(w2d.kpi43,0)
     --D AUC 
    ,kpi57 = (w2d.kpi21)/nullif(w2d.kpi43,0)
     --D GM $
    ,kpi58 = (w2d.kpi42) - (w2d.kpi21)
     --D GM %
    ,kpi46 = ((w2d.kpi42) - (w2d.kpi21))/nullif(w2d.kpi42,0)
     --D AIR 
    ,kpi20 = (w2d.kpi42/nullif(w2d.kpi43,0))/nullif(1-wf.kpi44,0)
  from
    w2d
  where 
    w2d.channel  = wf.channel
  and
    w2d.hierarchy_code  = wf.hierarchy_code 
  and
    w2d.current_week  = wf.current_week;
   
  raise notice 'WF W2D KPI sync completed!';
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$
;