--liquibase formatted sql
--changeset adesh:user_reserve_and_instock_list runOnChange:true stripComments:false splitStatements:false context:MTP-68640 labels:MTP-68640
--comment: MTP-68640-search-setall-fix
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.user_reserve_and_instock_list(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.user_reserve_and_instock_list(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

DECLARE

	_query_combine text:= '';
	_channel text := inventory_smart.get_channel_from_input($2);
	_query_pa text:= global.form_main_table_filters('product_attributes_filter', $2);
	_query_table_filters text := '';
	_unique_key jsonb;
	_product_attr jsonb;
	_unique_clause text := '';
	_filter_having text;
    _filter_where text;
    _ph_sort text ;
    _ph_search text;
    _overall_search text;
    _limit int := 0;
    _offset int;
	begin
	SELECT $2 - 'unique_key' INTO _product_attr;
	SELECT $2->'unique_key' INTO _unique_key;

    _unique_key := json_build_object('unique_key', _unique_key);

    _query_pa := global.form_main_table_filters('product_attributes_filter', _product_attr);
    _unique_clause := global.form_main_table_filters('product_attributes_filter', _unique_key);
    _unique_clause := replace(_unique_clause, 'unique_key', 'CONCAT(product_code::text, ''|'', dc_code::text, ''|'', type::text, ''|'', inventory_source::text)');
    SELECT * FROM inventory_smart.form_search_sort_clause($4, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset;

    _query_table_filters =  _overall_search || replace(global.form_table_query($4), 'WHERE', 'AND');
    IF _unique_clause != '' THEN
        _unique_clause := replace(_unique_clause, 'WHERE', 'AND');
    END IF;

		_query_combine :='
		with product_attributes_filter as (
			select * from global.product_attributes_filter '||_query_pa|| _ph_search ||'
		),
		user_reserve as (
			select
				product_code,
                type,
				dc_code,
				dc_code_display,
				reservation_till_date,
				instock_inclusion,
				u.name updated_by,
				incoming_po_30,
				incoming_po_31_60,
				incoming_po_61_90,
				inventory_source,
				channel,
				COALESCE(comment, '''') comment,
				COALESCE(new_store_reserve,0) new_store_reserve,
				COALESCE(user_reserve,0) user_reserve
			from 
				(select
					product_code,
					type,
					linked_store_code as dc_code_display,
					dc_code,
					reservation_till_date,
					instock_inclusion,
					comment,
					drq.updated_by,
					incoming_po_30,
					incoming_po_31_60,
					incoming_po_61_90,
					inventory_source,
					channel,
					sum(quantity) as user_reserve
				from
					inventory_smart.dc_reserve_quantity drq
					join global.distribution_centres dc using (dc_code)
					join product_attributes_filter paf using (product_code)
					where dc.is_active and type = ''U''
					group by 1,2,3,4,5,6,7,8,9,10,11,12,13
					) a
			full join 
				(select 
					product_code,
					dc_code,
					COALESCE(sum(case when type = ''N'' then quantity else 0 end),0) as new_store_reserve
				from	
					(select
						product_code,
						type,
						dc_code, 
						sum(quantity) as quantity
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
		),
		--select * from latest_inventory
		results as (select
			CONCAT(product_code::text, ''|'', us.dc_code::text, ''|'', us.type::text, ''|'', us.inventory_source::text) AS unique_key,
			product_code, 
			dc_code,
			dc_code_display,
			channel,
			type,
			inventory_source,
			product_name,
			l1_name,
			l2_name,
			l3_name,
			l4_name,
			l5_name,
			article,
			style_name,
			size,
			new_store_reserve,
			user_reserve,
			incoming_po_30,
			incoming_po_31_60,
			incoming_po_61_90,
			reservation_till_date,
			instock_inclusion,
			us.updated_by,
			comment,
			COALESCE(dc_oh,0) dc_oh, 
			COALESCE(it,0) it, 
			COALESCE(oo,0) oo,
			nsr.reservation_date,
			COALESCE(round((case when (dc_oh - (new_store_reserve)) = 0 then 0 else (user_reserve / (dc_oh - (new_store_reserve)) * 100.0) end),2),0) as user_reserve_percentage,
			COALESCE((new_store_reserve + user_reserve),0) as total_units_reserved,
			COALESCE((dc_oh - (new_store_reserve + user_reserve)),0) as net_available,
			COALESCE(dc_oh - (new_store_reserve),0) as dc_available
		from user_reserve us 
		left join latest_inventory li using (product_code, dc_code)
		join product_attributes_filter paf using (product_code)
		left join (select product_code, max(reservation_date) reservation_date from global.new_store_reserve group by 1) nsr using (product_code))
        SELECT distinct * FROM results WHERE TRUE '
        ||_unique_clause ||_query_table_filters;
		
	raise notice '%', _query_combine;

  	open $1 for execute _query_combine;
 	RETURN $1;
		
	END;
$function$
;