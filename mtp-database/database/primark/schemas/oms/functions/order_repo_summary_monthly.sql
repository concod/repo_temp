--liquibase formatted sql
--changeset kailash.kangne@impactanalytics.co:order_repo_summary_monthly_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:MTP-136093
--comment: Order repo summary monthly without cost columns
--rollback: SELECT 1



DROP FUNCTION IF EXISTS oms.order_repo_summary_monthly(refcursor, text, _text, _text, text, text, jsonb, _text, _text, jsonb, text);
DROP FUNCTION IF EXISTS oms.order_repo_summary_monthly(refcursor, text, text, text[], text[], text, text, jsonb, text[], text[], jsonb, text);
DROP FUNCTION IF EXISTS oms.order_repo_summary_monthly(refcursor, text, text, text[], text[], text, text, jsonb, text[], text[], text, jsonb, text);

CREATE OR REPLACE FUNCTION oms.order_repo_summary_monthly(input refcursor, selected_hierarchy text, secondary_hierarchy text, hierarchy_values text[], dc_or_channels text[], start_date text, end_date text, product_attribute_query jsonb, fiscal_year_week text[], fiscal_year_month text[], suffix text, view_by_allowed_values jsonb, roq_date_option text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_high_level_summary_monthly_sql  text := '';
  hierarchy_condition               text := '';
  dc_name_condition                 text := '';

  v_day							text := '';
  v_month                           text := '';
  v_year                            text := '';
  v_suffix                    text := '';
  v_pa_sql                          text := '';

  v_roq_date_option                 text := '';	
  v_fiscal_bucket_column            text := '';
  v_agg_level                       text := '';


	
begin

  CASE
    WHEN fiscal_year_week IS NOT NULL AND array_length(fiscal_year_week, 1) > 0 THEN
      v_suffix = '_' ||suffix;
      v_fiscal_bucket_column := 'fiscal_year_week';
      v_agg_level := 'WEEK';
    WHEN fiscal_year_month IS NOT NULL AND array_length(fiscal_year_month, 1) > 0 THEN
      v_suffix = '_' || suffix;
      v_fiscal_bucket_column := 'fiscal_year_month';
      v_agg_level := 'MONTH';
    ELSE
      v_suffix = '';
      v_fiscal_bucket_column := '';
      v_agg_level := '';
  END CASE;


  hierarchy_condition := 'paf.' || selected_hierarchy || ' IN (' || array_to_string(
    ARRAY(
      SELECT quote_literal(hierarchy_values[i])
      FROM generate_series(1, array_length(hierarchy_values, 1)) AS i
    ), ', ') || ')';

  dc_name_condition := 'saf.' || secondary_hierarchy || ' IN (' || array_to_string(
    ARRAY(
      SELECT quote_literal(dc_or_channels[i])
      FROM generate_series(1, array_length(dc_or_channels, 1)) AS i
    ), ', ') || ')';

  v_roq_date_option := (
      CASE 
          WHEN roq_date_option = 'roq_placement_date' THEN 'order_placement_date'
          WHEN roq_date_option = 'roq_receipt_date' THEN 'editable_expected_receipt_date'
          ELSE '1=0'
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
	' || selected_hierarchy || ',
	product_code,
	loc_code,
	order_quantity_eaches,
  ' || v_roq_date_option || ',
  forecasted_sales,
	elt_projected_store_inv,
	elt_projected_safety_stock,
	raw_roq_eaches,
	roq_constrained_eaches,
	roq_unconstrained_eaches,
	min_order_quantity_sku,
	order_status_id
	from paf
	left join oms.oms_orders_recommended oor using(product_code)
	where ' || v_roq_date_option || ' between ''' || start_date || ''' and ''' || end_date || '''
	and ' || hierarchy_condition || '
    )

, not_sent_for_approval as (
	select product_code, loc_code,
	sum(order_quantity_eaches) as order_quantity_eaches
	from oor  
	where order_status_id = 0
	group by 1,2
)

, kpi_data as (
	select product_code, loc_code,
	sum(forecasted_sales) as forecasted_sales,
	sum(elt_projected_store_inv) as elt_projected_store_inv,
	sum(elt_projected_safety_stock) as elt_projected_safety_stock,
	sum(raw_roq_eaches) as raw_roq_eaches,
	sum(roq_constrained_eaches) as roq_constrained_eaches,
	sum(roq_unconstrained_eaches) as roq_unconstrained_eaches,
	sum(min_order_quantity_sku) as min_order_quantity_sku
	from oor
	where order_status_id in (-1, 1, 3)
	group by 1,2
)

, pending_order as (
	select product_code, loc_code,
	sum(order_quantity_eaches) as order_quantity_eaches
	from oor 
	where order_status_id = 1 
	group by 1,2
)

, order_under_review as (
	select product_code, loc_code, 
	sum(order_quantity_eaches) as order_quantity_eaches
	from  oor  
	where order_status_id = -1
	group by 1,2
)

, approved_order as (
	select product_code, loc_code,
	sum(order_quantity_eaches) as order_quantity_eaches
	from oms.oms_orders_approved ooa 
	where order_status_id = 3
  and ' || v_roq_date_option || ' between ''' || start_date || ''' and ''' || end_date || '''
	and not ooa.is_deleted
	group by 1,2
)

, budget_data as (

	select oor.product_code, oor.loc_code,

	sum(ba.planned_budget_cost) as planned_budget_cost,
	sum(ba.planned_budget_units) as planned_budget_units,
	sum(COALESCE(ba.available_budget_cost, 0)) as available_budget_cost,
	sum(COALESCE(ba.available_budget_units, 0)) as available_budget_units

	from paf
	JOIN oor using(product_code)
  
  LEFT JOIN oms.budget_product_hierarchy bph_budget 
  ON bph_budget.loc_code = oor.loc_code 
  AND bph_budget.active = true
  AND (bph_budget.product_code = oor.product_code OR bph_budget.article = paf.article OR (bph_budget.l4_name IS NOT NULL AND bph_budget.l4_name = paf.l2_name) OR (bph_budget.l5_name IS NOT NULL AND bph_budget.l5_name = paf.l3_name))
	
	LEFT JOIN oms.budget_allocation ba 
  ON ba.hierarchy_id = bph_budget.hierarchy_id 
	group by 1,2
)

, sku_dc_mapping AS ( 
    SELECT DISTINCT 
        a.product_code,
        a.loc_code,
		'||secondary_hierarchy||',
        ' || selected_hierarchy || '
    FROM (
        SELECT DISTINCT product_code, loc_code FROM oor
        UNION ALL
        SELECT DISTINCT product_code, loc_code FROM approved_order
    ) AS a
    JOIN paf USING (product_code)
	--join global.distribution_centres dc ON a.loc_code = dc.linked_store_code
	INNER JOIN 
	(SELECT * FROM global.store_attributes_filter WHERE active) saf
	on a.loc_code = saf.dc_code::text
	where  ' || dc_name_condition || '
	and saf.active=true
)


SELECT
        ' || selected_hierarchy || ',
        '||secondary_hierarchy||',
        coalesce(sum(po.order_quantity_eaches)::text,''-'') as pending_orders' || v_suffix || ',
        coalesce(sum(our.order_quantity_eaches)::text,''-'') as orders_under_review' || v_suffix || ',
        coalesce(sum(nsa.order_quantity_eaches)::text,''-'') as not_sent_for_approval' || v_suffix || ',
        coalesce(sum(kpi.forecasted_sales)::text,''-'') as forecasted_sales' || v_suffix || ',
        coalesce(sum(kpi.elt_projected_store_inv)::text,''-'') as elt_projected_store_inv' || v_suffix || ',
        coalesce(sum(kpi.elt_projected_safety_stock)::text,''-'') as elt_projected_safety_stock' || v_suffix || ',
        coalesce(sum(kpi.raw_roq_eaches)::text,''-'') as raw_roq' || v_suffix || ',
        coalesce(sum(kpi.roq_constrained_eaches)::text,''-'') as roq_constrained' || v_suffix || ',
        coalesce(sum(kpi.roq_unconstrained_eaches)::text,''-'') as roq_unconstrained' || v_suffix || ',
        coalesce(sum(kpi.min_order_quantity_sku)::text,''-'') as min_order_quantity_sku' || v_suffix || ',
        coalesce(sum(ao.order_quantity_eaches)::text,''-'') as approved_orders' || v_suffix || ',
        coalesce(sum(bd.planned_budget_cost)::text,''-'') as planned_budget_cost' || v_suffix || ',
        coalesce(sum(bd.planned_budget_units)::text,''-'') as planned_budget_units' || v_suffix || ',
        coalesce(GREATEST(0::numeric, sum(COALESCE(bd.available_budget_cost, 0)))::text,''-'') as available_budget_cost' || v_suffix || ',
        coalesce(GREATEST(0::numeric, sum(COALESCE(bd.available_budget_units, 0)))::text,''-'') as available_budget_units' || v_suffix || '
from sku_dc_mapping sdm
left join pending_order po using (product_code, loc_code)
left join order_under_review our using (product_code, loc_code)
left join not_sent_for_approval nsa using (product_code, loc_code)
left join kpi_data kpi using (product_code, loc_code)
left join approved_order ao using (product_code, loc_code)
left join budget_data bd using (product_code, loc_code)
group by '|| selected_hierarchy ||', '||secondary_hierarchy||'
    ';

   raise notice 'v_high_level_summary_monthly_sql %',v_high_level_summary_monthly_sql;
   open input for execute v_high_level_summary_monthly_sql;
   RETURN input;
 end
 $function$
;
