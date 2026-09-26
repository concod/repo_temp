--liquibase formatted sql
--changeset konakandla.sujan runOnChange:true stripComments:false splitStatements:false context:MTP-78724 labels:MTP-78724,MTP-135006
--comment: MTP-78724 Prod push,MTP-135006
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.estimate_constraint_store_list_download(input refcursor, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.estimate_constraint_store_list_download(input refcursor, jsonb, jsonb,jsonb,jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.estimate_constraint_store_list_download(input refcursor, jsonb, jsonb, jsonb DEFAULT '{}',jsonb DEFAULT '{}')
	RETURNS refcursor
 	LANGUAGE plpgsql
	AS $function$
 	declare
		_query_pa text := '';
		_query_sa text := '';
		_query_fw text := '';
		_channel text[] := inventory_smart.get_channel_from_input_new($3);
		_l0_name text[] := inventory_smart.get_l0_name_from_input($2);
		_channel_where_condition text := '';
		_query_table_filters text := '';
		_query_combine text := '';
		_client_columns text;
		
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
		_test1 int;
        _initial_limit int;
        _dummy text;
        _sa_search text := '';
        _formatter jsonb;
       l0_name_updated text := '';
	   _paf_columns text[] := ARRAY['article', 'l0_name', 'l1_name', 'l2_name', 'product_channel_name', 'article_status_tag', 'store_pack_size', 'product_description', 'planning_ownership', 'merchandise_category', 'merchandise_brand', 'metal_color', 'metal_type', 'sku_grade', 'drop_ship_ind'];
	   _paf_search_filters jsonb;
	   _paf_table_filters text := '';
	begin 		
		
		_query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
		_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
		
		-- Extract ph_master-related search filters from $5 to apply early in paf CTE
		SELECT jsonb_build_object(
			'search', COALESCE((SELECT jsonb_agg(elem) FROM jsonb_array_elements($5 -> 'search') elem WHERE elem ->> 'column' = ANY(_paf_columns)), '[]'::jsonb),
			'sort', '[]'::jsonb,
			'range', '[]'::jsonb,
			'limit', '{}'::jsonb
		) INTO _paf_search_filters;
		
		-- Only call form_table_query if there are paf-related search filters
		IF jsonb_array_length(_paf_search_filters -> 'search') > 0 THEN
			_paf_table_filters := global.form_table_query(_paf_search_filters);
			-- Replace leading WHERE with AND since _query_pa already has WHERE
			_paf_table_filters := regexp_replace(_paf_table_filters, '^\s*WHERE\s+', ' AND ', 'i');
		END IF;
		raise notice '_paf_table_filters %', _paf_table_filters;
		
		_query_table_filters := global.form_table_query($5);
		raise notice '_query_table_filters %', _query_table_filters;
	
		_query_fw := global.form_main_table_filters_v2('constraint_master', $4);

		select 'any('''|| concat(_l0_name) ||'''::varchar[])' into l0_name_updated;
		
        _query_combine := '
        	with paf as (
			  select 
			    *
			  from 
			    inventory_smart.ph_master
				'||_query_pa||'
				'||_paf_table_filters||'
			),
			saf as (
				select * FROM global.store_attributes_filter saf 
			 	'||_query_sa||'
			),
            partitioned_weekly_constraints as (
  				select * from inventory_smart.constraint_master
				WHERE l0_name = '||l0_name_updated||'
			),	
			product_master_filters_data as  (
					  SELECT 
					    pmps.product_code, 
 					    pmps.mapping_code, 
 					    pmps.store_code,
 						paf.article_status_tag,
 					    paf.l0_name, 
 					    paf.l1_name,
						paf.l2_name,
						paf.product_channel_name,
 					    paf.article,
						paf.store_pack_size,
                        paf.product_description,
						paf.planning_ownership,
						paf.merchandise_category,
						paf.merchandise_brand,
						paf.metal_color,
						paf.metal_type,
						paf.sku_grade,
						paf.drop_ship_ind,
 					    saf.store_name, 
						saf.district,
						saf.dma_name,
						saf.shop_in_shop,
						saf.combo_store,
 					    saf.channel
					  FROM paf 
					  join (select * from global.product_mapping_product_store where l0_name = any('''|| concat(_l0_name) ||'''::varchar[])) pmps on paf.article = pmps.product_code and paf.l0_name = pmps.l0_name		
					  join saf using(store_code)
				) -- select * from product_master_filters_data
				, 
				constraint_data_1 AS (
					  SELECT 
						pmps.product_code,
						pmps.mapping_code, 
 					    pmps.store_code,
						pmps.district,
						pmps.product_channel_name,
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
						pmps.store_pack_size,
						metal_color,
						metal_type,
						merchandise_brand,
						merchandise_category,
						sku_grade,
						drop_ship_ind,
 						asg.grade as store_grade,
 						case 
 							when asg.grade = ''AAA'' then 1
 							when asg.grade = ''AA'' then 2
 							when asg.grade = ''A'' then 3
 							when asg.grade = ''B'' then 4
 							when asg.grade = ''C'' then 5
 							when asg.grade = ''D'' then 6
 							else 11
 						end as store_grade_priority,
 						c.stores, c.updated_by, c.updated_at
						FROM 
                   		(select product_code, store_code, name as updated_by , to_char(coalesce(c.updated_at, c.created_at) AT TIME ZONE ''EST'', ''YYYY-MM-DD HH24:MI:SS'') as updated_at,
                         array_agg(jsonb_build_object(''wos'', c.wos::text,
                          ''min_store'', c.min_stock::text,
                          ''max_store'', c.max_stock::text,
                          ''min_store_sum'', c.min_stock::text,
                          ''max_store_sum'', c.max_stock::text
						)) as stores
						from partitioned_weekly_constraints c
						join product_master_filters_data pmfd using(product_code, store_code)
						LEFT JOIN global.user_master um on coalesce(c.updated_by, c.created_by) = um.user_code
						and c.mapping_code is not null
						group by 1,2,3,4) c 
						join product_master_filters_data pmps using(product_code, store_code)
 						left join inventory_smart.article_store_grade asg on pmps.store_code = asg.store_code and pmps.article = asg.article	
                        '||_query_fw||'
						ORDER BY article ASC, product_code ASC, store_code asc
				)
				
				select count(*) as total_count from constraint_data_1 '|| _query_table_filters ||';			
			';
       
	raise notice '_query_combine %', _query_combine;
	OPEN $1 FOR EXECUTE _query_combine;
	return $1;

	end
$function$
;
