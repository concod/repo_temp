--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_orders_status_summary_vs_1 runOnChange:true stripComments:false splitStatements:false context:MTP-108671 labels:MTP-108671
--comment: Updated to use global.form_main_table_filters to fix product_codes column error

DROP FUNCTION IF EXISTS inventory_smart.get_oms_orders_status_summary(input refcursor, jsonb, date, date);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_orders_status_summary(input refcursor, jsonb, date, date)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                     text:='';
  v_orders_status_summary_sql  text:='';
begin
 	v_pa_sql :=global.form_main_table_filters(
    	'product_attributes_filter',
    	$2
  	);
                                       

   v_orders_status_summary_sql := '
    with recommended_order_counts as (
        select 
            order_status_id,
            count(*) as order_cnt  -- count unique groups for each order_status_id
        from (
            select 
                order_status_id,
                oor.article,
                loc_code,
                order_placement_date,
                expected_receipt_date,
                editable_expected_receipt_date,
                CASE 
                    WHEN oor.order_gen_type = ''Manual'' THEN ''Manual''  
                    ELSE ''Other''
                END AS order_gen_type_category
            from 
                inventory_smart.oms_orders_recommended oor
			inner join 
        		(select * from global.product_attributes_filter ' || v_pa_sql || ') paf
    		on 
        		oor.product_code = paf.product_code
            inner join 
                global.distribution_centres dc
            on 
                oor.loc_code = dc.linked_store_code
                and not dc.is_deleted
            where 
                not oor.is_deleted and oor.article is not null and oor.order_quantity > 0
            group by 
                order_status_id, oor.article, loc_code, order_placement_date, expected_receipt_date, order_gen_type_category, editable_expected_receipt_date
        ) grouped_rec
        group by 
            order_status_id
    ),
    approved_order_counts as (
        select 
            order_status_id,
            count(*) as order_cnt  -- count unique groups for each order_status_id
        from (
            select 
                order_status_id,
                ooa.article,
                loc_code,
                order_placement_date,
                expected_receipt_date,
                editable_expected_receipt_date,
                CASE 
                    WHEN ooa.order_gen_type = ''Manual'' THEN ''Manual''  
                    ELSE ''Other''
                END AS order_gen_type_category
            from 
                inventory_smart.oms_orders_approved ooa
			inner join 
        		(select * from global.product_attributes_filter ' || v_pa_sql || ') paf
    		on 
        		ooa.product_code = paf.product_code
            inner join 
                global.distribution_centres dc
            on 
                ooa.loc_code = dc.linked_store_code
                and not dc.is_deleted
            where 
                not ooa.is_deleted and ooa.article is not null
                and order_placement_date >= (CURRENT_DATE - interval ''28 day'')::date
            group by 
                order_status_id, ooa.article, loc_code, order_placement_date, expected_receipt_date, order_gen_type_category,editable_expected_receipt_date
        ) grouped_app
        group by 
            order_status_id
    )
    select 
        oor.order_status_id,
        coalesce(rec.order_cnt, 0) as orders_cnt_by_status,
        sum(order_quantity) as order_qty_by_status,
        sum(order_quantity * unit_cost) as order_cost_by_status
    from 
        inventory_smart.oms_orders_recommended oor
    inner join 
        (select * from global.product_attributes_filter ' || v_pa_sql || ') paf
    on 
        oor.product_code = paf.product_code
    inner join
        global.distribution_centres dc
    on 
        oor.loc_code = dc.linked_store_code
        and not dc.is_deleted
    left join 
        recommended_order_counts rec
    on 
        oor.order_status_id = rec.order_status_id
    where 
        not oor.is_deleted and oor.article is not null and oor.order_quantity > 0
    group by 
        oor.order_status_id, rec.order_cnt

    union all

    select 
        ooa.order_status_id,
        coalesce(app.order_cnt, 0) as orders_by_status,
        sum(order_quantity) as order_qty_by_status,
        sum(order_quantity * unit_cost) as order_cost_by_status
    from 
        inventory_smart.oms_orders_approved ooa
    inner join 
        (select * from global.product_attributes_filter ' || v_pa_sql || ') paf
    on 
        ooa.product_code::varchar = paf.product_code
    inner join 
        global.distribution_centres dc
    on 
        ooa.loc_code = dc.linked_store_code
        and not dc.is_deleted
    left join 
        approved_order_counts app
    on 
        ooa.order_status_id = app.order_status_id
    where 
        not ooa.is_deleted and order_placement_date >= (CURRENT_DATE - interval ''28 day'')::date and ooa.article is not null
    group by 
        ooa.order_status_id, app.order_cnt';


  raise notice 'v_orders_status_summary_sql %',v_orders_status_summary_sql;
  open $1 for execute v_orders_status_summary_sql;
  RETURN $1;
end
$function$
;