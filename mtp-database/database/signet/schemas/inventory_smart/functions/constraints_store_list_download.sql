--liquibase formatted sql
--changeset shubham.singh:constraints_store_list_download runOnChange:true stripComments:false splitStatements:false context:MTP-54788 change to CTE partitioned_weekly_constraints labels:MTP-54788 change to CTE partitioned_weekly_constraints
--comment: MTP-54788 change to CTE partitioned_weekly_constraints
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_list_download(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.constraints_store_list_download(input refcursor, jsonb, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 		
 Calling statement:		
 				BEGIN;
select * from inventory_smart.constraints_store_list('my_cur'::refcursor, '{
    "l0_name": [{"type":"list","operator":"in","values":["Accessories"]}],
    "l1_name": [],
    "l2_name": [],
    "l3_name": [],
    "l4_name": [],
    "style": [],
    "style_description": [],
    "article": [],
    "color": [],
    "color_code": [],
    "human_readable_color": [],
    "launch_date": [],
    "assortment_indicator": [],
    "factory_type": [],
    "article_status_tag": []
}'::jsonb,
'{"channel":[{"type":"list", "operator": "in", "values":["Factory Line Retail"]}]}'::jsonb,
'{
		"search": [{
                "column": "article",inventory_smart.constraints_store_list
                "pattern": "10ACBG1002-NEIN"
            },
            {
                "column": "store_name",
                "pattern": "Chicago Premium Outlets"
            }],
		"sort": [],
		"range": [],
		"limit": {
			"page": 1,
			"limit": 10
		}
	}'::jsonb);
FETCH ALL IN "my_cur";
select rows_count from cache.rows_count(current_setting('myvars.cache_table_id'), '{
    "sort": [],
    "limit": {
        "limit": 10,
        "page": 1
    }
}');
COMMIT;

 Modified by :kailash Yadav  18-Aug-2022
	 Jira Ticket :https://impactanalytics.atlassian.net/browse/DAT-115
 */


	declare
		_query_pa text := '';
		_query_sa text := '';
		_query_fw text := '';
		_l0_name text[] := inventory_smart.get_l0_name_from_input($2);
		_query_combine_format text := '';
        l0_name_updated text := '';
		_query_table_filters text :='';
		_ph_sort text := '';
		_overall_search text;
        _limit int;
        _offset int;
	begin
		_query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
		_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
		_query_fw := global.form_main_table_filters_v2('constraint_master', $4);

		SELECT * FROM inventory_smart.form_search_sort_clause($5, 'ph_master', 'inventory_smart') INTO _ph_sort, _query_table_filters, _overall_search, _limit, _offset;
		 RAISE NOTICE 'Table filters %', _query_table_filters;
		select 'any('''|| concat(_l0_name) ||'''::varchar[])' into l0_name_updated;
		
        _query_combine_format := $$
			with paf as materialized (
				select 
			    *
				from 
			    inventory_smart.ph_master
				$$||_query_pa||$$
				 ),
			saf as materialized (
				select * FROM global.store_attributes_filter saf 
				$$||_query_sa||$$
				),
			partitioned_weekly_constraints as (
  				select * from inventory_smart.constraint_master
				WHERE l0_name = $$||l0_name_updated||$$
			),
			product_master_filters_data as materialized (
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
					  join (select * from global.product_mapping_product_store where l0_name = $$||l0_name_updated||$$) pmps on paf.article = pmps.product_code and paf.l0_name = pmps.l0_name		
					  join saf using(store_code)
				),
				constraint_data_1 AS (
					select
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
 							when asg.grade = 'AAA' then 1
 							when asg.grade = 'AA' then 2
 							when asg.grade = 'A' then 3
 							when asg.grade = 'B' then 4
 							when asg.grade = 'C' then 5
 							when asg.grade = 'D' then 6
 							else 11
 						end as store_grade_priority,
						stores
						FROM 
                   		(select product_code, store_code,
                         array_agg(jsonb_build_object('wos', c.wos::text,
                          'min_store', c.min_stock::text,
                          'max_store', c.max_stock::text,
                          'min_store_sum', c.min_stock::text,
                          'max_store_sum', c.max_stock::text,
						  'updated_by', name, 
 						  'updated_at', to_char(coalesce(c.updated_at, c.created_at) AT TIME ZONE 'EST', 'YYYY-MM-DD HH24:MI:SS')
						)) as stores
 						from partitioned_weekly_constraints c
						join product_master_filters_data pmfd using(product_code, store_code)
						LEFT JOIN global.user_master um on coalesce(c.updated_by, c.created_by) = um.user_code
						and c.mapping_code is not null
						group by 1,2) c 
						join product_master_filters_data pmps using(product_code, store_code)
 						left join inventory_smart.article_store_grade asg on pmps.store_code = asg.store_code and pmps.article = asg.article
						-- '|| _overall_search ||'
						ORDER BY article ASC, product_code ASC, store_code asc
				)
				select * from constraint_data_1 where True $$||_query_table_filters||$$ $$||_overall_search||$$;
			$$;
			raise notice '_query_combine_format %', _query_combine_format;
			open $1 for execute _query_combine_format;
  			RETURN $1;
			
	end
$function$
;
