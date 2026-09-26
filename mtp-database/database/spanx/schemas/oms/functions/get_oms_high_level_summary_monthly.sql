--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_oms_high_level_summary_monthly_11 runOnChange:true stripComments:false splitStatements:false context:Release_1_4 labels:MTP-91512_7
--comment: MTP-82871.
--rollback: SELECT 1

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
  dc_name_condition                 text := '';
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
	product_code,
	loc_code,
	order_quantity,
	roq_unconstrained,
	raw_roq,
	ia_shipment_order_quantity,
	order_status_id,
  fiscal_year_week,
	fiscal_year_month 
	from paf
	left join inventory_smart.oms_orders_recommended oor using(product_code)
	where ' || fiscal_condition || '
	and ' || hierarchy_condition || '
    )

, oor1 as (
	select product_code, loc_code,
	sum(order_quantity) as oq_sum,
  sum(paf.cost*order_quantity) as oq_cost
	from paf
	join oor  using(product_code)
	where order_status_id = 1 
	and ' || fiscal_condition || '
	group by 1,2
)

, oor2 as (
	select product_code, loc_code, 
	sum(order_quantity) as oq_sum,
    sum(paf.cost*order_quantity) as oq_cost
	from paf
	join oor  using(product_code)
	where order_status_id = -1
	and ' || fiscal_condition || '
	group by 1,2
)


, oor3 as (
	select product_code, loc_code, 
	sum(roq_unconstrained) as roq_uncon_sum,
  sum(paf.cost*roq_unconstrained) as roq_uncon_cost,
  sum(raw_roq) as raw_roq_sum,
  sum(paf.cost*raw_roq) as raw_roq_cost,
	sum(ia_shipment_order_quantity) as ia_shipment_order_quantity_sum
	from paf
	join oor  using(product_code)
	where order_status_id = 0
	and ' || fiscal_condition || '
	group by 1,2
)


, opm as (
	select product_code, loc_code,
    sum(coalesce(opm.it,0)+coalesce(opm.oo,0)) as io_sum,
    sum(paf.cost*(coalesce(opm.it,0)+coalesce(opm.oo,0))) as io_cost
	from paf
	join inventory_smart.oms_po_master opm  using(product_code)
	join (select * from global.fiscal_date_mapping where ' || fiscal_condition || ') fdm on opm.projected_delivery_date=fdm.date
	group by 1,2
)


, ooa as (
	select product_code, loc_code, 
	sum(order_quantity) as oq_sum,
  sum(paf.cost*order_quantity) as oq_cost,
  sum(approved_orders_pending_reconciliation) as approved_orders_pending_reconciliation,
	sum(paf.cost*approved_orders_pending_reconciliation) as approved_orders_pending_reconciliation_cost
	from paf
	join inventory_smart.oms_orders_approved ooa using(product_code)
	join global.fiscal_date_mapping fdm on ooa.order_placement_recom_date=fdm.date
	where ' || fiscal_condition || '
	and not ooa.is_deleted
    AND EXTRACT(DAY FROM ooa.created_at) = EXTRACT(DAY FROM CURRENT_DATE)
	group by 1,2
)

, oor4 as (
      select paf.product_code, oor.loc_code,
      sum(order_quantity) as oq_sum,
      sum(paf.cost*order_quantity) as oq_cost
      from paf
      join oor
      on paf.product_code = oor.product_code and paf.l1_name = oor.loc_code
      where order_status_id = 0
      and ' || fiscal_condition || '
      group by 1,2
    )

, sku_dc_mapping AS ( 
    SELECT DISTINCT 
        a.product_code,
        a.loc_code,
		    dc.name as dc_or_channel,
        ' || selected_hierarchy || '
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
        ' || selected_hierarchy || ',
        dc_or_channel,
        coalesce(sum(opm.io_sum),0) as committed_orders' || v_suffix || ',
        coalesce(sum(opm.io_cost),0) as committed_orders_cost' || v_suffix || ',
        coalesce(sum(oor1.oq_sum),0) as pending_orders' || v_suffix || ',
        coalesce(sum(oor1.oq_cost),0) as pending_orders_cost' || v_suffix || ',
        coalesce(sum(oor3.raw_roq_sum),0) as raw_roq' || v_suffix || ',
        coalesce(sum(oor3.raw_roq_cost),0) as raw_roq_cost' || v_suffix || ',
        coalesce(sum(oor3.ia_shipment_order_quantity_sum),0) as ia_shipment_order_quantity' || v_suffix || ',
        coalesce(sum(oor2.oq_sum),0) as orders_under_review' || v_suffix || ',
        coalesce(sum(oor2.oq_cost),0) as orders_under_review_cost' || v_suffix || ',
        coalesce(sum(oor3.roq_uncon_sum),0) as unconstrained_recom' || v_suffix || ',
        coalesce(sum(oor3.roq_uncon_cost),0) as unconstrained_recom_cost' || v_suffix || ',
        coalesce(sum(ooa.oq_sum),0) as todays_app_orders' || v_suffix || ',
        coalesce(sum(ooa.oq_cost),0) as todays_app_orders_cost' || v_suffix || ',
        coalesce(sum(ooa.approved_orders_pending_reconciliation),0) as approved_orders_pending_reconciliation' || v_suffix || ',
		    coalesce(sum(ooa.approved_orders_pending_reconciliation_cost),0) as approved_orders_pending_reconciliation_cost' || v_suffix || '
from sku_dc_mapping 
left join oor1 using (product_code, loc_code)
left join oor2 using (product_code, loc_code)
left join oor3 using (product_code, loc_code)
left join opm using (product_code, loc_code)
left join ooa using (product_code, loc_code)
left join oor4 using (product_code, loc_code)
group by 1,2
    ';

   raise notice 'v_high_level_summary_monthly_sql %',v_high_level_summary_monthly_sql;
   open input for execute v_high_level_summary_monthly_sql;
   RETURN input;
 end
 $function$
;
