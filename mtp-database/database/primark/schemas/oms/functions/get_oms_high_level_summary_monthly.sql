--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_high_level_summary_monthly_8 runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:MTP-91512_6
--comment: MTP-82871.
--rollback: SELECT 1


DROP FUNCTION IF EXISTS oms.get_oms_high_level_summary_monthly(refcursor, text, _text, _text, text, text, jsonb, _text, _text, jsonb);
DROP FUNCTION IF EXISTS oms.get_oms_high_level_summary_monthly(refcursor, text, _text, _text, text, text, jsonb, _text, _text, jsonb, text);
DROP FUNCTION IF EXISTS oms.get_oms_high_level_summary_monthly(refcursor, text, _text, _text, text, text, jsonb, _text, _text, text, jsonb, text);

CREATE OR REPLACE FUNCTION oms.get_oms_high_level_summary_monthly(input refcursor, selected_hierarchy text, hierarchy_values text[], dc_or_channels text[], start_date text, end_date text, product_attribute_query jsonb, fiscal_year_week text[], fiscal_year_month text[], suffix text, view_by_allowed_values jsonb, roq_date_option text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_high_level_summary_monthly_sql  text := '';
  hierarchy_condition               text := '';
  dc_name_condition                 text := '';
	fiscal_condition		    text := '';
  v_day							text := '';
  v_month                           text := '';
  v_year                            text := '';
  v_suffix                    text := '';
  v_pa_sql                          text := '';
  v_hierarchies_list_plain  text[];
  v_higher_hierarchies_list_plain text := '';
  v_roq_date_option                 text := '';
	
begin



  v_suffix = '_' || suffix;

    -- FETCH HIERARCHY LIST DYNAMICALLY
  SELECT array_agg(attribute_name)
  INTO 
      v_hierarchies_list_plain
  FROM oms.get_oms_view_by_hierarchy(selected_hierarchy, view_by_allowed_values::jsonb);
  
  v_higher_hierarchies_list_plain := array_to_string(v_hierarchies_list_plain, ', ');
  RAISE NOTICE 'v_higher_hierarchies_list_plain: %', v_higher_hierarchies_list_plain;

  hierarchy_condition := 'paf.' || selected_hierarchy || ' IN (' || array_to_string(
    ARRAY(
      SELECT quote_literal(hierarchy_values[i])
      FROM generate_series(1, array_length(hierarchy_values, 1)) AS i
    ), ', ') || ')';

  dc_name_condition := 'dc.name IN (' || array_to_string(
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

  v_roq_date_option := (
      CASE 
          WHEN roq_date_option = 'roq_placement_date' THEN 'order_placement_date'
          WHEN roq_date_option = 'roq_receipt_date' THEN 'editable_expected_receipt_date'
          ELSE '1=0'  -- no values 
      END
  );

  v_pa_sql := oms.form_main_table_filters(
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
	' || v_higher_hierarchies_list_plain || ',
	product_code,
	loc_code,
  raw_roq_eaches,
	order_quantity,
	ia_shipment_order_quantity_eaches,
	order_quantity_eaches,
	roq_constrained_eaches,
	roq_unconstrained_eaches,
	order_status_id,
	fiscal_year_month,
  fiscal_year_week
	from paf
	left join oms.oms_orders_recommended oor using(product_code)
	where ' || v_roq_date_option || ' between ''' || start_date || ''' and ''' || end_date || '''
	and ' || hierarchy_condition || '
    )

, oor1 as (
	select product_code, loc_code,
	
	sum(order_quantity) as rr_sum,
	sum(paf.cost*order_quantity) as rr_cost,
	sum(order_quantity_eaches) as oq_sum,
    sum(paf.cost*order_quantity_eaches) as oq_cost
	from paf
	join oor  using(product_code)
	where order_status_id = 1 
	group by 1,2
)

, oor2 as (
	select product_code, loc_code, 
	sum(order_quantity_eaches) as oq_sum,
    sum(paf.cost*order_quantity_eaches) as oq_cost
	from paf
	join oor  using(product_code)
	where order_status_id = -1
	group by 1,2
)


, oor3 as (
	select product_code, loc_code,
  sum(oor.raw_roq_eaches) as raw_roq_sum,
  sum(paf.cost*oor.raw_roq_eaches) as raw_roq_cost,
	sum(roq_unconstrained_eaches) as roq_uncon_sum,
  sum(paf.cost*roq_unconstrained_eaches) as roq_uncon_cost, 
	sum(roq_constrained_eaches) as roq_con_sum,
  sum(paf.cost*roq_constrained_eaches) as roq_con_cost,
	sum(ia_shipment_order_quantity_eaches) as ia_shipment_order_quantity_eaches_sum,
    sum(paf.cost*ia_shipment_order_quantity_eaches) as ia_shipment_order_quantity_eaches_cost
	from paf
	join oor  using(product_code)
	where order_status_id = 0
	group by 1,2
)
  ,oor4 as (
	select product_code, loc_code, 
	sum(order_quantity_eaches) as oq_sum,
    sum(paf.cost*order_quantity_eaches) as oq_cost
	from paf
	join oor using(product_code)
	where order_status_id = 0
	group by 1,2
  )

,otb as (
      select paf.product_code, oo.loc_code,
      sum(oo.otb) as otb_sum,
      sum(paf.cost*oo.otb) as otb_cost,
      SUM(oo.mfp_units) AS mfp_sum,
      SUM(oo.mfp_units * paf.cost) AS mfp_cost
      from paf
      join oms.oms_otb oo
      on paf.product_code = oo.product_code --and paf.loc_code = oo.loc_code
      join oms.oms_orders_recommended oor on 
      oor.product_code = oo.product_code and oor.channel = oo.channel and oor.fiscal_year_week = oo.fiscal_year_week
      where oo.fiscal_year_week in (select distinct fiscal_year_week from global.fiscal_date_mapping where ' || fiscal_condition || ')
      group by 1,2
    )

, opm as (
	select product_code, loc_code,
    sum(coalesce(opm.it,0)+coalesce(opm.oo,0)) as io_sum,
    sum(paf.cost*(coalesce(opm.it,0)+coalesce(opm.oo,0))) as io_cost
	from paf
	join oms.oms_po_master opm  using(product_code)
	join (select * from global.fiscal_date_mapping where ' || fiscal_condition || ') fdm on opm.projected_delivery_date=fdm.date
	group by 1,2
)


, ooa as (
	select product_code, loc_code,
	sum(order_quantity_eaches) as oq_sum,
    sum(paf.cost*order_quantity_eaches) as oq_cost
	from paf
	join oms.oms_orders_approved ooa using(product_code)
	join global.fiscal_date_mapping fdm on ooa.order_placement_recom_date=fdm.date
	where ' || v_roq_date_option || ' between ''' || start_date || ''' and ''' || end_date || '''
	and not ooa.is_deleted
    AND EXTRACT(DAY FROM ooa.created_at) = EXTRACT(DAY FROM CURRENT_DATE)
	group by 1,2
)

, sku_dc_mapping AS ( 
    SELECT DISTINCT 
        a.product_code,
        a.loc_code,
		    dc.name as dc_or_channel,
        ' || v_higher_hierarchies_list_plain || '
    FROM (
        SELECT DISTINCT product_code, loc_code FROM oor
        UNION ALL
        SELECT DISTINCT product_code, loc_code FROM ooa
        UNION ALL
        SELECT DISTINCT product_code, loc_code FROM opm
        UNION ALL
        SELECT DISTINCT product_code, loc_code FROM oor4
    ) AS a
    JOIN paf USING (product_code)
	join global.distribution_centres dc ON a.loc_code = dc.linked_store_code
	where  ' || dc_name_condition || '
	and dc.is_active=true
)

SELECT
        ' || v_higher_hierarchies_list_plain || ',
        dc_or_channel,
        coalesce(sum(opm.io_sum),0) as committed_orders' || v_suffix || ',
        coalesce(sum(opm.io_cost),0) as committed_orders_cost' || v_suffix || ',
        coalesce(sum(oor1.oq_sum),0) as pending_orders' || v_suffix || ',
        coalesce(sum(oor1.oq_cost),0) as pending_orders_cost' || v_suffix || ',
        coalesce(sum(oor3.raw_roq_sum),0) as raw_roq' || v_suffix || ',
		coalesce(sum(oor3.raw_roq_cost),0) as raw_roq_cost' || v_suffix || ',
        coalesce(sum(oor3.ia_shipment_order_quantity_eaches_sum),0) as ia_shipment_order_quantity' || v_suffix || ',
		coalesce(sum(oor3.ia_shipment_order_quantity_eaches_cost),0) as ia_shipment_order_quantity_cost' || v_suffix || ',
        coalesce(sum(oor2.oq_sum),0) as orders_under_review' || v_suffix || ',
        coalesce(sum(oor2.oq_cost),0) as orders_under_review_cost' || v_suffix || ',
        coalesce(sum(oor3.roq_con_sum),0) as constrained_recom' || v_suffix || ',
        coalesce(sum(oor3.roq_con_cost),0) as constrained_recom_cost' || v_suffix || ',
		coalesce(sum(oor3.roq_uncon_sum),0) as unconstrained_recom' || v_suffix || ',
        coalesce(sum(oor3.roq_uncon_cost),0) as unconstrained_recom_cost' || v_suffix || ',
        coalesce(sum(ooa.oq_sum),0) as todays_app_orders' || v_suffix || ',
        coalesce(sum(ooa.oq_cost),0) as todays_app_orders_cost' || v_suffix || '
        ,coalesce(sum(oor4.oq_sum),0) as approved_orders_pending_reconciliation' || v_suffix || ',
        coalesce(sum(oor4.oq_cost),0) as approved_orders_pending_reconciliation_cost' || v_suffix || ',
		coalesce(sum(otb.otb_sum),0) as otb' || v_suffix || ',
       	coalesce(sum(otb.otb_cost),0) as otb_cost' || v_suffix || ',
        coalesce(sum(otb.mfp_sum),0) as mfp' || v_suffix || ',
       	coalesce(sum(otb.mfp_cost),0) as mfp_cost' || v_suffix || '
from sku_dc_mapping 
left join oor1 using (product_code, loc_code)
left join oor2 using (product_code, loc_code)
left join oor3 using (product_code, loc_code)
left join oor4 using (product_code, loc_code)
left join opm using (product_code, loc_code)
left join ooa using (product_code, loc_code)
left join otb using (product_code, loc_code)
group by '|| v_higher_hierarchies_list_plain ||', dc_or_channel
    ';

   raise notice 'v_high_level_summary_monthly_sql %',v_high_level_summary_monthly_sql;
   open input for execute v_high_level_summary_monthly_sql;
   RETURN input;
 end
 $function$
;