--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:get_fwos_kpis_weekly runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-49945
--comment:  inital changeset for get_fwos_kpis_weekly
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_fwos_kpis_weekly(p_refcursor refcursor, p_channels text[], p_product_filter jsonb, p_sync_from_week integer, p_version integer);
CREATE OR REPLACE FUNCTION plan_smart.get_fwos_kpis_weekly(p_refcursor refcursor, p_channels text[], p_product_filter jsonb, p_sync_from_week integer, p_version integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_sql            text;
  v_hcodes         int[];
  v_table_name     text;
  v_affected_rows  int:=0;
  v_channel        text;
  v_l2_name        text[];
  v_l2              text;
  v_channels       text[]:= '{"Warehouse"}';
BEGIN
  v_sql := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filter);
  v_sql := 'select array_agg(distinct l2_name) 
              from ('||v_sql|| ' 
                     and level = 3
                   ) phf';
                  
  raise notice 'v_sql:%', v_sql;
 
  execute v_sql into v_l2_name;
  raise notice 'v_l2_name : %', v_l2_name;
 
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
 
  v_sql := 'CREATE TEMP TABLE fwos (
    channel          TEXT,
    current_week     int4,
    l0_name          TEXT,
    l1_name          TEXT,
    l2_name          TEXT,
    aoh_fwos_units   FLOAT8,
    aoh_fwos_cost    FLOAT8,
    atp_fwos_units   FLOAT8,
    atp_fwos_cost    FLOAT8
)
';
  execute v_sql;
 
  foreach v_channel in ARRAY v_channels   
  loop
    foreach v_l2 in ARRAY v_l2_name  
    loop
      v_sql := format('
      insert into fwos 
      WITH sales_data AS (
        select 
          fdm.channel,
          fiscal_year_week as current_week,
          fdm.l2_name,
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
             %L::text as l2_name,
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
             phf.l2_name,
             ''Warehouse''::text as channel,
             coalesce(sum(kpi33),0) as kpi33,
             coalesce(sum(kpi4),0)  as kpi4
           from
             %s p
           join
             plan_smart.product_hierarchies_filter phf
           on
             p.hierarchy_code = phf.hierarchy_code
           where 
             channel in (''Store'',''Ecom'',''Loft'')  
           group by
             current_week,
             phf.l2_name
          ) wf
        on
          fdm.fiscal_year_week  = wf.current_week 
        and 
          wf.l2_name =fdm.l2_name
        and
          wf.channel  = fdm.channel
      )
      ,
      --select * from sales_data
      monthly_data AS (
        SELECT 
          channel,
          l2_name,
          year_month_key,
          SUM(kpi33) AS monthly_sales,
          SUM(kpi4) AS monthly_COGS,
          SUM(no_days_in_week) AS monthly_days
        FROM 
          sales_data
        GROUP BY 
          channel, 
          l2_name, 
          year_month_key
      )
      ,
      --select * from monthly_data order by year_month_key
      monthly_normalized_sales AS (
        SELECT 
          md.channel,
          md.l2_name,
          md.year_month_key,
          SUM(md.monthly_sales) OVER (
            PARTITION BY md.channel, md.l2_name 
            ORDER BY md.year_month_key 
            ROWS BETWEEN CURRENT ROW AND 5 following
          ) as sales_over_six_months,
          SUM(md.monthly_cogs) OVER (
            PARTITION BY md.channel, md.l2_name 
            ORDER BY md.year_month_key 
            ROWS BETWEEN CURRENT ROW AND 5 following
          ) as cogs_over_six_months,       
          SUM(md.monthly_days) OVER (
            PARTITION BY md.channel, md.l2_name 
            ORDER BY md.year_month_key 
            ROWS BETWEEN CURRENT ROW AND 5 FOLLOWING
          ) AS days_over_six_months
        from 
          monthly_data md
      )
      ,
      --select * from monthly_normalized_sales order by year_month_key 
      normalized_sales_1 AS (
        SELECT 
          sd.channel,
          sd.current_week,
          sd.l2_name,
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
          sd.l2_name = md.l2_name
        AND 
          sd.year_month_key = md.year_month_key
      ),
      --SELECT * FROM normalized_sales_1
      wf_calculation as 
      (   select  wf.channel, phf.l0_name, phf.l1_name, phf.l2_name, wf.current_week,
		  sum(wf.kpi64) as aoh_units,
		  sum(wf.kpi65) as aoh_cost,
		  sum(wf.kpi68) as atp_units,
		  sum(wf.kpi70) as atp_cost
		  from %s wf
		  join plan_smart.product_hierarchies_filter phf
		  on wf.hierarchy_code = phf.hierarchy_code
		  group by phf.l2_name, phf.l1_name, phf.l0_name, wf.channel, wf.current_week
      )
      select 
        wf.channel,wf.current_week, wf.l0_name, wf.l1_name,wf.l2_name,
            --aoh_units / normalized_sales as aoh_fwos_units,
            meta_schema.division(aoh_units,normalized_sales) as aoh_fwos_units,
            --aoh_cost  / normalized_cogs   as aoh_fwos_cost,
            meta_schema.division(aoh_cost,normalized_cogs) as aoh_fwos_cost,
            --atp_units / normalized_sales  as atp_fwos_units,
            meta_schema.division(atp_units,normalized_sales) as atp_fwos_units,
            --atp_cost  / normalized_cogs   as atp_fwos_cost
            meta_schema.division(atp_cost,normalized_cogs) as atp_fwos_cost
      from 
        wf_calculation wf
      inner join 
        normalized_sales_1 ns
      on 
       wf.current_week = ns.current_week 
      and
       wf.channel = ns.channel
      and 
       wf.l2_name = ns.l2_name'
      ,v_channel
      ,v_l2
      ,(p_sync_from_week-30)::int
      ,(p_sync_from_week+100+100+58)::int
      ,v_table_name
      ,v_table_name);
      raise notice 'v_sql : %',v_sql;
 
      execute v_sql;
    end loop;
  end loop; 
 
   v_sql := format('select 
                     channel, 
                     current_week, 
					 l0_name, 
					 l1_name, 
					 l2_name ,  
                     aoh_fwos_units,
                     aoh_fwos_cost,
					 atp_fwos_units,
                     atp_fwos_cost from fwos order by current_week');

		  
  raise notice 'v_sql : %',v_sql; 
   OPEN $1 FOR EXECUTE v_sql;
  return $1;
END;
$function$
;