--liquibase formatted sql
--changeset liquibase:format_allocation_for_xml runOnChange:true stripComments:false splitStatements:false context:MTP-22718 labels:liquibase_project_start
--comment: SHpping date lead time change
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.format_allocation_for_xml(input refcursor, text, integer);
CREATE OR REPLACE FUNCTION inventory_smart.format_allocation_for_xml(input refcursor, text, integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 * 
 * 
   Strategy Screen SP
  -------------------
  Inputs :- 
  ------
  $1 - refcursor
  $2 - allocation_code
  ----------
  SP Call :-
  ----------
	begin;
	select * from inventory_smart.format_allocation_for_xml('my_cur'::refcursor, allocation_code, user_id);
	FETCH ALL IN "my_cur";
	commit;
------
   Docs :-
   ------
  Currently no cache is used
   Updated_by       		Updated_on      Purpose
   ----------       		-----------     --------
   Suba Selvandran			08-Mar-2023     XML creation during finalize 
 */
 declare
 	_query_combine text;
 begin
	_query_combine := format($$
		WITH base_table as (
			SELECT *, store store_code, retail_size_cd size FROM inventory_smart.create_allocation_result_flat_gurobi carfg 
			WHERE allocation_code = '%1$s'
		),
		flat_table as (
			SELECT article,
				   store store_code,
				   js.key::int dc_code, 
				   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) size,
				   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty		
			FROM (
				SELECT article, store, pack_dc_allocation FROM base_table 
				GROUP BY 1, 2, 3
			) foo , JSONB_EACH(pack_dc_allocation) js
		),
		shipping_date as (
			SELECT store_code, dc_data.key::int dc_code, dc_data.value::text AS shipping_date 
			FROM (
				SELECT store_data.key as store_code,
					   store_data.value::json as dc_data
				FROM inventory_smart.plan_attributes a, JSON_EACH_TEXT(a.attribute_value::json) as store_data
		    	WHERE plan_code = '%1$s'  and attribute_name = 'shipping_date'
			) dc, JSON_EACH_TEXT(dc_data) as dc_data
		),
		cancel_date as (
			SELECT store_code, dc_data.key::int dc_code, dc_data.value::text as cancel_date 
  			FROM (
    			SELECT store_data.key as store_code, store_data.value::json as dc_data
    			FROM inventory_smart.plan_attributes a, JSON_EACH_TEXT(a.attribute_value::json) as store_data
    			WHERE plan_code = '%1$s'  and attribute_name = 'cancel_date'
  				) dc, JSON_EACH_TEXT(dc_data) as dc_data
		)
		,dc_data as (
			SELECT dc_code,
				   name,
                   CASE WHEN linked_store_code = 'PNA31' AND (current_time at time zone 'EST')::time > '15:15:00' THEN 2 
                         WHEN linked_store_code = 'PNA31' AND (current_time at time zone 'EST')::time <= '15:15:00' THEN 1
                         WHEN linked_store_code = 'IN07' THEN 1
                         WHEN linked_store_code = 'PNA17' THEN 2
                         WHEN linked_store_code = 'PNA27' AND (current_time at time zone 'EST')::time > '15:15:00' THEN 2
                         WHEN linked_store_code = 'PNA27' AND (current_time at time zone 'EST')::time <= '15:15:00' THEN 1
                         WHEN linked_store_code = 'UL01' and (current_time at time zone 'EST')::time > '14:15:00' THEN 3
                         WHEN linked_store_code = 'UL01' AND (current_time at time zone 'EST')::time <= '14:15:00' THEN 2
                         WHEN linked_store_code = 'IN01' THEN 1
                   ELSE 1 end lead_day,
				   season_code,
				   vendor_code
			FROM global.distribution_centres dcs
			LEFT JOIN global.store_attributes_filter using(dc_code)
		),
		product_data as (
			SELECT a.article, a.size, product_code, product_cost as cost, product_price as price
			FROM (
				SELECT article, UNNEST(sizes) size, UNNEST(product_codes) product_code
				FROM inventory_smart.ph_master
				WHERE article IN (
					SELECT DISTINCT article
					FROM inventory_smart.create_allocation_result_flat_gurobi carfg
					WHERE allocation_code = '%1$s'
				)
			) a
			LEFT JOIN global.product_attributes_filter USING(product_code)
		),
		released as (
			SELECT released_date, released_by
			FROM (
				SELECT NULLIF(attribute_value, '') released_date FROM inventory_smart.plan_attributes WHERE attribute_name = 'released_at' AND plan_code = '%1$s'
			) a
			CROSS JOIN (
				SELECT NULLIF(attribute_value, '') released_by FROM inventory_smart.plan_attributes WHERE attribute_name = 'released_by' AND plan_code = '%1$s'
			) b
		),
		dates as (
			SELECT ft.store_code,
				   ft.dc_code,
				   COALESCE(sd.shipping_date, TO_CHAR(Date(COALESCE(ra.released_date, now()::text)::timestamp + interval '1 day' * dcs.lead_day), 'MM-DD-YYYY')) as shipping_date,
				   COALESCE(cd.cancel_date, TO_CHAR(Date(COALESCE(ra.released_date, now()::text)::timestamp + interval '30 day'), 'MM-DD-YYYY')) as cancel_date,
				   date(COALESCE(sd.shipping_date, TO_CHAR(Date(COALESCE(ra.released_date, now()::text)::timestamp + interval '1 day' * dcs.lead_day), 'MM-DD-YYYY'))) + interval '1 day' * COALESCE(transit_time, 0)  delivery_dt,
				   dcs.season_code,
				   dcs.vendor_code
			FROM (SELECT store_code, dc_code FROM flat_table GROUP BY 1, 2) ft
			LEFT JOIN shipping_date sd USING(store_code, dc_code)
			LEFT JOIN cancel_date cd USING(store_code, dc_code)
			LEFT JOIN dc_data dcs USING(dc_code)
			LEFT JOIN global.product_mapping_store_dc sdc USING(store_code, dc_code)
			LEFT JOIN inventory_smart.dc_transit_time_mapping USING(mapping_code)
			FULL JOIN released ra ON TRUE
		),
		user_info as (
			SELECT (COALESCE(attribute_value, '{}')::json)->>'retail_pro_id' as empl_name
			FROM global.user_attributes
			WHERE user_code = COALESCE((SELECT released_by FROM released), '%2$s')::int AND attribute_name = 'custom_attributes'
		)
		SELECT 1 sbs_no,
			   0 po_type,
			   0 status,
			   1 active,
			   -2 billto_store_no,
			   saf.store_id shipto_store_no,
			   saf.store_id store_no,
			   saf.store_name,
			   ROW_NUMBER() OVER (PARTITION BY ft.dc_code, ft.store_code) item_pos,
			   COALESCE(ra.released_date, now()::text)::timestamp created_date,
			   COALESCE(ra.released_date, now()::text)::timestamp modified_date,
			   dt.shipping_date,
			   COALESCE(ra.released_date, now()::text)::timestamp sent_date,
			   dt.cancel_date,
			   pm.l0_name department,
			   pm.l1_name gender,
			   pm.l2_name subcat,
			   pm.l3_name dcs,
			   saf2.store_id dc_code,
			   dc.name dc_name,
			   bt.description ||
			   		CASE WHEN dc.linked_store_code = 'PNA27' THEN 'I'
						 WHEN dc.linked_store_code = 'PNA17' THEN '1'
						 WHEN dc.linked_store_code = 'PNA31' THEN '2'
						 ELSE ''
					END
					|| '-' || saf.store_id as po_no,
			   pd.product_code as item_sid,
			   CASE WHEN EXTRACT(dow FROM dt.delivery_dt) = 6 THEN dt.delivery_dt + interval '2 days'
			   		WHEN EXTRACT(dow FROM dt.delivery_dt) = 7 THEN dt.delivery_dt + interval '1 day'
			   		ELSE dt.delivery_dt END delivery_dt,
			   COALESCE(ui.empl_name, '') empl_name,
			   dt.vendor_code vend_code,
			   dt.season_code season_code,
			   pd.price,
			   pd.cost,
			   ft.allocated_qty ord_qty,
			   bt.min,
	   		   bt.max,
	   		   bt.demand,
	   		   bt.article,
	   		   bt.style_description style_name,
	   		   bt.color color_desc,
	   		   bt.ros actual_ros,
	   		   bt.wos target_wos,
	   		   bt.oh,
	   		   bt.oo,
	   		   bt.it,
	   		   bt.min min_constraint,
	   		   bt.size
		FROM base_table bt 
		LEFT JOIN flat_table ft USING(article, size, store_code)
		LEFT JOIN dates dt USING(dc_code, store_code)
		LEFT JOIN inventory_smart.ph_master pm USING(article)
		LEFT JOIN product_data pd USING(article, size)
		FULL JOIN released ra ON TRUE 
		left join global.distribution_centres dc using(dc_code)
		left join global.store_attributes_filter saf using(store_code)
		left join global.store_attributes_filter saf2 on ft.dc_code = saf2.dc_code
 		FULL JOIN user_info ui ON TRUE 
		$$, $2, $3);
	OPEN $1 FOR EXECUTE _query_combine;
	raise notice ' %', _query_combine;
	RETURN $1;
END
$function$
;
