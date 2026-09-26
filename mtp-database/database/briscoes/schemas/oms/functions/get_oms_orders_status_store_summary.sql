--liquibase formatted sql
--changeset nikhil.dhoot:get_oms_orders_status_store_summary_update5 runOnChange:true stripComments:false splitStatements:false context:MTP-107844 labels:MTP-107844
--comment: MTP-107844
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_orders_status_store_summary(input refcursor, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_orders_status_store_summary(input refcursor, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_orders_status_store_summary(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
	  v_pa_sql  text:='';
	  v_sa_sql  text:='';
	  v_orders_status_summary_sql  text:='';
	BEGIN
		v_pa_sql :=inventory_smart.form_main_table_filters('ph_master',$2);
		v_sa_sql :=inventory_smart.form_main_table_filters('store_attributes_filter',$3);




	v_orders_status_summary_sql := '
    with product_filters as (
    select product_code from global.product_attributes_filter ' || v_pa_sql || ' and ordering=''Y''
    ),

	store_filter as (
    select store_code, is_deleted from global.store_attributes_filter ' || v_sa_sql || '
    ),

    recommended_filtered AS (
        SELECT 
            order_status_id,
            article,
            store_code,
            order_placement_date,
            expected_receipt_date,
            editable_expected_receipt_date,
            CASE WHEN order_gen_type = ''Manual'' THEN ''Manual'' ELSE ''Other'' END AS order_gen_type_category,
            order_quantity,
            unit_cost
        FROM inventory_smart.oms_orders_recommended_store
        WHERE NOT is_deleted
        AND article IS NOT NULL
        AND store_code IN (SELECT store_code FROM store_filter)
        AND product_code IN (SELECT product_code FROM product_filters)
    ),

    approved_filtered AS (
        SELECT 
            order_status_id,
            article,
            store_code,
            order_placement_date,
            expected_receipt_date,
            editable_expected_receipt_date,
            CASE WHEN order_gen_type = ''Manual'' THEN ''Manual'' ELSE ''Other'' END AS order_gen_type_category,
            order_quantity,
            unit_cost
        FROM inventory_smart.oms_orders_approved_store
        WHERE NOT is_deleted
        AND article IS NOT NULL
        AND order_placement_date >= (CURRENT_DATE - interval ''28 day'')::date
        AND store_code IN (SELECT store_code FROM store_filter)
        AND product_code IN (SELECT product_code FROM product_filters)
    ),

    recommended_order_counts AS (
        SELECT 
            order_status_id,
            COUNT(DISTINCT CONCAT_WS(''|'', article, store_code, order_placement_date, expected_receipt_date, editable_expected_receipt_date, order_gen_type_category)) AS order_cnt
        FROM recommended_filtered
        GROUP BY order_status_id
    ),

    approved_order_counts AS (
        SELECT 
            order_status_id,
            COUNT(DISTINCT CONCAT_WS(''|'', article, store_code, order_placement_date, expected_receipt_date, editable_expected_receipt_date, order_gen_type_category)) AS order_cnt
        FROM approved_filtered
        GROUP BY order_status_id
    )

    SELECT 
        r.order_status_id,
        COALESCE(rc.order_cnt, 0) AS orders_cnt_by_status,
        SUM(r.order_quantity) AS order_qty_by_status,
        SUM(r.order_quantity * r.unit_cost) AS order_cost_by_status
    FROM recommended_filtered r
    LEFT JOIN recommended_order_counts rc USING (order_status_id)
    GROUP BY r.order_status_id, rc.order_cnt

    UNION ALL

    SELECT 
        a.order_status_id,
        COALESCE(ac.order_cnt, 0) AS orders_cnt_by_status,
        SUM(a.order_quantity) AS order_qty_by_status,
        SUM(a.order_quantity * a.unit_cost) AS order_cost_by_status
    FROM approved_filtered a
    LEFT JOIN approved_order_counts ac USING (order_status_id)
    GROUP BY a.order_status_id, ac.order_cnt';


	raise notice 'v_orders_status_summary_sql %',v_orders_status_summary_sql;
	open $1 for execute v_orders_status_summary_sql;
	RETURN $1;

	END;
$function$
;