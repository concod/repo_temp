--liquibase formatted sql
--changeset liquibase:user_reserve_and_instock_list_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-84048 labels:MTP-84048
--comment: MTP-84048-user_reserve_and_instock_list_initial
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.user_reserve_and_instock_list(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.user_reserve_and_instock_list(input refcursor, jsonb, jsonb, jsonb, additional_columns text DEFAULT '')
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
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
	begin
	SELECT $2 - 'unique_key' INTO _product_attr;
	SELECT $2->'unique_key' INTO _unique_key;

    _unique_key := json_build_object('unique_key', _unique_key);

    _query_pa := global.form_main_table_filters('product_attributes_filter', _product_attr);
    _unique_clause := global.form_main_table_filters('product_attributes_filter', _unique_key);
    _unique_clause := replace(_unique_clause, 'unique_key', 'CONCAT(product_code::text, ''|'', dc_code::text, ''|'', type::text, ''|'', inventory_source::text, ''|'', channel::text)');
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
				dc_code_display,
				dc_code,
				reservation_till_date,
				instock_inclusion,
				u.name updated_by,
				incoming_po_30,
				incoming_po_31_60,
				incoming_po_61_90,
				coalesce(a.inventory_source,b.inventory_source) as inventory_source,
				coalesce(a.channel,b.channel) as channel,
				coalesce(a.type,b.type) as type,
				purpose,
				COALESCE(comment, '''') comment,
				COALESCE(new_store_reserve,0) new_store_reserve,
				COALESCE(user_reserve,0) user_reserve
			from 
				(select
					product_code,
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
					type,
					purpose,
					sum(quantity) as user_reserve
				from
					inventory_smart.dc_reserve_quantity drq
					join global.distribution_centres dc using (dc_code)
					join product_attributes_filter paf using (product_code)
					where dc.is_active and type = ''U''
					group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14
					) a
			full join 
				(select 
					product_code,
					dc_code,
					type,
        			inventory_source,
					channel,
					COALESCE(sum(case when type = ''N'' then quantity else 0 end),0) as new_store_reserve
				from	
					(select
						product_code,
						dc_code,
        				type,
						inventory_source,
						channel,
						sum(quantity) as quantity
					from
						inventory_smart.dc_reserve_quantity drq
						join global.distribution_centres dc using (dc_code)
						join product_attributes_filter paf using (product_code)
						where dc.is_active and type != ''U''
						group by 1,2,3,4,5
						) x 
					group by 1,2,3,4,5
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
			CONCAT(product_code::text, ''|'', us.dc_code::text, ''|'', us.type::text, ''|'', us.inventory_source::text, ''|'', us.channel::text) AS unique_key,
			product_code, 
			us.dc_code,
			us.dc_code_display,
			us.channel,
			type,
			inventory_source,
			paf.product_description,
			paf.l0_name,
			paf.l3_name,
			paf.l4_name,
			paf.l5_name,
			paf.l6_name,
			paf.l7_name,
			paf.l7_id,
			paf.color,
			paf.subbrand_code_desc,
			paf.collection,
			paf.masterstyle_descr,
			paf.product_lifecycle,
			paf.flex_style,
			paf.generic,
			paf.sizes_mat,
			paf.form,
			paf.user_defined_1,
			paf.user_defined_2,
			paf.user_defined_3,
			paf.user_defined_4,
			paf.user_defined_5,
			paf.user_defined_6,
			new_store_reserve,
			user_reserve,
			purpose,
			incoming_po_30,
			incoming_po_31_60,
			incoming_po_61_90,
			us.reservation_till_date,
			us.instock_inclusion,
			us.updated_by,
			us.comment,
			COALESCE(dc_oh,0) dc_oh, 
			COALESCE(it,0) it, 
			COALESCE(oo,0) oo,
			case when dc.linked_store_code =''S015'' then nsr.reservation_date end as reservation_date,
			COALESCE(round((case when (dc_oh - (new_store_reserve)) = 0 then 0 else (user_reserve / (dc_oh - (new_store_reserve)) * 100.0) end),2),0) as user_reserve_percentage,
			COALESCE((new_store_reserve + user_reserve),0) as total_units_reserved,
			COALESCE((dc_oh - (new_store_reserve + user_reserve)),0) as net_available,
			COALESCE(dc_oh - (new_store_reserve),0) as dc_available
		from user_reserve us 
		left join latest_inventory li using (product_code, dc_code)
		join product_attributes_filter paf using (product_code)
		left join
		(select product_code, max(nsa.reservation_start_date) reservation_date
		from "global".new_store_reserve nsr
		inner join "global".new_store_attributes nsa
		on nsa.store_code = nsr.store_code
		group by 1) nsr using (product_code)
		left join  global.distribution_centres dc
		using (dc_code))
        SELECT distinct * FROM results WHERE TRUE '
        ||_unique_clause ||_query_table_filters;
	raise notice '%', _query_combine;
  	open $1 for execute _query_combine;
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.user_reserve_and_instock_list', 'Before Return',_query_combine,jsonb_build_object('$2', $2, '$3', $3, '$4', $4));	
 	RETURN $1;
		
	END;
$function$
;