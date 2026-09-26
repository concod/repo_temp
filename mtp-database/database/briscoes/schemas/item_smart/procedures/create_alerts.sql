--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:create_alerts_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for create_alerts
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS item_smart.create_alerts(IN p_dept text);
CREATE OR REPLACE PROCEDURE item_smart.create_alerts(IN p_dept text)
 LANGUAGE plpgsql
AS $procedure$
declare 
  v_sql                 text;
  weeks_over_six_month  int4[];
  weeks_over_month      int[];      
  current_month         int4;
  days_over_six_month   int4;
  channels              text[]:= '{"BnM","WEB","DC"}';
  start_time            timestamp;
  end_time              timestamp;
  v_affected_rows       int:=0;
  weeks                 int[];
  tbl                   text;
  v_dept                text:=lower(regexp_replace(p_dept, '[ /.-]', '', 'g'));
begin
  -- Set work memory for better sort/join performance
  set work_mem = '2GB';
  set maintenance_work_mem = '2GB';
  set effective_io_concurrency = 200;  -- Increase parallel IO operations
  set max_parallel_workers_per_gather = 4;  -- Increase parallel workers
  set application_name = 'Item Smart alerts creation';
 
  for tbl in (select tablename
                from pg_catalog.pg_tables 
               where tablename like 'alerts_' || v_dept || '_%'
                 and schemaname  = 'public'
             )
  loop
	  v_sql := 'drop table '||tbl;
      raise notice 'v_sql:%',v_sql;
	  execute v_sql; 
  end loop; 

  SELECT 
    array_agg(DISTINCT week) AS weeks
  into 
    weeks
  FROM 
    item_smart.table_partition_mapping
  WHERE 
    table_name LIKE 'wp_master1%';
     

  
  raise notice 'weeks:%',weeks;
 
  for   current_month,
        weeks_over_month,
        days_over_six_month,
        weeks_over_six_month 
  in execute format('
      select 
        fiscal_year_month,
        weeks_over_month,
        sum(no_of_days_in_month) OVER (ORDER BY fiscal_year_month ROWS BETWEEN CURRENT ROW AND 5 FOLLOWING) AS days_over_six_month,
        string_to_array(string_agg(weeks_in_month,'','') OVER (ORDER BY fiscal_year_month ROWS BETWEEN CURRENT ROW AND 5 FOLLOWING),'','')::int[] AS weeks_over_six_month
      from           
        (select 
           count(*) as no_of_days_in_month,
           fiscal_year_month, 
           string_agg( distinct fiscal_year_week::text,'','') as weeks_in_month,
           array_agg( distinct fiscal_year_week) as weeks_over_month
         from 
           "global".fiscal_date_mapping 
         where 
           fiscal_year_week = any(%L)
         group by 
         fiscal_year_month
        ) a',weeks)
   loop
	start_time := clock_timestamp();
   
    v_sql := format('drop table if exists public.lead_time_%s_%s',v_dept,current_month::text);
    raise notice 'step1:%',v_sql;
    execute v_sql;
   
    v_sql := format('
    CREATE UNLOGGED TABLE public.lead_time_%s_%s AS
    WITH min_fiscal_week_date AS (
        SELECT DISTINCT 
            phf.hierarchy_code,
            a.fiscal_year_month,
            sku.lead_time,
            sku.exit_date,
            a.fiscal_month_begin_week AS start_fiscal_year_week,
            a.fiscal_month_begin_date
        FROM item_smart.mv_product_hierarchies_filter phf
        JOIN item_smart.itemfact_sku sku 
            ON phf.hierarchy_code = sku.hierarchy_code  
        CROSS JOIN (
            SELECT DISTINCT 
                fiscal_year_month, 
                fiscal_month_begin_date, 
                MIN(fiscal_year_week) AS fiscal_month_begin_week
            FROM "global".fiscal_date_mapping 
            WHERE fiscal_year_week = ANY(%L)
            GROUP BY fiscal_year_month, fiscal_month_begin_date
        ) a
        WHERE phf.l1_name = %L
    ), 
    lead_times AS (
        SELECT
            hierarchy_code,
            fiscal_year_month,
            lead_time,
            exit_date,
            start_fiscal_year_week,
            fiscal_month_begin_date AS lead_time_start_date,
            fiscal_month_begin_date + lead_time::INT AS lead_time_end_date
        FROM min_fiscal_week_date
    )
    SELECT  
        hierarchy_code,
        fiscal_year_month,
        lead_time_start_date,
        lead_time_end_date,
        lead_time,
        (
            SELECT COUNT(DISTINCT fiscal_year_week)
            FROM "global".fiscal_date_mapping fdm 
            WHERE fdm.calendar_date BETWEEN lead_times.lead_time_start_date AND lead_times.lead_time_end_date
        ) AS lead_time_weeks,
        (
            SELECT fiscal_year_month
            FROM "global".fiscal_date_mapping fdm 
            WHERE fdm.calendar_date = lead_times.exit_date::DATE
            LIMIT 1
        ) AS exit_month
    FROM lead_times
    WHERE fiscal_year_month = %s',
    v_dept, current_month, weeks, p_dept, current_month);
   
    raise notice 'step2:%',v_sql;
    execute v_sql;
   
    v_sql := format('drop table if exists public.bop_units_%s_%s',v_dept,current_month);
    raise notice 'step3:%',v_sql;
    execute v_sql;
   
    v_sql := format('
    create unlogged table public.bop_units_%s_%s as
    select dept,channel, fiscal_year_month,hierarchy_code,coalesce(bop_units,0) bop_units
      from item_smart.wp_master_%s w
      join (select 
              fiscal_year_month,
              min(fiscal_year_week) first_week_of_month
            from 
              ( select distinct fiscal_year_month,fiscal_year_week
                  from "global".fiscal_date_mapping fdm
                 where fiscal_year_month = %s
              ) a 
            group by 
              fiscal_year_month
            ) b 
    on
      w.dept = %L 
    and 
      w.channel = any(%L)
    and
      w.current_week  = b.first_week_of_month',
     v_dept,current_month,v_dept,current_month,p_dept,channels);
   
    raise notice 'step3:%',v_sql;
    execute v_sql;
   
   
    v_sql := format('drop table if exists public.normalized_sales_%s_%s',v_dept,current_month);
    raise notice 'step4:%',v_sql;
    execute v_sql;
   
    v_sql := format('
    create unlogged table public.normalized_sales_%s_%s as
    select 
      dept,
      channel,
      %L::int4 fiscal_year_month,
      hierarchy_code,
      ((sum(coalesce(written_sales_units,0))*7)/%s)::float as normalized_sales 
    from 
      item_smart.wp_master_%s w
    where         
      w.dept = %L 
    and 
      w.channel = ANY(%L)
    and 
      w.current_week = any(%L)
    group by 
     dept,
     channel,
     fiscal_year_month,
     hierarchy_code',
     v_dept,current_month,current_month,days_over_six_month,v_dept,p_dept,channels,weeks_over_six_month);
    
    raise notice 'step5:%',v_sql;
    execute v_sql;
   
    v_sql := format('drop table if exists public.alerts_%s_%s',v_dept,current_month);
    raise notice 'step6:%',v_sql;
    execute v_sql;
   
    v_sql := format('
    create unlogged table public.alerts_%s_%s WITH (parallel_workers = 4) as
    with base_data as (
      select 
        wp.hierarchy_code,
        wp.channel,
        wp.dept, 
        fdm.fiscal_year_month as month,
        wp.product_type,
        sum(wp.written_sales_dollars) as wp_written_sales_dollars,
        sum(wp.written_sales_units) as wp_written_sales_unit,
        sum(wp.written_sales_cost) as wp_written_sales_cost,
        sum(wp.atp_cost) as wp_atp_cost,
        sum(wp.total_receipt_cost) as wp_total_receipt_cost,
        sum(wp.total_receipt_units) as wp_total_receipt_units,
        sum(wp.recomm_receipt_units) as wp_recomm_receipt_units,
        sum(ty.written_sales_dollars) as ty_written_sales_dollars,
        sum(op.written_sales_dollars) as op_written_sales_dollars,
        sum(op.written_sales_units) as op_written_sales_unit,
        sum(lf.written_sales_dollars) as lf_written_sales_dollars,
        sum(lf.written_sales_units) as lf_written_sales_unit,
        sum(iaf.written_sales_dollars) as iaf_written_sales_dollars,
        sum(iaf.written_sales_units) as iaf_written_sales_unit,
        sum(ly.written_sales_dollars) as ly_written_sales_dollars,
        sum(lly.written_sales_dollars) as lly_written_sales_dollars
      from 
        item_smart.wp_master1_%s wp
      -- Use LATERAL joins for better performance with complex conditions
      LEFT JOIN LATERAL (
        select written_sales_dollars
        from item_smart.ty_master1_%s ty
        where ty.dept = wp.dept 
        and ty.channel = wp.channel
        and ty.hierarchy_code = wp.hierarchy_code
        and ty.current_week = wp.current_week
        and ty.dept = %L 
        and ty.current_week = any(%L)
        and ty.channel = ANY(%L)
      ) ty ON true
      -- Similar LATERAL joins for other tables
      LEFT JOIN LATERAL (
        select written_sales_dollars, written_sales_units
        from item_smart.op_master1_%s op
        where op.dept = wp.dept 
        and op.channel = wp.channel
        and op.hierarchy_code = wp.hierarchy_code
        and op.current_week = wp.current_week
        and op.dept = %L 
        and op.current_week = any(%L)
        and op.channel = ANY(%L)
      ) op ON true
      LEFT JOIN LATERAL (
        select written_sales_dollars, written_sales_units
        from item_smart.lf_master1_%s lf
        where lf.dept = wp.dept 
        and lf.channel = wp.channel
        and lf.hierarchy_code = wp.hierarchy_code
        and lf.current_week = wp.current_week
        and lf.dept = %L 
        and lf.current_week = any(%L)
        and lf.channel = ANY(%L)
      ) lf ON true
      LEFT JOIN LATERAL (
        select written_sales_dollars, written_sales_units
        from item_smart.iaf_master1_%s iaf
        where iaf.dept = wp.dept 
        and iaf.channel = wp.channel
        and iaf.hierarchy_code = wp.hierarchy_code
        and iaf.current_week = wp.current_week
        and iaf.dept = %L 
        and iaf.current_week = any(%L)
        and iaf.channel = ANY(%L)
      ) iaf ON true
      LEFT JOIN LATERAL (
        select written_sales_dollars
        from item_smart.ly_master1_%s ly
        where ly.dept = wp.dept 
        and ly.channel = wp.channel
        and ly.hierarchy_code = wp.hierarchy_code
        and ly.current_week = wp.current_week
        and ly.dept = %L 
        and ly.current_week = any(%L)
        and ly.channel = ANY(%L)
      ) ly ON true
      LEFT JOIN LATERAL (
        select written_sales_dollars
        from item_smart.lly_master1_%s lly
        where lly.dept = wp.dept 
        and lly.channel = wp.channel
        and lly.hierarchy_code = wp.hierarchy_code
        and lly.current_week = wp.current_week
        and lly.dept = %L 
        and lly.current_week = any(%L)
        and lly.channel = ANY(%L)
      ) lly ON true
      join
        "global".fiscal_date_mapping fdm
      on 
        wp.current_week  = fdm.fiscal_year_week  
      where 
        wp.dept = %L 
        and wp.current_week = any(%L)
        and wp.channel = any(%L)
      group by 
        wp.hierarchy_code,
        wp.channel,
        wp.dept, 
        fdm.fiscal_year_month,
        wp.product_type
    )
    -- Use materialized CTE for better performance
    , base_data_materialized as materialized (
      select * from base_data
    )
    , final_data as (
    select
      bd.dept,
      phf.l3_name,
      bd.channel,
      bd.month,
      bd.hierarchy_code,
      phf.l2_name,
      bd.wp_written_sales_dollars,
      bd.wp_written_sales_cost,
      bd.wp_atp_cost,
      bd.ty_written_sales_dollars,
      bd.ly_written_sales_dollars,
      bd.op_written_sales_dollars,
      bd.lf_written_sales_dollars,
      case 
        when bd.wp_written_sales_unit > 100 
             and (bd.wp_written_sales_unit - bd.op_written_sales_unit) / NULLIF(bd.op_written_sales_unit, 0) >= 0.1
          or bd.wp_written_sales_unit > 100 
             and (bd.wp_written_sales_unit - bd.op_written_sales_unit) / NULLIF(bd.op_written_sales_unit, 0) <= -0.1
          or bd.wp_written_sales_unit >= 50 
             and bd.wp_written_sales_unit <= 99 
             and (bd.wp_written_sales_unit - bd.op_written_sales_unit) / NULLIF(bd.op_written_sales_unit, 0) >= 0.2
          or bd.wp_written_sales_unit >= 50 
             and bd.wp_written_sales_unit <= 99 
             and (bd.wp_written_sales_unit - bd.op_written_sales_unit) / NULLIF(bd.op_written_sales_unit, 0) <= -0.2
          or bd.wp_written_sales_unit >= 25 
             and bd.wp_written_sales_unit <= 49 
             and (bd.wp_written_sales_unit - bd.op_written_sales_unit) / NULLIF(bd.op_written_sales_unit, 0) >= 0.3
          or bd.wp_written_sales_unit >= 25 
             and bd.wp_written_sales_unit <= 49 
             and (bd.wp_written_sales_unit - bd.op_written_sales_unit) / NULLIF(bd.op_written_sales_unit, 0) <= -0.3
          or bd.wp_written_sales_unit < 25 
             and (bd.wp_written_sales_unit - bd.op_written_sales_unit) / NULLIF(bd.op_written_sales_unit, 0) >= 0.5
          or bd.wp_written_sales_unit < 25 
             and (bd.wp_written_sales_unit - bd.op_written_sales_unit) / NULLIF(bd.op_written_sales_unit, 0) <= -0.5
        then true 
        else false
      end as var_sls_u_wp_op,
      case 
        when bd.wp_written_sales_unit > 100 
             and (bd.wp_written_sales_unit - bd.lf_written_sales_unit) / NULLIF(bd.lf_written_sales_unit, 0) >= 0.1
          or bd.wp_written_sales_unit > 100 
             and (bd.wp_written_sales_unit - bd.lf_written_sales_unit) / NULLIF(bd.lf_written_sales_unit, 0) <= -0.1
          or bd.wp_written_sales_unit >= 50 
             and bd.wp_written_sales_unit <= 99 
             and (bd.wp_written_sales_unit - bd.lf_written_sales_unit) / NULLIF(bd.lf_written_sales_unit, 0) >= 0.2
          or bd.wp_written_sales_unit >= 50 
             and bd.wp_written_sales_unit <= 99 
             and (bd.wp_written_sales_unit - bd.lf_written_sales_unit) / NULLIF(bd.lf_written_sales_unit, 0) <= -0.2
          or bd.wp_written_sales_unit >= 25 
             and bd.wp_written_sales_unit <= 49 
             and (bd.wp_written_sales_unit - bd.lf_written_sales_unit) / NULLIF(bd.lf_written_sales_unit, 0) >= 0.3
          or bd.wp_written_sales_unit >= 25 
             and bd.wp_written_sales_unit <= 49 
             and (bd.wp_written_sales_unit - bd.lf_written_sales_unit) / NULLIF(bd.lf_written_sales_unit, 0) <= -0.3
          or bd.wp_written_sales_unit < 25 
             and (bd.wp_written_sales_unit - bd.lf_written_sales_unit) / NULLIF(bd.lf_written_sales_unit, 0) >= 0.5
          or bd.wp_written_sales_unit < 25 
             and (bd.wp_written_sales_unit - bd.lf_written_sales_unit) / NULLIF(bd.lf_written_sales_unit, 0) <= -0.5
        then true 
        else false 
      end as var_sls_u_wp_lf,
      case 
        when bd.wp_written_sales_unit > 100 
             and (bd.wp_written_sales_unit - bd.iaf_written_sales_unit) / NULLIF(bd.iaf_written_sales_unit, 0) >= 0.1
          or bd.wp_written_sales_unit > 100 
             and (bd.wp_written_sales_unit - bd.iaf_written_sales_unit) / NULLIF(bd.iaf_written_sales_unit, 0) <= -0.1
          or bd.wp_written_sales_unit >= 50 
             and bd.wp_written_sales_unit <= 99 
             and (bd.wp_written_sales_unit - bd.iaf_written_sales_unit) / NULLIF(bd.iaf_written_sales_unit, 0) >= 0.2
          or bd.wp_written_sales_unit >= 50 
             and bd.wp_written_sales_unit <= 99 
             and (bd.wp_written_sales_unit - bd.iaf_written_sales_unit) / NULLIF(bd.iaf_written_sales_unit, 0) <= -0.2
          or bd.wp_written_sales_unit >= 25 
             and bd.wp_written_sales_unit <= 49 
             and (bd.wp_written_sales_unit - bd.iaf_written_sales_unit) / NULLIF(bd.iaf_written_sales_unit, 0) >= 0.3
          or bd.wp_written_sales_unit >= 25 
             and bd.wp_written_sales_unit <= 49 
             and (bd.wp_written_sales_unit - bd.iaf_written_sales_unit) / NULLIF(bd.iaf_written_sales_unit, 0) <= -0.3
          or bd.wp_written_sales_unit < 25 
             and (bd.wp_written_sales_unit - bd.iaf_written_sales_unit) / NULLIF(bd.iaf_written_sales_unit, 0) >= 0.5
          or bd.wp_written_sales_unit < 25 
             and (bd.wp_written_sales_unit - bd.iaf_written_sales_unit) / NULLIF(bd.iaf_written_sales_unit, 0) <= -0.5
        then true 
        else false 
      end as var_sls_u_wp_iaf,
      case 
        when bd.product_type = 0 
        then
          case 
            when ABS((bd.wp_recomm_receipt_units - bd.wp_total_receipt_units) / NULLIF(bd.wp_total_receipt_units, 0)) >= 0.15
              or ABS((bd.wp_recomm_receipt_units - bd.wp_total_receipt_units) / NULLIF(bd.wp_total_receipt_units, 0)) <= -0.15 
            then true 
            else false
           end  
      end as rec_rcpt_u_ttl_rcpt_u,
      case 
         when bd.product_type = 0 
         then
            case
              when bd.wp_total_receipt_units < coalesce(isww.moq::int , 0) 
              then true 
              else false 
            end
      end as ttl_rcpt_moq,
      case 
         when bd.product_type = 0 
         then
            case 
              when bd.month > lt.exit_month and (bop.bop_units/nullif(nsls.normalized_sales,0)) > 4 
              then true 
              else false 
            end 
      end as fwos_exit_date,
      case 
         when bd.product_type = 0 
         then
            case 
              when (bop.bop_units/nullif(nsls.normalized_sales,0)) < lt.lead_time_weeks 
              then true 
              else false 
            end 
      end as fwos_lead_time
    from 
      base_data_materialized bd
    left join 
      item_smart.mv_product_hierarchies_filter phf 
    on 
      bd.hierarchy_code = phf.hierarchy_code
    left join
     (select 
        distinct hierarchy_code, moq 
      from 
      item_smart.itemfact_sku isw) isww
    on
     isww.hierarchy_code = phf.hierarchy_code 
    left join
      bop_units_%s_%s bop
    on
      bd.hierarchy_code = bop.hierarchy_code
    and 
      bd.channel = bop.channel
    and 
      bd.month = bop.fiscal_year_month
    left join
      normalized_sales_%s_%s nsls
    on
      bd.hierarchy_code = nsls.hierarchy_code
    and 
      bd.channel = nsls.channel
    and 
      bd.month = nsls.fiscal_year_month	  
    left join
      lead_time_%s_%s lt
    on
      bd.hierarchy_code = lt.hierarchy_code
    and 
      bd.month = lt.fiscal_year_month
)
    select *
    from final_data 
    where month = %s',
    v_dept, current_month,
    v_dept,v_dept,
    p_dept,weeks_over_month,channels,
    v_dept,
    p_dept,weeks_over_month,channels,
    v_dept,
    p_dept,weeks_over_month,channels,
    v_dept,
    p_dept,weeks_over_month,channels,
    v_dept,
    p_dept,weeks_over_month,channels,
    v_dept,
    p_dept,weeks_over_month,channels,
    p_dept,weeks_over_month,channels,
    v_dept,current_month,
    v_dept,current_month,
    v_dept,current_month,
    current_month);
     
     raise notice 'step6:%',v_sql;
     execute v_sql;

     -- Create regular indexes on temporary tables (removed CONCURRENTLY)
     EXECUTE format('
       CREATE INDEX IF NOT EXISTS idx_bop_units_%s_%s_hierarchy 
       ON public.bop_units_%s_%s (hierarchy_code, channel)',
       v_dept, current_month, v_dept, current_month
     );

     EXECUTE format('
       CREATE INDEX IF NOT EXISTS idx_normalized_sales_%s_%s_hierarchy 
       ON public.normalized_sales_%s_%s (hierarchy_code, channel)',
       v_dept, current_month, v_dept, current_month
     );

     GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
     end_time := clock_timestamp();
     raise notice 'dept = [%] month = [%] rows = [%] time = [%]',p_dept,current_month,v_affected_rows,end_time - start_time;
  end loop;
end;  
$procedure$
;
