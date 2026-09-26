--liquibase formatted sql
--changeset liquibase:constraints_store_list_tpc runOnChange:true stripComments:false splitStatements:false context:MTP-107271 labels:MTP-107271 
--comment: MTP-51912 adding dotcom_exclusive column - minor
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_list_tpc(input refcursor, jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.constraints_store_list_tpc(input refcursor, jsonb, jsonb, jsonb, jsonb)
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
		_ph_sort text ;
		_ph_search text;
        _overall_search text;
        _limit int;
        _offset int;
		_sub_limit int;
		_sub_offset int;
        _dummy text;
        _sa_search text := '';
       l0_name_updated text := '';
	   _query text:= '';
       _query_table_filters text := '';
	begin 		

		_query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
		_query_sa := global.form_main_table_filters('store_attributes_filter', $3);


		SELECT * FROM inventory_smart.form_search_sort_clause($5, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
		SELECT * FROM inventory_smart.form_search_sort_clause($5, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;
		

		-- converting min and max to min_stock and max_sock
        IF ($4 -> 'min') IS NOT NULL THEN
            $4 := $4 - 'min' || jsonb_build_object('min_stock', $4 -> 'min');
        END IF;
        IF ($4 -> 'max') IS NOT NULL THEN
            $4 := $4 - 'max' || jsonb_build_object('max_stock', $4 -> 'max');
        END IF;

		IF _ph_sort IS NULL or _ph_sort = '' or _ph_sort = ' ' THEN 
			_ph_sort = ' article ASC, store_code asc';
		END IF;

		_query_fw := global.form_main_table_filters_v2('constraint_master_weekly', $4);
	
		select 'any('''|| concat(_l0_name) ||'''::varchar[])' into l0_name_updated;

		_limit := ( $5 -> 'limit' ->> 'limit' )::int;
		if _limit != -1 then
            _query_table_filters := global.form_table_query($5);
        end if ;
		_query := FORMAT('
with paf as (
    select * from inventory_smart.ph_master
	%s -- _query_pa
	%s -- _ph_search
)
,saf as (
    select * FROM global.store_attributes_filter saf 
    %s -- _query_sa
	%s -- _sa_search
)
, partitioned_weekly_constraints as (
  	select * from inventory_smart.constraint_master_weekly 
	%s -- _query_fw
	AND l0_name = %s -- l0_name_updated
)
,filtered_weekly_constraints as(
    select 
        c.product_code, 
        c.mapping_code, 
        c.store_code,
        fiscal_year_week,
            jsonb_build_object(
            CONCAT(''Week_'', fiscal_year_week,''_wos''), c.wos::text,
            CONCAT(''Week_'', fiscal_year_week,''_min''), c.min_stock::text,
            CONCAT(''Week_'', fiscal_year_week,''_max''), c.max_stock::text,
            CONCAT(''Week_'', fiscal_year_week,''_updated_by''), name, 
            CONCAT(''Week_'', fiscal_year_week,''_updated_at''), to_char(coalesce(c.updated_at, c.created_at) AT TIME ZONE ''EST'', ''YYYY-MM-DD HH24:MI:SS'')
        ) as stores,
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
        paf.dotcom_exclusive,
        saf.store_name, 
        saf.district,
        saf.dma_name,
        saf.shop_in_shop,
        saf.combo_store,
        saf.channel
      from partitioned_weekly_constraints c
      inner join paf on c.l0_name = paf.l0_name and paf.article = c.product_code
      inner join saf using (store_code)
      LEFT JOIN global.user_master um on c.updated_by = um.user_code
      WHERE True and c.mapping_code is not null
  )
,aggregated_weekly_constraints AS (
    SELECT 
    wc.product_code,
    wc.mapping_code, 
    wc.store_code,
    wc.district,
    wc.product_channel_name,
    wc.l0_name, 
    wc.l1_name, 
    wc.l2_name,
    wc.article, 
    wc.product_description,
    wc.article_status_tag,
    wc.store_name, 
    wc.channel,
    wc.planning_ownership,
    wc.dma_name as dma,
    wc.combo_store as combo_store_flag,
    wc.shop_in_shop,
    wc.store_pack_size,
    wc.dotcom_exclusive,
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
    jsonb_object_agg(stores.key, stores.value) as stores
    from filtered_weekly_constraints wc
    left join inventory_smart.article_store_grade asg on wc.store_code = asg.store_code and wc.article = asg.article
	CROSS JOIN LATERAL jsonb_each_text(wc.stores) stores	
    group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26
    ORDER BY article ASC, store_code ASC
)
select * from aggregated_weekly_constraints 
%s -- _query_table_filters
', _query_pa, _ph_search, _query_sa, _sa_search, _query_fw, l0_name_updated, _query_table_filters);
	
	RAISE NOTICE '%', _query;
	OPEN $1 FOR EXECUTE _query;
	return $1;
	end
$function$
;