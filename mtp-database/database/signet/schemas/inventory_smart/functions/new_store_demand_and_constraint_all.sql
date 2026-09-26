--liquibase formatted sql
--changeset liquibase:new_store_demand_and_constraint_all runOnChange:true stripComments:false splitStatements:false context:Release_1_0_3 labels:MTP-46701
--comment: fixed article_status_tag issue
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.new_store_demand_and_constraint_all(input refcursor, jsonb, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.new_store_demand_and_constraint_all(input refcursor, jsonb, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
 	declare
 		_query_pa text;
 		_query_sa text;
 		_client_columns text;
 		_channel text;
 		_l0_name text[] := inventory_smart.get_l0_name_from_input($2);
 		_query_combine_format text := '';
		_query_combine_count_format text := '';
		_query_combine_count text := '';
 	    _count int := 1;
		_batch_count int := 0;
		_ph_sort text ;
		_ph_search text;
        _overall_search text;
        _limit int;
        _offset int;
		_sub_limit int;
		_sub_offset int;
		_initial_limit int;
		_dummy text;
		_sa_search text := '';
        _formatter jsonb;
        l0_name_updated text := '';

 	begin
	 	SELECT * FROM inventory_smart.form_search_sort_clause($4, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;	raise notice 'sub limit top %', _sub_limit;
        _initial_limit := _limit;
        SELECT * FROM inventory_smart.form_search_sort_clause($4, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;
        _query_pa := global.form_main_table_filters('ph_master', $2);
        _query_sa = global.form_main_table_filters('store_attributes_filter', $3);
        _channel := inventory_smart.get_channel_from_input($3);
       
        select 'any('''|| concat(_l0_name) ||'''::varchar[])' into l0_name_updated;

 		if length ($5)> 0 then
 			_client_columns := ','||$5;
 		else 
 			_client_columns := '';
 		end if;
 	
		raise notice ' _query_sa % ', _client_columns;
	
		_query_combine_count_format := $$
            SELECT COUNT(*)
			FROM
			(
                SELECT ph_code, article, l0_name, l1_name, l2_name, article_status_tag, product_channel_name, product_description, product_code_size_map, metal_color, metal_type, merchandise_brand, planning_ownership, sku_grade
                FROM inventory_smart.ph_master pm
                {pa_filter} {pa_search} and channel = {channel} and article_status_tag != 'Old'
                group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14
                {limit_final}
			) sq
		$$;
 		
 		_query_combine_format := $$
            WITH paf as (
                SELECT ph_code, article, l0_name, l1_name, l2_name, article_status_tag, product_channel_name, product_description, product_code_size_map, metal_color, metal_type, merchandise_brand, planning_ownership, sku_grade                FROM inventory_smart.ph_master pm
                {pa_filter} {pa_search} and channel = {channel} and article_status_tag != 'Old'
                group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14
                {limit_final}
             ),
            saf as (
	         	select store_code, store_name, district, dma_name, shop_in_shop, combo_store, channel
	            FROM global.store_attributes_filter
                {sa_filter} {sa_search}
             ),
            paf_pp as (
			 	select 
					paf.*,
					pp.pp_code, 
					unnest(product_code_size_map) as product
				FROM 
					paf
					left join inventory_smart.product_profile_master pp using (ph_code)
            ),
			product_master_filters_data AS (
				SELECT 
					    product_code, 
 					    mapping_code, 
 					    store_code,
 						article_status_tag,
 					    paf.l0_name, 
 					    l1_name,
						l2_name,
						metal_color,
						metal_type,
						merchandise_brand,
						sku_grade,
						product_channel_name,
 						product->>'size' as size,
 					    article,
                        product_description,
						planning_ownership,
						pp_code,
 					    saf.store_name, 
						saf.district,
						saf.dma_name,
						saf.shop_in_shop,
						saf.combo_store,
 					    saf.channel
					  FROM 
					    paf_pp paf
					    join (select mapping_code, store_code, product_code, l0_name from global.product_mapping_product_store) pmps on paf.product->>'product_code' = pmps.product_code and paf.l0_name = pmps.l0_name		
						join saf using(store_code)
			) 
			-- select * from product_master_filters_data
			, 
			constraint_data AS (
				SELECT 
						pmps.product_code, 
 					    pmps.store_code,
						pmps.district,
						pmps.product_channel_name,
 						pmps.size,
 					    pmps.l0_name, 
 					    pmps.l1_name, 
						pmps.l2_name,
 						pmps.article, 
                        pmps.product_description,
 						pmps.article_status_tag,
 					    pmps.store_name, 
 					    pmps.channel,
						pmps.planning_ownership,
						pmps.dma_name as dma,
						pmps.combo_store as combo_store_flag,
						pmps.shop_in_shop,
						pmps.pp_code,
						'IA Recommeded' as ia_recommended,
						metal_color,
						metal_type,
						merchandise_brand,
						sku_grade,
 						asg.grade as store_grade,
 						case 
 							when asg.grade = 'AAA' then 1
 							when asg.grade = 'AA' then 2
 							when asg.grade = 'A' then 3
 							when asg.grade = 'B' then 4
 							when asg.grade = 'C' then 5
 							when asg.grade = 'D' then 6
 							else 11
 						end as store_grade_priority,
 					    c.wos, 
 					    c.min_stock, 
 					    c.max_stock, 
 					    c.transit_time as transit_time_sum,
						c.mapping_code,
						c.ros, 
						c.aps, 
						c.safety_stock
					  FROM 
						inventory_smart.constraint_master c 
 					    join product_master_filters_data pmps using(mapping_code, l0_name)
 						left join inventory_smart.article_store_grade asg on pmps.store_code = asg.store_code and pmps.article = asg.article
						where c.l0_name = {l0_name_updated} and c.channel = {channel} and c.mapping_code is not null 
			),
			constraint_data_final as (
				SELECT * FROM constraint_data
				WHERE TRUE {overall_search} {ph_sort}
				{sub_limit_final}

			),
			final_result as (
          		select *,
        			{limit} "limit",
					{offset} "offset",
					{sub_limit} sub_limit,
					{sub_offset} + ROW_NUMBER () OVER () as sub_offset
					from constraint_data_final
			)
			select {select} from final_result	
			$$;

			_formatter = json_build_object(
            	'pa_filter', _query_pa,
            	'sa_filter', _query_sa,
            	'pa_search', _ph_search,
            	'sa_search', _sa_search,
            	'limit', _limit,
            	'sub_limit', _sub_limit,
            	'offset', _offset,
            	'sub_offset', _sub_offset,
            	'ph_sort', _ph_sort,
            	'overall_search', _overall_search,
            	'l0_name_updated', l0_name_updated,
				'channel', _channel
		 	);
			RETURN inventory_smart.fetch_with_pagination($1, _query_combine_format, _query_combine_count_format, _formatter);   
	end
$function$
;