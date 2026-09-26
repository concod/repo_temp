--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_high_level_summary_monthly_9 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:MTP-91512_9
--comment: MTP-82871-b 
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_monthly(refcursor, text, text[], text[], text, text);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_monthly(refcursor, text, text[], text[], text, text, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_monthly(refcursor, text, text[], text[], text, text, jsonb, text[]);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_monthly(refcursor, text, text[], text[], text, text, jsonb, text[], text[], jsonb, text);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_monthly(refcursor, text, text[], text[], text, text, jsonb, text[], text[], text, jsonb, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_high_level_summary_monthly(input refcursor, selected_hierarchy text, hierarchy_values text[], dc_or_channels text[], start_date text, end_date text, product_attribute_query jsonb, fiscal_year_week text[], fiscal_year_month text[], suffix text, view_by_allowed_values jsonb, roq_date_option text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_high_level_summary_monthly_sql  text := '';
  hierarchy_condition               text := '';
  l1_name_condition                 text := '';
  fiscal_condition		    text := '';
  v_day							text := '';
  v_month                           text := '';
  v_year                            text := '';
  v_suffix                    text := '';
  v_pa_sql                          text := '';
begin

  v_suffix = '_' || suffix;

  hierarchy_condition := 'paf.' || selected_hierarchy || ' IN (' || array_to_string(
    ARRAY(
      SELECT quote_literal(hierarchy_values[i])
      FROM generate_series(1, array_length(hierarchy_values, 1)) AS i
    ), ', ') || ')';

  l1_name_condition := 'paf.l1_name IN (' || array_to_string(
    ARRAY(
      SELECT quote_literal(dc_or_channels[i])
      FROM generate_series(1, array_length(dc_or_channels, 1)) AS i
    ), ', ') || ')';

  fiscal_condition := (
    CASE 
        WHEN fiscal_year_week IS NOT NULL AND array_length(fiscal_year_week, 1) > 0 THEN
            'fiscal_year_week IN (' || array_to_string(
                ARRAY(
                    SELECT quote_literal(fiscal_year_week[i])
                    FROM generate_series(1, array_length(fiscal_year_week, 1)) AS i
                ), ', '
            ) || ')'

        WHEN fiscal_year_month IS NOT NULL AND array_length(fiscal_year_month, 1) > 0 THEN
            'fiscal_year_month IN (' || array_to_string(
                ARRAY(
                    SELECT quote_literal(fiscal_year_month[i])
                    FROM generate_series(1, array_length(fiscal_year_month, 1)) AS i
                ), ', '
            ) || ')'

        ELSE
            '1=0'  -- no values 
    END
  );

  v_pa_sql := inventory_smart.form_main_table_filters(
    'ph_master',
    product_attribute_query
  );

  v_high_level_summary_monthly_sql := '
    with paf as (
    select * from "global".product_attributes_filter   
    '||v_pa_sql||'  and  ordering=''Y''
    )

    , oor as (
      select
      ' || selected_hierarchy || ',
      paf.product_code,
      oor.channel,
      order_quantity,
      roq_unconstrained,
      roq_constrained,
      raw_roq,
	    ia_shipment_order_quantity,
      order_status_id,
      fiscal_year_week,
      fiscal_year_month 
      from paf
      left join inventory_smart.oms_orders_recommended oor 
      on paf.product_code = oor.product_code and paf.l1_name = oor.channel
      where ' || fiscal_condition || '
      and ' || hierarchy_condition || '
        )

    , oor1 as (
      select paf.product_code, oor.channel,
      sum(order_quantity) as oq_sum,
      sum(paf.cost*order_quantity) as oq_cost,
    sum(ia_shipment_order_quantity) as ia_shipment_order_quantity_sum,
    sum(paf.cost*ia_shipment_order_quantity) as ia_shipment_order_quantity_cost
      from paf
      join oor  
      on paf.product_code = oor.product_code and paf.l1_name = oor.channel
      where order_status_id = 1 
      and ' || fiscal_condition || '
      group by 1,2
    )

    , oor2 as (
      select paf.product_code, oor.channel,
      sum(order_quantity) as oq_sum,
        sum(paf.cost*order_quantity) as oq_cost
      from paf
      join oor
      on paf.product_code = oor.product_code and paf.l1_name = oor.channel
      where order_status_id = -1
      and ' || fiscal_condition || '
      group by 1,2
    )

    , oor3 as (
      select paf.product_code, oor.channel, 
      sum(raw_roq) as raw_roq_sum,
      sum(paf.cost*raw_roq) as raw_roq_cost,
      sum(roq_unconstrained) as roq_uncon_sum,
      sum(paf.cost*roq_unconstrained) as roq_uncon_cost,
      sum(roq_constrained) as roq_con_sum,
      sum(paf.cost*roq_constrained) as roq_con_cost
      from paf
      join oor
      on paf.product_code = oor.product_code and paf.l1_name = oor.channel
      where order_status_id = 0
      and ' || fiscal_condition || '
      group by 1,2
    )

    , oor4 as (
      select paf.product_code, oor.channel,
      sum(order_quantity) as oq_sum,
      sum(paf.cost*order_quantity) as oq_cost
      from paf
      join oor
      on paf.product_code = oor.product_code and paf.l1_name = oor.channel
      where order_status_id = 0
      and ' || fiscal_condition || '
      group by 1,2
    )

    , otb as (
      select paf.product_code, oo.channel,
      sum(oo.otb) as otb_sum,
      sum(paf.cost*oo.otb) as otb_cost,
      SUM(oo.mfp_units) AS mfp_sum,
      SUM(oo.mfp_units * paf.cost) AS mfp_cost
      from paf
      join inventory_smart.oms_otb oo
      on paf.product_code = oo.product_code and paf.l1_name = oo.channel
      join inventory_smart.oms_orders_recommended oor 
      on oor.product_code = oo.product_code and oor.channel = oo.channel and oor.fiscal_year_week = oo.fiscal_year_week
      where oo.fiscal_year_week in (select distinct fiscal_year_week from global.fiscal_date_mapping where ' || fiscal_condition || ')
      group by 1,2
    )


    , opm as (
      select paf.product_code, opm.channel,
        sum(coalesce(opm.it,0)+coalesce(opm.oo,0)) as io_sum,
        sum(paf.cost*(coalesce(opm.it,0)+coalesce(opm.oo,0))) as io_cost
      from paf
      join inventory_smart.oms_po_master opm
      on paf.product_code = opm.product_code and paf.l1_name = opm.channel
      join (select * from global.fiscal_date_mapping where ' || fiscal_condition || ') fdm on opm.projected_delivery_date=fdm.date
      group by 1,2
    )


    , ooa as (
      select paf.product_code, ooa.channel,
      sum(order_quantity) as oq_sum,
        sum(paf.cost*order_quantity) as oq_cost
      from paf
      join inventory_smart.oms_orders_approved ooa
      on paf.product_code = ooa.product_code and paf.l1_name = ooa.channel
      join global.fiscal_date_mapping fdm on ooa.order_placement_recom_date=fdm.date
      where ' || fiscal_condition || '
      and not ooa.is_deleted
        AND EXTRACT(DAY FROM ooa.created_at) = EXTRACT(DAY FROM CURRENT_DATE)
      group by 1,2
    )

    , sku_dc_mapping AS ( 
        SELECT DISTINCT 
            a.product_code,
            a.channel,
            ' || selected_hierarchy || '
        FROM (
            SELECT DISTINCT product_code, channel FROM oor
            UNION ALL
            SELECT DISTINCT product_code, channel FROM ooa
            UNION ALL
            SELECT DISTINCT product_code, channel FROM opm
        ) AS a
        JOIN paf on paf.product_code = a.product_code and paf.l1_name = a.channel
        where  ' || l1_name_condition || '
    )

    SELECT
            ' || selected_hierarchy || ',
            channel as dc_or_channel,
            coalesce(sum(opm.io_sum),0) as committed_orders' || v_suffix || ',
            coalesce(sum(opm.io_cost),0) as committed_orders_cost' || v_suffix || ',
            coalesce(sum(oor1.oq_sum),0) as pending_orders' || v_suffix || ',
            coalesce(sum(oor1.oq_cost),0) as pending_orders_cost' || v_suffix || ',
            coalesce(sum(oor1.ia_shipment_order_quantity_sum),0) as ia_shipment_order_quantity' || v_suffix || ',
            coalesce(sum(oor1.ia_shipment_order_quantity_cost),0) as ia_shipment_order_quantity_cost' || v_suffix || ',
            coalesce(sum(oor2.oq_sum),0) as orders_under_review' || v_suffix || ',
            coalesce(sum(oor2.oq_cost),0) as orders_under_review_cost' || v_suffix || ',
            coalesce(sum(oor3.raw_roq_sum),0) as raw_roq' || v_suffix || ',
            coalesce(sum(oor3.raw_roq_cost),0) as raw_roq_cost' || v_suffix || ',
            coalesce(sum(oor3.roq_uncon_sum),0) as unconstrained_recom' || v_suffix || ',
            coalesce(sum(oor3.roq_uncon_cost),0) as unconstrained_recom_cost' || v_suffix || ',
            coalesce(sum(oor3.roq_con_sum),0) as constrained_recom' || v_suffix || ',
            coalesce(sum(oor3.roq_con_cost),0) as constrained_recom_cost' || v_suffix || ',
            coalesce(sum(oor4.oq_sum),0) as approved_orders_pending_reconciliation' || v_suffix || ',
            coalesce(sum(oor4.oq_cost),0) as approved_orders_pending_reconciliation_cost' || v_suffix || ',
            coalesce(sum(ooa.oq_sum),0) as todays_app_orders' || v_suffix || ',
            coalesce(sum(ooa.oq_cost),0) as todays_app_orders_cost' || v_suffix || ',
            coalesce(sum(otb.otb_sum),0) as otb' || v_suffix || ',
       	    coalesce(sum(otb.otb_cost),0) as otb_cost' || v_suffix || ',
            coalesce(sum(otb.mfp_sum),0) as mfp' || v_suffix || ',
       	    coalesce(sum(otb.mfp_cost),0) as mfp_cost' || v_suffix || '

    from sku_dc_mapping 
    left join oor1 using (product_code, channel)
    left join oor2 using (product_code, channel)
    left join oor3 using (product_code, channel)
    left join oor4 using (product_code, channel)
    left join opm using (product_code, channel)
    left join ooa using (product_code, channel)
    left join otb using (product_code, channel)
    group by 1,2
    ';

   raise notice 'v_high_level_summary_monthly_sql %',v_high_level_summary_monthly_sql;
   open $1 for execute v_high_level_summary_monthly_sql;
   RETURN v_high_level_summary_monthly_sql;
 end
 $function$
;
