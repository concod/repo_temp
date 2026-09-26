--liquibase formatted sql
--changeset liquibase:reporting_allocation_deep_dive_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0_7 labels:MTP-37199
--comment: MTP-37199
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_allocation_deep_dive_list(input refcursor, jsonb, jsonb, date, date, text);
DROP FUNCTION IF EXISTS inventory_smart.reporting_allocation_deep_dive_list(input refcursor, jsonb, jsonb, date, date, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_allocation_deep_dive_list(input refcursor, jsonb, jsonb, date, date, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
    declare
        _query_pa text := '';
        _query_sa text := '';
        _query_combine_format text := '';
        _query_combine_count_format text := '';
        _ph_sort text ;
        _ph_search text;
        _overall_search text;
        _limit int;
        _offset int;
        _sub_limit int;
        _sub_offset int;
        _dummy text;
        _sa_search text;
        _formatter jsonb;
    begin         
        SELECT * FROM inventory_smart.form_search_sort_clause($6, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
        SELECT * FROM inventory_smart.form_search_sort_clause($6, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;
        _query_pa := global.form_main_table_filters('product_attributes_filter', $2);
        _query_sa = global.form_main_table_filters('store_attributes_filter', $3);
       	-- _query_pa := _query_pa || _ph_search || _ph_sort || ' LIMIT %2$s OFFSET %1$s ';
        --_query_sa := global.form_main_table_filters('store_attributes_filter', $3);

        _query_combine_count_format := $$
            SELECT COUNT(*)
			FROM
			(
				SELECT *
            	FROM inventory_smart.create_allocation_result_flat_gurobi
            	WHERE article in (SELECT article FROM global.product_attributes_filter {pa_filter} {pa_search})
            	    AND store in (SELECT store_code FROM global.store_attributes_filter {sa_filter} {sa_search})
            	      AND allocation_code in (SELECT plan_code from inventory_smart.plan_master pm WHERE ((pm.updated_at AT TIME ZONE 'EST')::date BETWEEN '{start_date}' AND '{end_date}') and status = 3)
            	    -- and (created_at AT TIME ZONE 'EST')::date between '2023-06-20' and '2023-06-22'
            	    AND allocated_total > 0 and pack_dc_allocation != '{}'
            	ORDER BY created_at, allocation_code, article, store
            	{limit_final}
			) sq
        $$;
        _query_combine_format := $$
            WITH flat1 AS MATERIALIZED (
                SELECT allocation_code, article, store,
                       js.key dc_code, 
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) size,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty
                FROM (
                    SELECT *
                    FROM inventory_smart.create_allocation_result_flat_gurobi
                    WHERE article in (SELECT article FROM global.product_attributes_filter {pa_filter} {pa_search})
                        AND store in (SELECT store_code FROM global.store_attributes_filter {sa_filter} {sa_search})
                          AND allocation_code in (SELECT plan_code from inventory_smart.plan_master pm WHERE ((pm.updated_at AT TIME ZONE 'EST')::date BETWEEN '{start_date}' AND '{end_date}') and status = 3)
                        -- and (created_at AT TIME ZONE 'EST')::date between '2023-06-20' and '2023-06-22'
                        AND allocated_total > 0 and pack_dc_allocation != '{}'
                    ORDER BY created_at, allocation_code, article, store
                    {limit_final}
                ) sq,  JSONB_EACH(pack_dc_allocation) js
                GROUP BY 1, 2, 3, 4, 5, 6, 7
            )
			,flat2 AS (
				SELECT allocation_code, article, store store_code, dc_code, SUM(allocated_qty) allocated_qty
				FROM flat1
				GROUP BY 1, 2, 3, 4
			)
            ,flat AS MATERIALIZED (
                SELECT *, ROW_NUMBER () OVER () as sub_offset
				FROM flat2
                {sub_limit_final}
            )
          ,net_dc_available AS(
				select  article, channel, size,  (coalesce(sdau.oh,0)-(coalesce(sdru.quantity,0)+coalesce(sdau2.quantity,0))) as net_dc_available
				from 
						(select article, size, dc_code, channel , sum(oh) as oh from inventory_smart.sku_dc_available_units group by 1,2,3,4) sdau 
				left join (select article, size, dc_code, channel , sum(quantity) as quantity from inventory_smart.sku_dc_reserved_units group by 1,2,3,4) sdru 
						using(dc_code, article, size, channel)
				left join ( select article, size, dc_code, channel, sum(quantity) quantity from inventory_smart.sku_dc_allocated_units group by 1, 2, 3,4) sdau2
					   using(dc_code, article, size, channel)
			)
            ,result as (
                SELECT 
					{limit} "limit",
					{offset} "offset",
					{sub_limit} sub_limit,
					{sub_offset} + ROW_NUMBER () OVER () as sub_offset,
					
					--dpc.parent_article, 
					--dpc.pack_description,
					article_status_tag,
					
					selling_collection,
					fabrication,
					paf.size,
					TO_CHAR(selldown_date, 'YYYY-MM-DD') as selldown_date,
					TO_CHAR(launch_date, 'YYYY-MM-DD') as launch_date,
					TO_CHAR(clearance_end_date, 'YYYY-MM-DD') as clearance_end_date,
					TO_CHAR(clearance_start_date, 'YYYY-MM-DD') as clearance_start_date,
					TO_CHAR(retirement_date, 'YYYY-MM-DD') as retirement_date,
					oh,
					oo,
					it,
					nda.net_dc_available,
					
					paf.l0_name,
					l1_name,
					l2_name,
					l3_name,
					style,
					style_description,
					color_code,
					color,
					saf.store_code,
					saf.store_name,
					paf.article,
					saf.channel,
					asg.grade as store_grade,
					saf.district,
					saf.state,
					saf.climate,
					0 unit_sales,
					allocated_qty as allocated_total, 
					concat(paf.article,'-',saf.store_code,'-',paf.size) as key,
					sum(cm.min_stock) as min_stock,
					sum(cm.max_stock) as max_stock
					
                FROM flat
                LEFT JOIN (
					SELECT article, l0_name, l1_name, l2_name, l3_name, style, style_description, color_code, color,
					selldown_date, launch_date, clearance_end_date, clearance_start_date, retirement_date,
					selling_collection, fabrication, size, product_code
					FROM global.product_attributes_filter {pa_filter} {pa_search} and article IN (SELECT DISTINCT article FROM flat)
					--GROUP BY 1, 2, 3, 4, 5, 6, 7, 8  ,9,10,11,12,13,14,15,16,17,18
				) paf using(article)
                LEFT JOIN global.store_attributes_filter saf using(store_code)
 				LEFT JOIN inventory_smart.article_store_grade asg using (store_code, article)
 				--left join inventory_smart.dc_pack_configuration  dpc on dpc.article = paf.article
 				left join (select article, channel, string_agg(article_status_tag, ', ') as article_status_tag 
							from inventory_smart.ph_master group by 1,2) ph on ph.article = paf.article and ph.channel = saf .channel
				left join inventory_smart.constraint_master cm on (cm.product_code = paf.product_code and cm.store_code = saf.store_code and cm.channel= saf.channel)
				left join inventory_smart.article_inventory_dashboard aid on aid.article = paf.article and aid.store_code = saf.store_code and aid.channel = saf.channel 
				left join net_dc_available nda on nda.article = paf.article and nda.size=paf.size  and nda.channel = saf.channel
				group by 1,2,3,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36
				ORDER BY sub_offset
            )
            SELECT {select} FROM result 
            $$;
           raise notice '%', _query_combine_format;
           _formatter = json_build_object(
            'pa_filter', _query_pa,
            'sa_filter', _query_sa,
            'pa_search', _ph_search,
            'sa_search', _sa_search,
            'limit', _limit,
            'sub_limit', _sub_limit,
            'offset', _offset,
            'sub_offset', _sub_offset,
            'start_date', $4,
            'end_date', $5
        );

        RETURN inventory_smart.fetch_with_pagination($1, _query_combine_format, _query_combine_count_format, _formatter);
    end
$function$
;