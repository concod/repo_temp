--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:create_alerts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36859
--comment: initial changeset for create_alerts
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS item_smart.create_alerts(text);

CREATE OR REPLACE PROCEDURE item_smart.create_alerts(IN p_dept text)
 LANGUAGE plpgsql
AS $procedure$
declare 
  v_sql                 text;
  weeks_over_six_month  int4[];
  weeks_over_month      int[];      
  current_month         int4;
  days_over_six_month   int4;
  channels              text[]:= '{"Brick __ia_char_13 Mortar","E-Commerce"}';
  start_time            timestamp;
  end_time              timestamp;
  v_affected_rows       int:=0;
  weeks                 int[];
  tbl                   text;
  v_dept                text:=lower(regexp_replace(p_dept, '[ /.-]', '', 'g'));
begin
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

  select 
    array_agg(distinct split_part(tablename,'_',5)::bigint)
  into
    weeks
  from 
    pg_catalog.pg_tables 
  where 
    schemaname  = 'item_smart'
  and 
    tablename  like 'wp_master_%_20%'
  and
    split_part(tablename, '_', 5) ~ '^\d+$';

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
    create unlogged table public.lead_time_%s_%s as
    with min_fiscal_week_date as (
    select distinct phf.hierarchy_code,fiscal_year_month,sku.vendor_dc_lead_time, clr_start_date,fiscal_month_begin_week as start_fiscal_year_week, fiscal_month_begin_date
    from item_smart.mv_product_hierarchies_filter phf
    join item_smart.itemfact_sku sku 
    ON phf.hierarchy_code = sku.hierarchy_code  
    cross join (
	select distinct fiscal_year_month, fiscal_month_begin_date, min(fiscal_year_week) as  fiscal_month_begin_week
	  from "global".fiscal_date_mapping 
	 where fiscal_year_week = any(%L)
	group by fiscal_year_month,fiscal_month_begin_date
	)a
    where phf.country = %L
    ),
    lead_times AS (
    select
      hierarchy_code,
      fiscal_year_month,
      vendor_dc_lead_time,
      clr_start_date,
      start_fiscal_year_week,
      fiscal_month_begin_date as lead_time_start_date,
      fiscal_month_begin_date + vendor_dc_lead_time::int as lead_time_end_date
    from min_fiscal_week_date
    )
    select  
      hierarchy_code,
      fiscal_year_month,
      lead_time_start_date,
      lead_time_end_date,
      vendor_dc_lead_time,
      (select count(distinct fiscal_year_week)
         from "global".fiscal_date_mapping fdm 
        where calendar_date between lead_time_start_date and lead_time_end_date
      ) as lead_time_weeks,
      (select distinct fiscal_year_month
         from "global".fiscal_date_mapping fdm 
        where calendar_date = clr_start_date::date
      ) as exit_month
    from lead_times
    where fiscal_year_month = %s',
    v_dept,current_month,weeks,p_dept,current_month);
    
    raise notice 'step2:%',v_sql;
    execute v_sql;
   
    v_sql := format('drop table if exists public.bop_units_%s_%s',v_dept,current_month);
    raise notice 'step3:%',v_sql;
    execute v_sql;
   
    v_sql := format('
    create unlogged table public.bop_units_%s_%s as
    select dept ,channel, fiscal_year_month,hierarchy_code,coalesce(bop_units,0) bop_units
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
   
   
    v_sql := format('
    create unlogged table public.alerts_%s_%s as
	with base_data as (
	select 
	  wp.hierarchy_code ,
	  wp.channel,
	  wp.dept, 
	  fdm.fiscal_year_month as month,
      wp.product_type,
	  --wp
	  coalesce(sum(wp.written_sales_dollars),0) as wp_written_sales_dollars,
	  coalesce(sum(wp.written_sales_units),0) as wp_written_sales_unit,
	  coalesce(sum(wp.written_sales_cost),0) as wp_written_sales_cost,
	  coalesce(sum(wp.total_receipt_cost),0) as wp_total_receipt_cost,
	  coalesce(sum(wp.total_receipt_units),0) as wp_total_receipt_units,
	  coalesce(sum(wp.recomm_receipt_units),0) as wp_recomm_receipt_units,
	  --ty
	  coalesce(sum(ty.written_sales_dollars),0) as ty_written_sales_dollars,
	  --sum(ty.written_sales_units) as ty_written_sales_unit,
	  --sum(ty.written_sales_cost) as ty_written_sales_cost,
	  --sum(ty.atp_cost) as ty_atp_cost,
	  --sum(ty.total_receipt_cost) as ty_total_receipt_cost,
	  --sum(ty.total_receipt_units) as ty_total_receipt_units,
	  --op
	  coalesce(sum(op.written_sales_dollars),0) as op_written_sales_dollars,
	  coalesce(sum(op.written_sales_units),0) as op_written_sales_unit,
	  --sum(op.written_sales_cost) as op_written_sales_cost,
	  --sum(op.atp_cost) as op_atp_cost,
	  --sum(op.total_receipt_cost) as op_total_receipt_cost,
	  --sum(op.total_receipt_units) as op_total_receipt_units,
	  --lf
	  coalesce(sum(lf.written_sales_dollars),0) as lf_written_sales_dollars,
	  coalesce(sum(lf.written_sales_units),0) as lf_written_sales_unit,
	  --sum(lf.written_sales_cost) as lf_written_sales_cost,
	  --sum(lf.atp_cost) as lf_atp_cost,
	  --sum(lf.total_receipt_cost) as lf_total_receipt_cost,
	  --sum(lf.total_receipt_units) as lf_total_receipt_units,
	  --iaf
	  coalesce(sum(iaf.written_sales_dollars),0) as iaf_written_sales_dollars,
	  coalesce(sum(iaf.written_sales_units),0) as iaf_written_sales_unit,
	  --sum(iaf.written_sales_cost) as iaf_written_sales_cost,
	  --sum(iaf.atp_cost) as iaf_atp_cost,
	  --sum(iaf.total_receipt_cost) as iaf_total_receipt_cost,
	  --sum(iaf.total_receipt_units) as iaf_total_receipt_units,  
	  --ly
	  --sum(ly.written_sales_units) as ly_written_sales_unit,
	  --sum(ly.written_sales_cost) as ly_written_sales_cost,
	  --sum(ly.atp_cost) as ly_atp_cost,
	  --sum(ly.total_receipt_cost) as ly_total_receipt_cost,
	  --sum(ly.total_receipt_units) as ly_total_receipt_units,
	  --lly
	  coalesce(sum(lly.written_sales_dollars),0) as lly_written_sales_dollars
	  --sum(lly.written_sales_units) as lly_written_sales_unit,
	  --sum(lly.written_sales_cost) as lly_written_sales_cost,
	  --sum(lly.atp_cost) as lly_atp_cost,
	  --sum(lly.total_receipt_cost) as lly_total_receipt_cost,
	  --sum(lly.total_receipt_units) as lly_total_receipt_units   
	from 
	  item_smart.wp_master_%s wp
	left join
	  item_smart.ty_master_%s ty
	on
	  wp.dept  = ty.dept 
	and  
	  wp.channel = ty.channel
	and 
	  wp.hierarchy_code = ty.hierarchy_code
	and 
	  wp.current_week  = ty.current_week
    and 
      ty.dept = %L 
    and 
      ty.current_week = any(%L)
    and 
      ty.channel = ANY(%L) 
	left join
	  item_smart.op_master_%s op
	on
	  wp.dept  = op.dept
	and  
	  wp.channel = op.channel
	and 
	  wp.hierarchy_code = op.hierarchy_code
	and 
	  wp.current_week  = op.current_week
    and 
      op.dept = %L 
    and 
      op.current_week = any(%L)
    and 
      op.channel = ANY(%L) 
	left join
	  item_smart.lf_master_%s lf
	on
	  wp.dept  = lf.dept 
	and  
	  wp.channel = lf.channel
	and 
	  wp.hierarchy_code = lf.hierarchy_code
	and 
	  wp.current_week  = lf.current_week
    and 
      lf.dept = %L 
    and 
      lf.current_week = any(%L)
    and 
      lf.channel = ANY(%L)
	left join
	  item_smart.iaf_master_%s iaf
	on
	  wp.dept  = iaf.dept
	and  
	  wp.channel = iaf.channel
	and 
	  wp.hierarchy_code = iaf.hierarchy_code
	and 
	  wp.current_week  = iaf.current_week
    and 
      iaf.dept = %L 
    and 
      iaf.current_week = any(%L)
    and 
      iaf.channel = ANY(%L)  
	left join
	  item_smart.ly_master_%s ly
	on
	  wp.dept  = ly.dept
	and  
	  wp.channel = ly.channel
	and 
	  wp.hierarchy_code = ly.hierarchy_code
	and 
	  wp.current_week  = ly.current_week 
    and 
      ly.dept = %L 
    and 
      ly.current_week = any(%L)
    and 
      ly.channel = ANY(%L) 
	left join
	  item_smart.lly_master_%s lly
	on
	  wp.dept  = lly.dept 
	and  
	  wp.channel = lly.channel
   	and 
	  wp.hierarchy_code = lly.hierarchy_code
	and 
	  wp.current_week  = lly.current_week   
    and 
      lly.dept = %L 
    and 
      lly.current_week = any(%L)
    and 
      lly.channel = ANY(%L) 
	join
	  "global".fiscal_date_mapping fdm
	on 
	  wp.current_week  = fdm.fiscal_year_week  
	where 
	  wp.dept = %L 
	and 
	  wp.current_week = any(%L)
	and 
	  wp.channel = any(%L)
	group by 
	  wp.hierarchy_code,
	  wp.channel,
	  wp.dept, 
	  fdm.fiscal_year_month,
	  wp.product_type
	  ),

    final_data as (
	select
	  bd.dept,
      bd.product_type,
	  bd.channel,
	  bd.month,
	  bd.hierarchy_code,
      bd.wp_written_sales_dollars,
      bd.ty_written_sales_dollars,
      bd.op_written_sales_dollars,
      bd.lf_written_sales_dollars,
      bd.iaf_written_sales_dollars,
      -- Add style field
      phf.style,
	  case 
	    when wp_written_sales_unit > 100 
	         and (wp_written_sales_unit - op_written_sales_unit) / NULLIF(op_written_sales_unit, 0) >= 0.1
	      or wp_written_sales_unit > 100 
	         and (wp_written_sales_unit - op_written_sales_unit) / NULLIF(op_written_sales_unit, 0) <= -0.1
	      or wp_written_sales_unit >= 50 
	         and wp_written_sales_unit <= 99 
	         and (wp_written_sales_unit - op_written_sales_unit) / NULLIF(op_written_sales_unit, 0) >= 0.2
	      or wp_written_sales_unit >= 50 
	         and wp_written_sales_unit <= 99 
	         and (wp_written_sales_unit - op_written_sales_unit) / NULLIF(op_written_sales_unit, 0) <= -0.2
	      or wp_written_sales_unit >= 25 
	         and wp_written_sales_unit <= 49 
	         and (wp_written_sales_unit - op_written_sales_unit) / NULLIF(op_written_sales_unit, 0) >= 0.3
	      or wp_written_sales_unit >= 25 
	         and wp_written_sales_unit <= 49 
	         and (wp_written_sales_unit - op_written_sales_unit) / NULLIF(op_written_sales_unit, 0) <= -0.3
	      or wp_written_sales_unit < 25 
	         and (wp_written_sales_unit - op_written_sales_unit) / NULLIF(op_written_sales_unit, 0) >= 0.5
	      or wp_written_sales_unit < 25 
	         and (wp_written_sales_unit - op_written_sales_unit) / NULLIF(op_written_sales_unit, 0) <= -0.5
	    then true 
	    else false
	  end as var_sls_u_wp_op,
	  case 
	    when wp_written_sales_unit > 100 
	         and (wp_written_sales_unit - lf_written_sales_unit) / NULLIF(lf_written_sales_unit, 0) >= 0.1
	      or wp_written_sales_unit > 100 
	         and (wp_written_sales_unit - lf_written_sales_unit) / NULLIF(lf_written_sales_unit, 0) <= -0.1
	      or wp_written_sales_unit >= 50 
	         and wp_written_sales_unit <= 99 
	         and (wp_written_sales_unit - lf_written_sales_unit) / NULLIF(lf_written_sales_unit, 0) >= 0.2
	      or wp_written_sales_unit >= 50 
	         and wp_written_sales_unit <= 99 
	         and (wp_written_sales_unit - lf_written_sales_unit) / NULLIF(lf_written_sales_unit, 0) <= -0.2
	      or wp_written_sales_unit >= 25 
	         and wp_written_sales_unit <= 49 
	         and (wp_written_sales_unit - lf_written_sales_unit) / NULLIF(lf_written_sales_unit, 0) >= 0.3
	      or wp_written_sales_unit >= 25 
	         and wp_written_sales_unit <= 49 
	         and (wp_written_sales_unit - lf_written_sales_unit) / NULLIF(lf_written_sales_unit, 0) <= -0.3
	      or wp_written_sales_unit < 25 
	         and (wp_written_sales_unit - lf_written_sales_unit) / NULLIF(lf_written_sales_unit, 0) >= 0.5
	      or wp_written_sales_unit < 25 
	         and (wp_written_sales_unit - lf_written_sales_unit) / NULLIF(lf_written_sales_unit, 0) <= -0.5
	    then true 
	    else false 
	  end as var_sls_u_wp_lf,
	  case 
	    when wp_written_sales_unit > 100 
	         and (wp_written_sales_unit - iaf_written_sales_unit) / NULLIF(iaf_written_sales_unit, 0) >= 0.1
	      or wp_written_sales_unit > 100 
	         and (wp_written_sales_unit - iaf_written_sales_unit) / NULLIF(iaf_written_sales_unit, 0) <= -0.1
	      or wp_written_sales_unit >= 50 
	         and wp_written_sales_unit <= 99 
	         and (wp_written_sales_unit - iaf_written_sales_unit) / NULLIF(iaf_written_sales_unit, 0) >= 0.2
	      or wp_written_sales_unit >= 50 
	         and wp_written_sales_unit <= 99 
	         and (wp_written_sales_unit - iaf_written_sales_unit) / NULLIF(iaf_written_sales_unit, 0) <= -0.2
	      or wp_written_sales_unit >= 25 
	         and wp_written_sales_unit <= 49 
	         and (wp_written_sales_unit - iaf_written_sales_unit) / NULLIF(iaf_written_sales_unit, 0) >= 0.3
	      or wp_written_sales_unit >= 25 
	         and wp_written_sales_unit <= 49 
	         and (wp_written_sales_unit - iaf_written_sales_unit) / NULLIF(iaf_written_sales_unit, 0) <= -0.3
	      or wp_written_sales_unit < 25 
	         and (wp_written_sales_unit - iaf_written_sales_unit) / NULLIF(iaf_written_sales_unit, 0) >= 0.5
	      or wp_written_sales_unit < 25 
	         and (wp_written_sales_unit - iaf_written_sales_unit) / NULLIF(iaf_written_sales_unit, 0) <= -0.5
	    then true 
	    else false 
	  end as var_sls_u_wp_iaf,
	  case 
	    when bd.product_type = 0 
        then
	        case 
              when ABS((wp_recomm_receipt_units - wp_total_receipt_units) / NULLIF(wp_total_receipt_units, 0)) >= 0.15
	            or ABS((wp_recomm_receipt_units - wp_total_receipt_units) / NULLIF(wp_total_receipt_units, 0)) <= -0.15 
              then 
                true 
              else 
                false
             end  
	    end as rec_rcpt_u_ttl_rcpt_u,
	  case 
         when bd.product_type = 0 
	     then
	        case
              when wp_total_receipt_units < coalesce(isww.moq::int , 0) 
              then 
                true 
              else 
                false 
            end
	  end as ttl_rcpt_moq,
      case 
      when bd.product_type = 0 then
        case 
            when bd.month > lt.exit_month 
                 and (bop.bop_units / nullif(nsls.normalized_sales, 0)) > 
                     case 
                         when bd.channel = ''E-Commerce'' then 4 
                         when bd.channel = ''Brick & Mortar'' then 6 
						 else 0
                     end
            then true
            else false 
        end 
      end as fwos_exit_date,
	  case 
         when bd.product_type = 0 
	     then
            case 
              when (bop.bop_units/nullif(nsls.normalized_sales,0)) < lt.lead_time_weeks 
              then 
                true 
              else 
                false 
            end 
	  end as fwos_lead_time
	from 
	  base_data bd
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
     isww.hierarchy_code =  phf.hierarchy_code 
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
	  bd.month = lt.fiscal_year_month)
    select *
    from final_data where month = %s',
      v_dept,current_month,
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

     GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
     end_time := clock_timestamp();
     raise notice 'dept = [%] month = [%] rows = [%] time = [%]',p_dept,current_month,v_affected_rows,end_time - start_time; 
  end loop;
end;  
$procedure$
;
