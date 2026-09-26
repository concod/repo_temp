--liquibase formatted sql
--changeset suba.nataraj:user_reserve_and_instock_list runOnChange:true stripComments:false splitStatements:false context:MTP-82925 labels:MTP-82925
--comment: Fix null instock inclusion issue
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.user_reserve_and_instock_list(input refcursor, jsonb, jsonb, boolean);
DROP FUNCTION IF EXISTS inventory_smart.user_reserve_and_instock_list(input refcursor, jsonb, jsonb, boolean, boolean);
CREATE OR REPLACE FUNCTION inventory_smart.user_reserve_and_instock_list(input refcursor, jsonb, jsonb, jsonb, boolean, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

declare

_query_combine text:= '';
	  
_channel text := inventory_smart.get_channel_from_input($2);
_query_pa text:= global.form_main_table_filters('product_attributes_filter', $2);
_query_table_filters text := '';
    _ph_sort text ;
    _ph_search text;
    _overall_search text;
    _limit int := 0;
    _offset int;
	begin
SELECT * FROM inventory_smart.form_search_sort_clause($4, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset;

    IF _limit != 0 THEN
        _query_table_filters =  ' WHERE TRUE ' || _overall_search || replace(global.form_table_query($4), 'WHERE', 'AND');
    END IF;

		
		_query_combine :='
		with product_attributes_filter as (
			select * from global.product_attributes_filter '||_query_pa|| _ph_search ||'
		)
		, user_reserve as (
			select
				product_code,
				dc_code,
				reservation_till_date,
				coalesce(a.instock_inclusion, b.instock_inclusion ) as instock_inclusion,
				u.name updated_by,
				COALESCE(comment, '''') comment,
				COALESCE(ecom_reserve,0) ecom_reserve,
				COALESCE(system_reserve,0) system_reserve,
				COALESCE(new_store_reserve,0) new_store_reserve,
				COALESCE(user_reserve,0) user_reserve
			from 
				(select
					product_code,
					type,
					dc_code, 
					reservation_till_date,
					instock_inclusion,
					comment,
					drq.updated_by,
					sum(quantity) as user_reserve
				from
					inventory_smart.dc_reserve_quantity drq
					join global.distribution_centres dc using (dc_code)
					join product_attributes_filter paf using (product_code)
					where dc.is_active and type = ''U''
					group by 1,2,3,4,5,6,7
					) a
			full join 
				(select 
					product_code,
					dc_code,
					COALESCE(sum(case when type = ''E'' then quantity else 0 end),0) as ecom_reserve,
					COALESCE(sum(case when type = ''S'' then quantity else 0 end),0) as system_reserve,
					COALESCE(sum(case when type = ''N'' then quantity else 0 end),0) as new_store_reserve,
					BOOL_AND(instock_inclusion) as instock_inclusion
				from	
					(select
						product_code,
						type,
						dc_code, 
						sum(quantity) as quantity,
						instock_inclusion
					from
						inventory_smart.dc_reserve_quantity drq
						join global.distribution_centres dc using (dc_code)
						join product_attributes_filter paf using (product_code)
						where dc.is_active and type != ''U''
						group by 1,2,3
						) x 
					group by 1,2
				)b using (product_code, dc_code)
			left join global.user_master u on a.updated_by::int=u.user_code 
		)
		--select * from user_reserve
		, latest_inventory as (
			select product_code, dc_code, COALESCE(sum(oh),0) as dc_oh, COALESCE(sum(it),0) as it, COALESCE(sum(oo),0) as oo from inventory_smart.sku_dc_available_units sdau  
			join user_reserve using (product_code, dc_code)
			group by 1,2
		)
		, po as (
			SELECT  product_code
       ,SUM(case WHEN (not_before_date > current_date+1 AND not_before_date < current_date + interval ''30'' day) THEN ordered_qty else 0 end) AS po_oo_next_30_days
       ,SUM(case WHEN (not_before_date > current_date+31 AND not_before_date < current_date + interval ''60'' day) THEN ordered_qty else 0 end) AS po_oo_next_60_days
       ,SUM(case WHEN (not_before_date > current_date+61 AND not_before_date < current_date + interval ''90'' day) THEN ordered_qty else 0 end) AS po_oo_next_90_days
FROM inventory_smart.po_master pm
GROUP BY  1
)
		--select * from latest_inventory
		select * from (select
			product_code, 
			us.dc_code, 
			product_code as unique_key,
			paf.product_description,
			paf.article,
			paf.l0_name,
			paf.l1_name,
			paf.l2_name,
			paf.merchandise_category,
			paf.vendor_name,
			paf.product_channel_name,
			ecom_reserve,
			system_reserve,
			new_store_reserve,
			user_reserve,
			us.reservation_till_date,
			us.instock_inclusion,
			us.updated_by,
			us.comment,
			COALESCE(dc_oh,0) dc_oh, 
			COALESCE(it,0) it, 
			COALESCE(oo,0) oo,
			nsr.reservation_date,
			COALESCE(round((case when (dc_oh - (ecom_reserve + system_reserve + new_store_reserve)) = 0 then 0 else (user_reserve / (dc_oh - (ecom_reserve + system_reserve + new_store_reserve)) * 100.0) end),2),0) as user_reserve_percentage,
			COALESCE((ecom_reserve + system_reserve + new_store_reserve + user_reserve),0) as total_units_reserved,
			COALESCE((dc_oh - (ecom_reserve + system_reserve + new_store_reserve + user_reserve)),0) as net_available,
			COALESCE(dc_oh - (ecom_reserve + system_reserve + new_store_reserve),0) as dc_available,
			COALESCE(po_oo_next_30_days,0) po_oo_next_30_days,
			COALESCE(po_oo_next_60_days,0) po_oo_next_60_days,
			COALESCE(po_oo_next_90_days,0) po_oo_next_90_days
		from user_reserve us 
		left join latest_inventory li using (product_code, dc_code)
		join product_attributes_filter paf using (product_code)
		left join (select product_code, max(reservation_date) reservation_date from global.new_store_reserve group by 1) nsr using (product_code)
		left join po using(product_code)) x
' || _query_table_filters;	
		
	raise notice '%', _query_combine;

  	open $1 for execute _query_combine;
 	RETURN $1;
		
	END;
$function$
;