--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:get_oms_order_vendor_store_summary_update_10 runOnChange:true stripComments:false splitStatements:false context:MTP-110777 labels:MTP-110777-2
--comment: added projected_delivery_date in the response
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_order_vendor_store_summary(input refcursor, jsonb, jsonb, jsonb, integer);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_order_vendor_store_summary(input refcursor, jsonb, jsonb, jsonb, integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
		v_pa_sql text:='';
		v_sa_sql text:='';
  		v_order_vendor_store_sql text:='';
		table_query jsonb;
		search_json jsonb;
		sort_json jsonb;
		limit_json jsonb;
		v_limit_cls text := '';
   		v_search_cls text := '';
  		v_sort_cls text := '';
		
	BEGIN

		-- Build filters
		v_pa_sql := inventory_smart.form_main_table_filters('ph_master', $2);
		v_sa_sql := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
		
		table_query := $4;
		search_json = table_query -> 'search';
		sort_json = table_query -> 'sort';
		limit_json = table_query -> 'limit';
		
		if search_json <> '{}' then
    		v_search_cls := global.form_table_query(jsonb_build_object('search', search_json));
  		end if;

  		if sort_json <> '{}' then
    		v_sort_cls := global.form_table_query(jsonb_build_object('sort', sort_json));
  		end if;
		
		if limit_json <> '{}' then
    		v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json));
  		end if;
		
		-- Push store filter and status filter up-front; keep product attrs join constrained
		v_order_vendor_store_sql := '
		WITH store_filter AS (
			SELECT store_code, sales_org_name
			FROM global.store_attributes_filter
			' || v_sa_sql || '
		),
		 product_filter AS (
			SELECT product_code, product_description
			FROM global.product_attributes_filter
			' || v_pa_sql || '
		),
		oors_filtered AS (
			SELECT oors.*, paf.product_description
			FROM inventory_smart.oms_orders_recommended_store oors
			INNER JOIN store_filter saf ON oors.store_code = saf.store_code
			INNER JOIN product_filter paf ON oors.product_code = paf.product_code
			WHERE oors.order_status_id = '|| $5 ||'
		)
		select * from (
			select
			oors.product_code,
			oors.article,
			oors.store_code,
			oors.order_placement_date,
			oors.projected_delivery_date,
			oors.order_gen_type,
			oors.style_name,
			oors.l1_name,
			oors.l2_name,
			oors.l3_name,
			oors.l5_name,
			oors.vendor_name,
			CONCAT(oors.product_code, oors.store_code, oors.order_placement_date, oors.projected_delivery_date, oors.order_gen_type ) AS order_id,	
			SUM(oks.store_inv) AS store_inv,
			SUM(oors.order_quantity) AS order_quantity,
			SUM(oors.order_cost) AS order_cost,
			sum(oors.elt_projected_store_inv) as elt_projected_store_inv,
			sum(oors.elt_projected_safety_stock) as elt_projected_safety_stock,
			sum(COALESCE(opms.oo, 0) + COALESCE(opms.it, 0)) as oo_it,
			MIN(oors.min_order_quantity_style) as min_order_quantity_style,
			MIN(oors.min_order_quantity_sku) as min_order_quantity_sku,
			JSONB_AGG(
				jsonb_build_object(
					''size'', oors.size,
					''store_inv'', oks.store_inv,
					''order_quantity'', oors.order_quantity,
					''order_cost'', oors.order_cost,
					''order_status_id'', oors.order_status_id,
					''elt_projected_store_inv'', oors.elt_projected_store_inv,
					''elt_projected_safety_stock'', oors.elt_projected_safety_stock,
					''id'', oors.id,
					''oo_it'', (COALESCE(opms.oo, 0) + COALESCE(opms.it, 0)),
					''min_order_quantity_style'', oors.min_order_quantity_style,
					''min_order_quantity_sku'', oors.min_order_quantity_sku,
					''order_batch_name'', oors.order_batch_name,
					''comment'', oors.comment,
					''projected_delivery_date'', oors.projected_delivery_date,
					''order_gen_type'', oors.order_gen_type,
					''order_placement_date'', oors.order_placement_date
				) 
			) AS product_details
			from
			oors_filtered oors
			left join inventory_smart.oms_po_master_store opms 
				on opms.product_code = oors.product_code 
				and opms.store_code = oors.store_code 
				and opms.projected_delivery_date = oors.projected_delivery_date 
				and opms.fiscal_year_week = oors.fiscal_year_week
			left join inventory_smart.oms_kpi_store oks 
				on oks.year_week = oors.fiscal_year_week 
				and oks.product_code = oors.product_code
				and oks.store_code = oors.store_code 
			group by 1,2,3,4,5,6,7,8,9,10,11,12
		)x
		' || v_search_cls || '
		' || v_sort_cls || '
		' || v_limit_cls;
		raise notice 'v_order_vendor_store_sql %', v_order_vendor_store_sql;
		open $1 for execute v_order_vendor_store_sql;
		RETURN $1;
	END;
$function$
;