--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:sync_fwos_kpis_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-58202
--comment: Changes done to consolidate sls kpis on non warehouse channels
--rollback: SELECT 1
DROP FUNCTION  if exists plan_smart.sync_fwos_kpis(_text, jsonb, int4, int4);
CREATE OR REPLACE FUNCTION plan_smart.sync_fwos_kpis(p_channels text[], p_product_filter jsonb, p_sync_from_week integer, p_version integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_sql            text;
  v_hcodes         int[];
  v_table_name     text;
  v_affected_rows  int:=0;
  v_channel        text;
  v_hcode          int4;
  v_channels       text[]:= '{"Warehouse"}';
BEGIN
  v_sql := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filter);
  v_sql := 'select array_agg(distinct hierarchy_code) 
              from ('||v_sql|| ' 
                     and level = 4
                   ) phf';
                  
  raise notice 'v_sql:%', v_sql;
 
  execute v_sql into v_hcodes;
  raise notice 'v_hcodes : %', v_hcodes;
 
  select 
    distinct plan_table
  into
    v_table_name
  from 
    plan_smart.query_source_mappings qsm
  where 
    plan_status  = p_version;
   
  v_sql := 'drop table if exists fwos';
  execute v_sql;
 
  v_sql := 'create temp table fwos(
              channel          text,
              current_week     int4,
              hierarchy_code   int4,
              year_month_key   int4,
              normalized_sales float8,
              normalized_cogs  float8
            )';
  execute v_sql;
 
  foreach v_channel in ARRAY v_channels   
  loop
  	foreach v_hcode in ARRAY v_hcodes   
  	loop
      v_sql := format('
      insert into fwos 
      WITH sales_data AS (
        select 
          fdm.channel,
          fiscal_year_week as current_week,
          fdm.hierarchy_code,
          year_month_key,
          coalesce(kpi33,0) as kpi33,
          coalesce(kpi4,0)  as kpi4,
          --fiscal_month_name,
          fiscal_month_in_year,
          no_days_in_week
        from 
          (select
             fiscal_year_week,
             --fiscal_month_name ,
             fiscal_month_in_year,
             %L::text as channel,
             %L::int4 as hierarchy_code,
             count(*) no_days_in_week,
             max(fiscal_year::text||fiscal_month_in_year::text)::int as year_month_key
           from 
             global.fiscal_date_mapping fdm
           where 
             fiscal_year_week between %s and %s
           group by
             fiscal_year_week,
             --fiscal_month_name,
             fiscal_month_in_year
           order by
             fiscal_year_week,
             --fiscal_month_name,
             fiscal_month_in_year   
          ) fdm
        left join
         (select 
             current_week,
             hierarchy_code,
             ''Warehouse''::text as channel,
             coalesce(sum(kpi33),0) as kpi33,
             coalesce(sum(kpi4),0)  as kpi4
           from
             %s
           where 
             channel in (''Store'',''Ecom'',''Loft'')  
           group by
             current_week,
             hierarchy_code
          ) wf
        on
          fdm.fiscal_year_week  = wf.current_week 
        and 
          wf.hierarchy_code =fdm.hierarchy_code 
        and
          wf.channel  = fdm.channel
      )
      ,
      --select * from sales_data
      monthly_data AS (
        SELECT 
          channel,
          hierarchy_code,
          year_month_key,
          SUM(kpi33) AS monthly_sales,
          SUM(kpi4) AS monthly_COGS,
          SUM(no_days_in_week) AS monthly_days
        FROM 
          sales_data
        GROUP BY 
          channel, 
          hierarchy_code, 
          year_month_key
      )
      ,
      --select * from monthly_data order by year_month_key
      monthly_normalized_sales AS (
        SELECT 
          md.channel,
          md.hierarchy_code,
          md.year_month_key,
          SUM(md.monthly_sales) OVER (
            PARTITION BY md.channel, md.hierarchy_code 
            ORDER BY md.year_month_key 
            ROWS BETWEEN CURRENT ROW AND 5 following
          ) as sales_over_six_months,
          SUM(md.monthly_cogs) OVER (
            PARTITION BY md.channel, md.hierarchy_code 
            ORDER BY md.year_month_key 
            ROWS BETWEEN CURRENT ROW AND 5 following
          ) as cogs_over_six_months,       
          SUM(md.monthly_days) OVER (
            PARTITION BY md.channel, md.hierarchy_code 
            ORDER BY md.year_month_key 
            ROWS BETWEEN CURRENT ROW AND 5 FOLLOWING
          ) AS days_over_six_months
        from 
          monthly_data md
      )
      ,
      --select * from monthly_normalized_sales order by year_month_key 
      normalized_sales AS (
        SELECT 
          sd.channel,
          sd.current_week,
          sd.hierarchy_code,
          sd.year_month_key,
          ((md.sales_over_six_months*7)/md.days_over_six_months)::float as normalized_sales,
          ((md.cogs_over_six_months*7)/md.days_over_six_months)::float as normalized_cogs
        FROM 
          sales_data sd
        JOIN 
          monthly_normalized_sales md
        ON 
          sd.channel = md.channel 
        AND 
          sd.hierarchy_code = md.hierarchy_code 
        AND 
          sd.year_month_key = md.year_month_key
      )
      SELECT * FROM normalized_sales'
      ,v_channel
      ,v_hcode
      ,(p_sync_from_week-30)::int
      ,(p_sync_from_week+100+100+58)::int
      ,v_table_name);
     
      raise notice 'v_sql : %',v_sql;
 
      execute v_sql;

  	end loop;
  end loop;
   
  raise notice 'temp table created';
 
  v_sql := format('
  update
    %s wf
  set
     --AOH FWOS U	aoh_fwos_units	
    kpi66 = wf.kpi64 /nullif(fwos.normalized_sales,0)
    --AOH FWOS C$	aoh_fwos_cost	
    ,kpi67 = wf.kpi65 /nullif(fwos.normalized_cogs,0)
     --ATP FWOS U	atp_fwos_units	
    ,kpi69 = wf.kpi68 /nullif(fwos.normalized_sales,0)
    --ATP FWOS C$	atp_fwos_cost	
    ,kpi71 = wf.kpi70 /nullif(fwos.normalized_cogs,0)
  from
    fwos
  where 
    fwos.channel  = wf.channel
  and
    fwos.hierarchy_code  = wf.hierarchy_code 
  and
    fwos.current_week  = wf.current_week
  ',v_table_name);
  
  raise notice 'v_sql : %',v_sql; 
  execute v_sql;
 
  GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
  return v_affected_rows;
END;
$function$
;
