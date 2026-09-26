--liquibase formatted sql
--changeset abhay.badnur@impactanalytics.co:sync_written_to_delivered_kpis_chg4 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-58202
--comment:  updated formula changes 1 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.sync_written_to_delivered_kpis(p_channels text[], p_product_filter jsonb, p_last_synced_week integer, p_version integer);
DROP FUNCTION IF EXISTS plan_smart.sync_written_to_delivered_kpis(p_channels text[], p_product_filter jsonb, p_last_synced_week integer, p_version integer, p_update_ratio double precision);
CREATE OR REPLACE FUNCTION plan_smart.sync_written_to_delivered_kpis(p_channels text[], p_product_filter jsonb, p_last_synced_week integer, p_version integer, p_update_ratio double precision DEFAULT 1.0)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_sql            text;
  v_hcodes         int[];
  v_table          text;
  v_affected_rows  int:=0; 
  v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
  v_sql := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filter);
  v_sql := 'select array_agg(distinct hierarchy_code) 
              from ('||v_sql|| ' 
                     and level = 4
                   ) phf';
                  
  raise notice 'v_sql:%', v_sql;
 
  RAISE NOTICE 'Update ratio: %', p_update_ratio;
 
  execute v_sql into v_hcodes;
  raise notice 'v_hcodes : %', v_hcodes;
 
  select 
    distinct plan_table
  into
    v_table
  from 
    plan_smart.query_source_mappings qsm
  where 
    plan_status  = p_version;
   
  v_sql := 'drop table if exists temp_w2d';
  execute v_sql;
 
  v_sql := format('
          create temporary table temp_w2d as 
          select
            w2d.channel,
            w2d.hierarchy_code,
            w2d.delivered_week as current_week,
            ---****----
           
            -- Fct D Sls $
            sum(coalesce (wm.kpi32,0) * w2d.delivered_rates) as kpi10,
            -- D Sls $
            sum(coalesce (wm.kpi32,0) * w2d.delivered_rates * %1s) as kpi42,
            --ND Sls $
            sum(coalesce (wm.kpi32,0) * w2d.non_delivered_rates * %1s) as kpi8,
            -- Wgt Age ND Sls $
            sum( coalesce (wm.kpi32,0) * w2d.non_delivered_rates * w2d.outstanding_age * %1s)
              / 
            (case when sum(coalesce (wm.kpi32,0) * w2d.non_delivered_rates ) = 0
                  then 1 
                  else sum(coalesce (wm.kpi32,0) * w2d.non_delivered_rates * %1s) 
             end) AS kpi9,
            ---****----
            -- Fct D Sls U
            sum(coalesce (wm.kpi33,0) * w2d.delivered_rates) as kpi13,
            --  D Sls U
            sum(coalesce (wm.kpi33,0) * w2d.delivered_rates * %1s) as kpi43,
      
            --ND Sls U
            sum(coalesce (wm.kpi33,0) * w2d.non_delivered_rates * %1s) as kpi11,
            -- Wgt Age ND Sls U
            sum( coalesce (wm.kpi33,0) * w2d.non_delivered_rates * w2d.outstanding_age * %1s)
              / 
            (case when sum(coalesce (wm.kpi33,0) * w2d.non_delivered_rates) = 0
                  then 1 
                  else sum(coalesce (wm.kpi33,0) * w2d.non_delivered_rates * %1s) 
             end) AS kpi12,
            ---****----
            --Fct D COGS
            sum(coalesce (wm.kpi4,0) * w2d.delivered_rates) as kpi16,
            --D COGS
            sum(coalesce (wm.kpi4,0) * w2d.delivered_rates * %1s) as kpi21,
            --ND COGS
            sum(coalesce (wm.kpi4,0) * w2d.non_delivered_rates * %1s) as kpi14,
            -- Wgt Age ND COGS
            sum( coalesce (wm.kpi4,0) * w2d.non_delivered_rates * w2d.outstanding_age * %1s)
              / 
            (case when sum(coalesce (wm.kpi4,0) * w2d.non_delivered_rates) = 0
                  then 1 
                  else sum(coalesce (wm.kpi4,0) * w2d.non_delivered_rates * %1s) 
             end) AS kpi15 
          from
            plan_smart.w2d_contribution_basedata w2d
          left join
            %s wm 
          on
            w2d.channel  = wm.channel
          and
            w2d.hierarchy_code  = wm.hierarchy_code 
          and
            w2d.current_week  = wm.current_week 
          where
            w2d.channel  = any(%L)
          and
            w2d.hierarchy_code = any(%L)
          and
            w2d.delivered_week  > %s
          and
            w2d.current_week <= w2d.delivered_week
          and 
            w2d.delivered_rates <> 0
          and 
            w2d.non_delivered_rates <> 0
          group by
            w2d.channel,
            w2d.hierarchy_code,
            w2d.delivered_week'
          ,p_update_ratio
          ,p_update_ratio
          ,p_update_ratio
          ,p_update_ratio
          ,p_update_ratio
          ,p_update_ratio
          ,p_update_ratio
          ,p_update_ratio
          ,p_update_ratio
          ,p_update_ratio
          ,p_update_ratio
          ,p_update_ratio
          ,v_table
          ,p_channels
          ,v_hcodes
          ,p_last_synced_week
          );
         
  raise notice 'v_sql : %',v_sql;
 
  execute v_sql;
 
  raise notice 'temp table created';
 
  v_sql := format('
  update
    %s wp
  set
     --Fct D Sls $  fct_dlvd_sales
     kpi10 = w2d.kpi10 
     --Fct D Sls U  fct_dlvd_qty    
    ,kpi13 = w2d.kpi13
     --Fct D COGS   fct_dlvd_cost   
    ,kpi16 = w2d.kpi16
     --ND Sls $ non_dlvd_sales  
    ,kpi8 = w2d.kpi8
     --ND Sls U non_dlvd_qty    
    ,kpi11 = w2d.kpi11
     --ND COGS  non_dlvd_cost   
    ,kpi14 = w2d.kpi14
     --Wgt Age ND Sls $ wgt_age_non_dlvd_sales  
    ,kpi9 = w2d.kpi9
     --Wgt Age ND Sls U wgt_age_non_dlvd_units  
    ,kpi12 = w2d.kpi12
     --Wgt Age ND COGS  wgt_age_non_dlvd_cost   
    ,kpi15 = w2d.kpi15
     --D Sls $ dlvd_sales
    ,kpi42 = w2d.kpi42
     --D Sls U  dlvd_qty    
    ,kpi43 = w2d.kpi43
     --D COGS   dlvd_cost   
    ,kpi21 = w2d.kpi21
     --D AUR    dlvd_aur    
    ,kpi45 = (w2d.kpi42)/nullif(w2d.kpi43,0)
    --D AUC dlvd_auc    
    ,kpi57 = (w2d.kpi21)/nullif(w2d.kpi43,0)
    --D GM $    dlvd_margin 
    ,kpi58 = (w2d.kpi42) - (w2d.kpi21)
    --D GM  dlvd_margin_per 
    ,kpi46 = ((w2d.kpi42)-(w2d.kpi21))/nullif(w2d.kpi42,0)
    --D AIR dlvd_air    
    ,kpi20 = ((w2d.kpi42)/nullif((w2d.kpi43),0))/nullif(1-wp.kpi44,0)
     --D Sls $ Adj Fctr  dlvd_sales_adj_fctr
    ,kpi17 = w2d.kpi42/nullif(w2d.kpi10,0)
     --D Sls U Adj Fctr  dlvd_qty_adj_fctr    
    ,kpi107 = w2d.kpi43/nullif(w2d.kpi13,0)
     --D COGS Adj Fctr   dlvd_cost_adj_fctr   
    ,kpi108 = w2d.kpi21/nullif(w2d.kpi16,0)  
  from
    temp_w2d w2d
  where 
    w2d.channel  = wp.channel
  and
    w2d.hierarchy_code  = wp.hierarchy_code 
  and
    w2d.current_week  = wp.current_week
  ',v_table);
  
  raise notice 'v_sql : %',v_sql; 
  execute v_sql;
 
  GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
  perform global.sp_log(v_gen_random_uuid, 'plan_smart.sync_written_to_delivered_kpis', 'before executing v_sql', v_sql, jsonb_build_object('p_channels',$1, 'p_product_filter', $2, 'p_last_synced_week', $3, 'p_version', $4, 'p_update_ratio', $5));
  return v_affected_rows;
END;
$function$
;