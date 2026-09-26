--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:create_alerts_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_alerts
--comment:  overlap issue fixed st % changed
DROP PROCEDURE IF EXISTS item_smart.create_alerts(IN p_dept text);
CREATE OR REPLACE PROCEDURE item_smart.create_alerts(IN p_dept text)
 LANGUAGE plpgsql
AS $procedure$
declare
  v_sql                 text;
  -- st_info_agg_sql       text; -- REMOVED: No longer needed as sku_st_info is joined directly
  weeks_over_year       int[];
  current_year          int4;
  channels              text[]:='{"Ecom","Indirect","Store"}';
  sub_channels          text[]:= '{"Hybris","NordstromDSCO","Amazon","PotteryBarnEDI","WilliamSonomaEDI","SAKS","NordstromRackDSCO","Walmart","Serena And Lily","Balsam Hill Studio"}';
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
  array_agg(distinct w.current_week order by w.current_week)
into weeks
from (
    select distinct current_week
    from item_smart.wp_master
    where dept = p_dept
    union
    select distinct current_week
    from item_smart.ty_master
    where dept = p_dept
) w;


  raise notice 'weeks:%',weeks;

  for current_year,
      weeks_over_year
  in execute format('
            select
                fiscal_year,
                array_agg(distinct fiscal_year_week) as weeks_over_year
             from
                "global".fiscal_date_mapping
              where
                 fiscal_year_week = any(%L)
              group by
                 fiscal_year
        ', weeks)
  loop

    begin
  start_time := clock_timestamp();


    v_sql := format('drop table if exists public.eop_units_%s_%s',v_dept,current_year);
    raise notice 'step4:%',v_sql;
    execute v_sql;

    v_sql := format('
    create unlogged table public.eop_units_%s_%s as
    select dept,channel, sub_channel, fiscal_year,hierarchy_code,coalesce(eop_units,0) eop_units
      from item_smart.wp_master_%s w
      join (select
              fiscal_year,
              max(fiscal_year_week) last_week_of_year
            from
              ( select distinct fiscal_year,fiscal_year_week
                  from "global".fiscal_date_mapping fdm
                 where fiscal_year = %s
              ) a
            group by
              fiscal_year
            ) b
    on
      w.dept = %L
    and
      w.channel = any(%L)
    and
      w.sub_channel is not null
    and
      w.current_week  = b.last_week_of_year',
     v_dept,current_year,v_dept,current_year,p_dept,channels);

   raise notice 'step5:%',v_sql;
   execute v_sql;



    v_sql := format('drop table if exists public.bop_units_%s_%s',v_dept,current_year);

    raise notice 'table created:%',v_sql;
    execute v_sql;


   v_sql := format('
    create unlogged table public.bop_units_%s_%s as
    select  dept,channel, sub_channel, fiscal_year,hierarchy_code,coalesce(bop_units,0) bop_units
      from item_smart.wp_master_%s w
      join (select
              fiscal_year,
              min(fiscal_year_week) first_week_of_year
            from
              ( select distinct fiscal_year,fiscal_year_week
                  from "global".fiscal_date_mapping fdm
                 where fiscal_year = %s
              ) a
            group by
              fiscal_year
            ) b
	on w.current_week = b.first_week_of_year
    where w.dept = %L
    and w.channel = any(%L)
    and w.sub_channel is not null',
     v_dept,current_year,v_dept,current_year,p_dept,channels);


 raise notice 'table created:%',v_sql;
 execute v_sql;


    v_sql := format('
    create unlogged table public.alerts_%s_%s as
  with base_data as (
  select
    wp.hierarchy_code ,
    wp.channel,
    wp.sub_channel,
    wp.dept,
    fdm.fiscal_year as year,
	sum(wp.recommended_u_supply) as wp_recommended_u_supply,
    --wp
    coalesce(sum(wp.written_sales_dollars),0) as wp_written_sales_dollars,
    sum(wp.written_sales_units) as wp_written_sales_unit,
    coalesce(sum(wp.written_sales_cost),0) as wp_written_sales_cost,
    coalesce(sum(wp.total_receipt_cost),0) as wp_total_receipt_cost,
    coalesce(sum(wp.total_receipt_units),0) as wp_total_receipt_units,
    coalesce(sum(wp.recomm_receipt_units),0) as wp_recomm_receipt_units,
      coalesce(sum(wp.discount),0)::float / nullif(coalesce(sum(wp.written_sales_dollars),0)
      + coalesce(sum(wp.discount),0),0) as wp_discount_rate,
      coalesce(avg(wp.auc_first),0) as wp_auc_first_cost,
      sum(wp.on_order_unplaced_total_unit) as wp_unplaced_total_units,
    --ty
    sum(wp.written_sales_dollars) as ty_written_sales_dollars,
      --coalesce(avg(wp.auc_first),0) as ty_auc_first_cost,
    --coalesce(avg(wp.written_dr_perc),0) as ty_discount_rate,
    --sum(ty.written_sales_units) as ty_written_sales_unit,
    --sum(ty.written_sales_cost) as ty_written_sales_cost,
    --sum(ty.atp_cost) as ty_atp_cost,
    --sum(ty.total_receipt_cost) as ty_total_receipt_cost,
    --sum(ty.total_receipt_units) as ty_total_receipt_units,

    --op
    sum(op.written_sales_dollars) as op_written_sales_dollars,
      --coalesce(avg(op.auc_first),0) as op_auc_first_cost,
    --  coalesce(sum(op.written_sales_units),0) as op_written_sales_unit,
 sum(op.written_sales_units) as op_written_sales_unit, -- MTP-105084
      --coalesce(sum(op.written_dr_perc),0) as op_discount_rate,
    --sum(op.written_sales_cost) as op_written_sales_cost,
    --sum(op.atp_cost) as op_atp_cost,
    --sum(op.total_receipt_cost) as op_total_receipt_cost,
    --sum(op.total_receipt_units) as op_total_receipt_units,
    --lf
    sum(lf.written_sales_dollars) as lf_written_sales_dollars,
     -- coalesce(avg(lf.auc_first),0) as lf_auc_first_cost,
      sum(lf.written_sales_units) as lf_written_sales_unit,
   -- coalesce(sum(lf.written_dr_perc),0) as lf_discount_rate,
    --sum(lf.written_sales_cost) as lf_written_sales_cost,
    --sum(lf.atp_cost) as lf_atp_cost,
    --sum(lf.total_receipt_cost) as lf_total_receipt_cost,
    --sum(lf.total_receipt_units) as lf_total_receipt_units,
    --iaf
    sum(iaf.written_sales_dollars) as iaf_written_sales_dollars,
      --coalesce(avg(iaf.auc_first),0) as iaf_auc_first_cost,
    sum(iaf.written_sales_units) as iaf_written_sales_unit,
      coalesce(sum(iaf.discount),0)::float / nullif(coalesce(sum(iaf.written_sales_dollars),0)
      + coalesce(sum(iaf.discount),0),0) as iaf_discount_rate,
    --sum(iaf.written_sales_cost) as iaf_written_sales_cost,
    --sum(iaf.atp_cost) as iaf_atp_cost,
    --sum(iaf.total_receipt_cost) as iaf_total_receipt_cost,
    --sum(iaf.total_receipt_units) as iaf_total_receipt_units,
    --ly
    sum(ly.written_sales_dollars) as ly_written_sales_dollars,
      coalesce(avg(ly.auc_first),0) as ly_auc_first_cost,
      --coalesce(avg(ly.written_dr_perc),0) as ly_discount_rate,
    --sum(ly.written_sales_units) as ly_written_sales_unit,
    --sum(ly.written_sales_cost) as ly_written_sales_cost,
    --sum(ly.atp_cost) as ly_atp_cost,
    --sum(ly.total_receipt_cost) as ly_total_receipt_cost,
    --sum(ly.total_receipt_units) as ly_total_receipt_units,
    --lly
    sum(lly.written_sales_dollars) as lly_written_sales_dollars
      --coalesce(avg(lly.written_dr_perc),0) as lly_discount_rate
      --coalesce(avg(lly.auc_first),0) as lly_auc_first_cost
    --sum(lly.written_sales_units) as lly_written_sales_unit
    --sum(lly.written_sales_cost) as lly_written_sales_cost
    --sum(lly.atp_cost) as lly_atp_cost
    --sum(lly.total_receipt_cost) as lly_total_receipt_cost
    --sum(lly.total_receipt_units) as lly_total_receipt_units
  from
      (
            SELECT * FROM item_smart.wp_master_%s  
            UNION ALL
            SELECT * FROM item_smart.ty_master_%s 

        ) AS wp
  left join
    item_smart.op_master_%s op
  on
    wp.dept  = op.dept
  and
    wp.channel = op.channel
    and
      wp.sub_channel = op.sub_channel
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
    and
      op.sub_channel is not null
  left join
    item_smart.lf_master_%s lf
  on
    wp.dept  = lf.dept
  and
    wp.channel = lf.channel
    and
      wp.sub_channel = lf.sub_channel
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
    and
      lf.sub_channel is not null
  left join
    item_smart.iaf_master_%s iaf
  on
    wp.dept  = iaf.dept
  and
    wp.channel = iaf.channel
    and
      wp.sub_channel = iaf.sub_channel
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
    and
      iaf.sub_channel is not null
  left join
    item_smart.ly_master_%s ly
  on
    wp.dept  = ly.dept
  and
    wp.channel = ly.channel
    and
      wp.sub_channel = ly.sub_channel
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
    and
     ly.sub_channel is not null
  left join
    item_smart.lly_master_%s lly
  on
    wp.dept  = lly.dept
  and
    wp.channel = lly.channel
    and
      wp.sub_channel = lly.sub_channel
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
    and
      lly.sub_channel is not null
  join
    (select distinct fiscal_year_week, fiscal_year from "global".fiscal_date_mapping) fdm
  on
    wp.current_week  = fdm.fiscal_year_week
  where
    wp.dept = %L
  and
    wp.current_week = any(%L)
  and
    wp.channel = any(%L)
    and
      wp.sub_channel is not null
  group by
    wp.hierarchy_code,
    wp.channel,
      wp.sub_channel,
    wp.dept,
    fdm.fiscal_year
    ),
    final_data as (
  select distinct
    bd.dept,
      phf.l0_name,
      phf.l2_name,
      phf.l3_name,
    bd.channel,
      bd.sub_channel,
    bd.year,
    bd.hierarchy_code,
      phf.minimum_order_quantity,
      bd.wp_written_sales_dollars,
      bd.wp_written_sales_cost,
      bd.wp_written_sales_unit,
      bd.ty_written_sales_dollars,
      bd.ly_written_sales_dollars,
      bd.op_written_sales_dollars,
      bd.lf_written_sales_dollars,
      bd.iaf_written_sales_dollars,
      bd.wp_discount_rate,
      bd.wp_auc_first_cost,
      bd.wp_unplaced_total_units,
      bd.iaf_discount_rate,
      bd.ly_auc_first_cost,
      bd.wp_recomm_receipt_units,
      bd.op_written_sales_unit,
      bd.lf_written_sales_unit,
      bd.iaf_written_sales_unit,
    bop.bop_units,
      eop.eop_units,
      st.st_perc,
case
    when op_written_sales_unit is null then false
    when op_written_sales_unit < 0 then false

    when op_written_sales_unit = 0
         and wp_written_sales_unit >= 50
    then true

    when op_written_sales_unit > 0
         and wp_written_sales_unit >= 50
         and (wp_written_sales_unit - op_written_sales_unit) / op_written_sales_unit >= 0.2
    then true

    else false
end as var_sls_u_wp_op_pos,
case
    when op_written_sales_unit is null then false
    when op_written_sales_unit <= 0 then false

    when op_written_sales_unit > 0
         and wp_written_sales_unit >= 50
         and (wp_written_sales_unit - op_written_sales_unit) / op_written_sales_unit <= -0.2
    then true
    else false
end as var_sls_u_wp_op_neg,
case
    when lf_written_sales_unit is null then false
    when lf_written_sales_unit < 0 then false

    when lf_written_sales_unit = 0
         and wp_written_sales_unit >= 50
    then true

    when lf_written_sales_unit > 0
         and wp_written_sales_unit >= 50
         and (wp_written_sales_unit - lf_written_sales_unit) / lf_written_sales_unit >= 0.2
    then true

    else false
end as var_sls_u_wp_lf_pos,
case
    when lf_written_sales_unit is null then false
    when lf_written_sales_unit <= 0 then false
    when lf_written_sales_unit > 0
         and wp_written_sales_unit >= 50
         and (wp_written_sales_unit - lf_written_sales_unit) / lf_written_sales_unit <= -0.2
    then true
    else false
end as var_sls_u_wp_lf_neg,
case
    when iaf_written_sales_unit is null then false
    when iaf_written_sales_unit < 0 then false

    when iaf_written_sales_unit = 0
         and wp_written_sales_unit >= 50
    then true

    when iaf_written_sales_unit > 0
         and wp_written_sales_unit >= 50
         and (wp_written_sales_unit - iaf_written_sales_unit) / iaf_written_sales_unit >= 0.2
    then true

    else false
end as var_sls_u_wp_iaf_pos,
case
    when iaf_written_sales_unit is null then false
    when iaf_written_sales_unit <= 0 then false


    when iaf_written_sales_unit > 0
         and wp_written_sales_unit >= 50
         and (wp_written_sales_unit - iaf_written_sales_unit) / iaf_written_sales_unit <= -0.2
    then true
    else false
end as var_sls_u_wp_iaf_neg,
 case
       when wp_discount_rate is not null
       and iaf_discount_rate is not null
       and (wp_discount_rate - iaf_discount_rate)  >= 0.10
        then true
        else false
          end as dr_var_wp_vs_iaf_pos,
   case
       when wp_discount_rate is not null
       and iaf_discount_rate is not null
       and (wp_discount_rate - iaf_discount_rate) <= -0.10
        then true
        else false
          end as dr_var_wp_vs_iaf_neg,
     case
       when wp_auc_first_cost is not null
       and ly_auc_first_cost is not null
       and (wp_auc_first_cost - ly_auc_first_cost) / nullif(ly_auc_first_cost, 0) >= 0.10
        then true
        else false
       end as auc_var_wp_vs_ly_pos,
  case
       when wp_auc_first_cost is not null
       and ly_auc_first_cost is not null
       and (wp_auc_first_cost - ly_auc_first_cost) / nullif(ly_auc_first_cost, 0) <= -0.10
        then true
        else false
       end as auc_var_wp_vs_ly_neg,
    case
        when wp_unplaced_total_units is not null and wp_unplaced_total_units < 25
        then true
        else false
          end as open_receipt_qty,
  case
    when wp_unplaced_total_units is not null
     and phf.minimum_order_quantity is not null
     and wp_unplaced_total_units < phf.minimum_order_quantity
    then true
    else false
     end as order_qty_moq
 from
   base_data bd
left join (SELECT
        hierarchy_code,
        l0_name,
        l1_name,
        l2_name,
        l3_name,
        minimum_order_quantity
    FROM item_smart.mv_product_hierarchies_filter  where  l1_name='''||p_dept||'''

    UNION ALL

    SELECT
        hierarchy_code,
        l0_name,
        l1_name,
        l2_name,
        l3_name,
        NULL as minimum_order_quantity
    FROM item_smart.placeholders_info where  l1_name='''||p_dept||''' ) phf
  on bd.hierarchy_code = phf.hierarchy_code
left join item_smart.sku_st_info st
  on bd.hierarchy_code = st.hierarchy_code
 and bd.dept = st.dept -- Added department to the join condition based on schema
 and bd.year = st.year  -- Added year to the join condition based on schema
left join item_smart.itemfact_sku_week isw
  on bd.hierarchy_code = isw.hierarchy_code
left join
      bop_units_%s_%s bop
  on
    bd.hierarchy_code = bop.hierarchy_code
  and
    bd.channel = bop.channel
    and
      bd.sub_channel = bop.sub_channel
  and
    bd.year = bop.fiscal_year
left join
      eop_units_%s_%s eop
    on
    bd.hierarchy_code = eop.hierarchy_code
  and
    bd.channel = eop.channel
    and
      bd.sub_channel = eop.sub_channel
  and
    bd.year = eop.fiscal_year)
,
full_year_ws_unuts as (
    select distinct
      bd.dept,
      phf.l0_name,
      phf.l2_name,
      phf.l3_name,
      bd.year,
      bd.hierarchy_code,
      sum(bd.wp_written_sales_unit) wp_written_sales_unit,
 	SUM(COALESCE(bd.wp_recommended_u_supply, 0)) as wp_recommended_u_supply
 from
   base_data bd
--left join
--      bop_units_%s_%s bop
--  on
--      bd.hierarchy_code = bop.hierarchy_code
--    and
--      bd.year = bop.fiscal_year
--left join
--      eop_units_%s_%s eop
--    on
--      bd.hierarchy_code = eop.hierarchy_code
 --   and
 --     bd.year = eop.fiscal_year
left join (SELECT
        hierarchy_code,
        l0_name,
        l1_name,
        l2_name,
        l3_name,
        minimum_order_quantity
    FROM item_smart.mv_product_hierarchies_filter where  l1_name='''||p_dept||'''

    UNION ALL

    SELECT
        hierarchy_code,
        l0_name,
        l1_name,
        l2_name,
        l3_name,
        NULL as minimum_order_quantity
    FROM item_smart.placeholders_info where  l1_name='''||p_dept||''' ) phf
  on bd.hierarchy_code = phf.hierarchy_code
group by 
      bd.dept,
      phf.l0_name,
      phf.l2_name,
      phf.l3_name,
      bd.year,
      bd.hierarchy_code
),
 final_data_fst_st as (
    select distinct
      bd.dept,
      phf.l0_name,
      phf.l2_name,
      phf.l3_name,
      bd.year,
      bd.hierarchy_code,
      bop.bop_units,
    eop.eop_units,
    bd.wp_written_sales_unit as wp_written_sales_unit, -- Added comma here
/*CASE
  WHEN st.st_perc IS NOT NULL
   AND (
        ( COALESCE(bd.wp_written_sales_unit, 0)::float  / NULLIF( COALESCE(eop.eop_units, 0)  + GREATEST(COALESCE(bop.bop_units, 0), 0) 
+ COALESCE(bd.wp_written_sales_unit, 0), 0) - COALESCE(bop.bop_units, 0)
        )  - COALESCE(bd.wp_written_sales_unit / NULLIF(wp_recommended_u_supply, 0), 0) 
		) >= 0.10
  THEN TRUE
  ELSE FALSE
END AS st_pos_variance,
CASE
  WHEN st.st_perc IS NOT NULL
   AND ( ( COALESCE(bd.wp_written_sales_unit, 0)::float / NULLIF(
                COALESCE(eop.eop_units, 0)  + GREATEST(COALESCE(bop.bop_units, 0), 0) 
              + COALESCE(bd.wp_written_sales_unit, 0), 0) - COALESCE(bop.bop_units, 0)) 
	- COALESCE(bd.wp_written_sales_unit / NULLIF(wp_recommended_u_supply, 0), 0)) <= -0.10
  THEN TRUE ELSE FALSE
END AS st_neg_variance
*/
CASE
  WHEN st.st_perc IS NOT NULL
   AND (
 ( COALESCE(bd.wp_written_sales_unit, 0)::float  / NULLIF( COALESCE(eop.eop_units, 0)   + COALESCE(bd.wp_written_sales_unit, 0), 0)
        )  - COALESCE(bd.wp_written_sales_unit / NULLIF(wp_recommended_u_supply, 0), 0) 
		) >= 0.10
  THEN TRUE
  ELSE FALSE
END AS st_pos_variance,
CASE
  WHEN st.st_perc IS NOT NULL
   AND ( 
   ( COALESCE(bd.wp_written_sales_unit, 0)::float / NULLIF( COALESCE(eop.eop_units, 0) + COALESCE(bd.wp_written_sales_unit, 0), 0) ) 
	- COALESCE(bd.wp_written_sales_unit / NULLIF(wp_recommended_u_supply, 0), 0)) <= -0.10
  THEN TRUE ELSE FALSE
END AS st_neg_variance

 from
   full_year_ws_unuts bd
 left join item_smart.sku_st_info st
   on bd.hierarchy_code = st.hierarchy_code
  and bd.dept = st.dept
  and bd.year = st.year
 left join
 (select fiscal_year,hierarchy_code,coalesce(sum(bop_units),0) bop_units from  bop_units_%s_%s group by 1,2) bop
  on
      bd.hierarchy_code = bop.hierarchy_code
    and
      bd.year = bop.fiscal_year
 left join
(select fiscal_year,hierarchy_code,coalesce(sum(eop_units),0) eop_units from eop_units_%s_%s group by 1,2) eop
    on
      bd.hierarchy_code = eop.hierarchy_code
    and
      bd.year = eop.fiscal_year
 left join (SELECT
        hierarchy_code,
        l0_name,
        l1_name,
        l2_name,
        l3_name,
        minimum_order_quantity
    FROM item_smart.mv_product_hierarchies_filter  where l1_name='''||p_dept||'''

    UNION ALL

    SELECT
        hierarchy_code,
        l0_name,
        l1_name,
        l2_name,
        l3_name,
        NULL as minimum_order_quantity
    FROM item_smart.placeholders_info where l1_name='''||p_dept||''') phf
  on bd.hierarchy_code = phf.hierarchy_code
),
flagged as (
  select
    fd.*,
    (fd.var_sls_u_wp_op_pos  OR fd.var_sls_u_wp_op_neg)  AS var_sls_u_wp_op,
    (fd.var_sls_u_wp_lf_pos  OR fd.var_sls_u_wp_lf_neg)  AS var_sls_u_wp_lf,
    (fd.var_sls_u_wp_iaf_pos OR fd.var_sls_u_wp_iaf_neg) AS var_sls_u_wp_iaf,
    (fd.dr_var_wp_vs_iaf_pos OR fd.dr_var_wp_vs_iaf_neg) AS dr_var_wp_vs_iaf,
    (fd.auc_var_wp_vs_ly_pos OR fd.auc_var_wp_vs_ly_neg) AS auc_var_wp_vs_ly,
    (fst.st_pos_variance      OR fst.st_neg_variance)      AS st_var,
fst.st_pos_variance,
fst.st_neg_variance
  from final_data fd
  left join final_data_fst_st fst
  on fd.hierarchy_code=fst.hierarchy_code and fd.year = fst.year
)
      select distinct on (dept, year, channel,sub_channel, hierarchy_code) *
      from flagged
      where year = %s
      order by dept, year, channel, sub_channel, hierarchy_code',
        v_dept, current_year,           -- 1, 2: table name (alerts_v_dept_current_year)
      v_dept,                           -- 3: wp_master_%s
      v_dept,                           -- 4: ty_master_%s
      v_dept,                           -- 5: op_master_%s
      p_dept, weeks_over_year, channels,  -- 6, 7, 8: op filters
      v_dept,                           -- 9: lf_master_%s
      p_dept, weeks_over_year, channels,  -- 10, 11, 12: lf filters
      v_dept,                           -- 13: iaf_master_%s
      p_dept, weeks_over_year, channels,  -- 14, 15, 16: iaf filters
      v_dept,                           -- 17: ly_master_%s
      p_dept, weeks_over_year, channels,  -- 18, 19, 20: ly filters
      v_dept,                           -- 21: lly_master_%s
      p_dept, weeks_over_year, channels,  -- 22, 23, 24: lly filters
      p_dept, weeks_over_year, channels,  -- 25, 26, 27: wp WHERE filters (outer most in base_data)
     v_dept, current_year,            -- 28, 29: bop_units_%s_%s in final_data
      v_dept, current_year,            -- 30, 31: eop_units_%s_%s in final_data
     v_dept, current_year,            -- 32, 33: bop_units_%s_%s in full_year_ws_unuts
      v_dept, current_year,            -- 34, 35: eop_units_%s_%s in full_year_ws_unuts
      v_dept, current_year,            -- 36, 37: bop_units_%s_%s in final_data_fst_st
      v_dept, current_year,            -- 38, 39: eop_units_%s_%s in final_data_fst_st
      current_year);                   -- 40: For final select year filter

     raise notice 'step6:%',v_sql;
     execute v_sql;

     GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
     end_time := clock_timestamp();
     raise notice 'dept = [%] year = [%] rows = [%] time = [%]',p_dept,current_year,v_affected_rows,end_time - start_time;
   end;
  end loop;
end;
$procedure$
;
