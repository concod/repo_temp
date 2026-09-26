--liquibase formatted sql
--changeset nikhil.dhoot:get_oms_orders_status_summary_v5 runOnChange:true stripComments:false splitStatements:false context:MTP-121910 labels:oms_orders_status_summary_vs_0
--comment: dc_filter CTE not materialized — small rowset; planner can inline

DROP FUNCTION IF EXISTS inventory_smart.get_oms_orders_status_summary(input refcursor, jsonb, date, date);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_orders_status_summary(input refcursor, jsonb, date, date)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                     text:='';
  v_orders_status_summary_sql  text:='';
  v_loc_filter                   text := '';
  v_product_filter_for_pa      jsonb;
  product_filter               jsonb;
begin
  product_filter := COALESCE($2, '{}'::jsonb);
  IF jsonb_array_length((product_filter->'linked_store_codes')->0->'values') > 0 THEN
    SELECT ' AND linked_store_code = ANY(ARRAY[' || string_agg(quote_literal(elem::text), ',') || ']::text[])'
      INTO v_loc_filter
      FROM jsonb_array_elements_text((product_filter->'linked_store_codes')->0->'values') AS elem;
  END IF;
  IF v_loc_filter IS NULL THEN
    v_loc_filter := '';
  END IF;
  v_product_filter_for_pa := product_filter - 'linked_store_codes';

 	v_pa_sql :=inventory_smart.form_main_table_filters(
    	'ph_master',
    	v_product_filter_for_pa
  	);


  v_orders_status_summary_sql := '
    with filtered_products as (
        select distinct l4_name, style_name, vendor
        from global.product_attributes_filter ' || v_pa_sql || '
    ),
    dc_filter as (
        select linked_store_code
        from global.distribution_centres
        where not is_deleted
        ' || v_loc_filter || '
    ),
    rec_agg as (
        select
            oor.order_status_id,
            count(distinct (oor.article, oor.loc_code, oor.order_placement_date, oor.expected_receipt_date, oor.editable_expected_receipt_date,
                CASE WHEN oor.order_gen_type = ''Manual'' THEN ''Manual'' ELSE ''Other'' END)) as order_cnt,
            sum(oor.order_quantity) as order_qty,
            sum(oor.order_quantity * oor.unit_cost) as order_cost
        from inventory_smart.oms_orders_recommended oor
        join filtered_products paf on oor.product_code::varchar = paf.l4_name
        join dc_filter dc on oor.loc_code = dc.linked_store_code
        where not oor.is_deleted
          and oor.article is not null
          and oor.order_quantity > 0
        group by oor.order_status_id
    ),
    app_agg as (
        select
            ooa.order_status_id,
            count(distinct (ooa.article, ooa.loc_code, ooa.order_placement_date, ooa.expected_receipt_date, ooa.editable_expected_receipt_date,
                CASE WHEN ooa.order_gen_type = ''Manual'' THEN ''Manual'' ELSE ''Other'' END)) as order_cnt,
            sum(ooa.order_quantity) as order_qty,
            sum(ooa.order_quantity * ooa.unit_cost) as order_cost
        from inventory_smart.oms_orders_approved ooa
        join filtered_products paf on ooa.product_code::varchar = paf.l4_name
        join dc_filter dc on ooa.loc_code = dc.linked_store_code
        where not ooa.is_deleted
          and ooa.article is not null
          and ooa.order_placement_date >= (current_date - interval ''28 day'')::date
          and ooa.order_quantity is not null and ooa.unit_cost is not null
          and ooa.order_quantity > 0 and ooa.unit_cost > 0
        group by ooa.order_status_id
    )
    select
        order_status_id,
        coalesce(order_cnt, 0) as orders_cnt_by_status,
        coalesce(order_qty, 0) as order_qty_by_status,
        coalesce(order_cost, 0) as order_cost_by_status
    from rec_agg
    union all
    select
        order_status_id,
        coalesce(order_cnt, 0) as orders_cnt_by_status,
        coalesce(order_qty, 0) as order_qty_by_status,
        coalesce(order_cost, 0) as order_cost_by_status
    from app_agg';


  raise notice 'v_orders_status_summary_sql %',v_orders_status_summary_sql;
  open $1 for execute v_orders_status_summary_sql;
  RETURN $1;
end
$function$
;
