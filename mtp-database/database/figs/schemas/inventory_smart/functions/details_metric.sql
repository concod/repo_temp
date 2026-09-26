--liquibase formatted sql
--changeset adesh:details_metric_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
--comment: MTP-122243 dynamic KPI columns support
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.details_metric(refcursor, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.details_metric(refcursor, jsonb, jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.details_metric(input refcursor, jsonb, jsonb, jsonb, dynamic_kpi_config jsonb DEFAULT '[]'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
    _query_pa text := '';

_query_sa text := '';

_query_pa_sa TEXT := '';

_query_table_filters text := '';

_query_combine text := '';

_channel text := inventory_smart.get_channel_from_input($3);

_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3);

_cache_table_id text;

_cache_schema text := 'inventory_smart';

_cache_sp text := '.details_metric';

_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';

_cache_dependencies text[] := '{inventory_smart.article_inventory_dashboard}';

-- Dynamic KPI variables
_dynamic_kpi_columns text := '';
_kpi_name text;

begin
    raise notice '%',
$3->>'channel';

$2 := $2 || jsonb_build_object('channel', $3->>'channel');

_query_pa := inventory_smart.form_main_table_filters('ph_master',
$2);

_query_sa := global.form_main_table_filters('store_attributes_filter',
$3);

_query_pa_sa := _query_pa || 
                    (case
	when LENGTH(_query_sa) > 0 then
                        ' AND ' || SUBSTRING(_query_sa, 8)
	else ''
end);

_query_pa_sa := coalesce(nullif(_query_pa_sa, ''), ' WHERE TRUE');

raise notice 'Combined product store attribute query --> %',
_query_pa_sa;

_query_table_filters := global.form_table_query($4);

raise notice 'Query filter table --> %',
_query_table_filters;

-- Build dynamic KPI columns from the passed dynamic_kpi_config parameter
-- Expected format: ["kpi_name_1", "kpi_name_2", ...] - array of KPI names (column names)
IF dynamic_kpi_config IS NOT NULL AND jsonb_array_length(dynamic_kpi_config) > 0 THEN
    FOR _kpi_name IN SELECT jsonb_array_elements_text(dynamic_kpi_config)
    LOOP
        _dynamic_kpi_columns := _dynamic_kpi_columns || ', ' || quote_ident(_kpi_name);
    END LOOP;
END IF;
raise notice 'Dynamic KPI columns --> %', _dynamic_kpi_columns;

-- Update cache payload to include dynamic KPI config for proper cache differentiation
_cache_payload := _cache_payload || jsonb_build_object('dynamic_kpi_config', dynamic_kpi_config);

_query_combine := FORMAT($$
        with ph_data as (
            select distinct 
                article 
            from global.product_attributes_filter paf
            %s
        ),
        
        aid_all as (
            select
                article,
                style_name,
                color_name,
                l0_name,
                l1_name,
                l2_name,
				l3_name,
				l4_name,
				article_status_tag,
                first_sale_date,
                last_receipt_date,
                lw_units,
                lw_store_units,
                lw_sfs_units,
                lw_revenue,
                lw_margin,
                lw_discount_amount,
                promo_percentage,
				size_integrity,
                lw_price,
                lw_aur,
                lw_aps,
                sell_through_rate,
                week_to_date_sales,
                sales_1_ago, 
                sales_2_ago, 
                sales_3_ago, 
                sales_4_ago,
                sales_5_ago, 
                sales_6_ago, 
                sales_7_ago,
                sales_8_ago,
                oh,
				oo,
                it,
                oo_dc,
                dc_oo_30_days,
                tot_inv,
                in_stock_count,
                total_count,
                wos_oh,
                wos_oh_it,
                hybrid_wos,
                hybrid_wos_oh_it,
                upas,
                oh_dc,
                it_dc,
                forecast_this_wk,
                forecast_next_wk,
                forecast_4_next_wk,
                forecast_8_next_wk,
                no_of_stores_oh,
                stockout,
                shortfall,
                normal,
                overstock,
                dc_available,
                store_code,
                fwos,
                twos,
				style_color_status,
                channel_name
            from inventory_smart.article_inventory_dashboard aid
                join ph_data using (article)
                %s
        ),

        aid as (
            select * from aid_all
            WHERE store_code NOT IN (SELECT linked_store_code FROM global.distribution_centres WHERE NOT is_deleted)
        ),

        article_hierarchy as (
            select 
                distinct article,
                style_name,
                color_name,
                l0_name,
                l1_name,
                l2_name,
				l3_name,
				l4_name,
				article_status_tag,
                first_sale_date,
                last_receipt_date,
				first_value(style_color_status) over (partition by article order by case when style_color_status is null then 1 else 0 end, style_color_status) as product_tag
            from aid
        ),


        last_allocated as (
            select 
                article,  
                coalesce(MAX(sdal.updated_at), MAX(ladt.last_allocation_date), null) as last_allocated 
            from inventory_smart.last_allocation_date_table ladt 
            left join inventory_smart.sku_dc_allocated_units sdal using(article)  
            group by article
        ),
        
        sales_metrics_base as (
         select
            article,
            SUM(coalesce(lw_units, 0)) as sum_lw_units,
            SUM(coalesce(lw_store_units, 0)) as sum_lw_store_units,
            SUM(coalesce(lw_sfs_units, 0)) as sum_lw_sfs_units,
            SUM(coalesce(lw_revenue, 0)) as sum_lw_revenue,
            SUM(coalesce(lw_margin, 0)) as sum_lw_margin,
            SUM(coalesce(abs(lw_discount_amount), 0)) as sum_lw_discount_amount,
            SUM(coalesce(abs(lw_revenue) + abs(lw_discount_amount), 0)) as sum_lw_revenue_discount,
            SUM(coalesce(abs(lw_revenue), 0)) as sum_abs_lw_revenue,
            SUM(coalesce(abs(lw_units), 0)) as sum_abs_lw_units,
            COUNT(distinct store_code) as distinct_store_count,
            SUM(coalesce(oh, 0)) as sum_oh,
            SUM(coalesce(week_to_date_sales, 0)) as sum_week_to_date_sales,
            SUM(coalesce(sales_1_ago + sales_2_ago + sales_3_ago + sales_4_ago + sales_5_ago + sales_6_ago + sales_7_ago + sales_8_ago, 0)) as sum_sales_8_weeks,
            SUM(coalesce(sales_8_ago, 0)) as sum_sales_8_ago,
            SUM(coalesce(sales_7_ago, 0)) as sum_sales_7_ago,
            SUM(coalesce(sales_6_ago, 0)) as sum_sales_6_ago,
            SUM(coalesce(sales_5_ago, 0)) as sum_sales_5_ago,
            SUM(coalesce(sales_4_ago, 0)) as sum_sales_4_ago,
            SUM(coalesce(sales_3_ago, 0)) as sum_sales_3_ago,
            SUM(coalesce(sales_2_ago, 0)) as sum_sales_2_ago,
            SUM(coalesce(sales_1_ago, 0)) as sum_sales_1_ago,
            SUM(tot_inv) as sum_tot_inv,
            ROUND(cast(case
					when SUM(tot_inv) != 0 then SUM(fwos * tot_inv) / SUM(tot_inv)
					else 0
				end as numeric),
				2) as fwos,
            ROUND(cast(case
					when SUM(tot_inv) != 0 then SUM(twos * tot_inv) / SUM(tot_inv)
					else 0
				end as numeric),
				2) as twos,
            MIN(tot_inv) as min_tot_inv,
            PERCENTILE_CONT(0.25) within group (order by tot_inv) as p25_tot_inv,
            PERCENTILE_CONT(0.5) within group (order by tot_inv) as p50_tot_inv,
            PERCENTILE_CONT(0.75) within group (order by tot_inv) as p75_tot_inv,
            MAX(tot_inv) as max_tot_inv
            from aid
            group by article
        ),

        sales_metrics as (
         select
            article,
            cast(ROUND(sum_lw_units) as INTEGER) as lw_units,
            ROUND(sum_lw_store_units::numeric, 2) as lw_store_units,
            ROUND(sum_lw_sfs_units::numeric, 2) as lw_sfs_units,
            ROUND(sum_lw_revenue::numeric, 2) as lw_revenue,
            ROUND(sum_lw_margin::numeric, 2) as lw_margin,
            case
                when sum_lw_revenue_discount > 0 
                then ROUND((sum_lw_discount_amount::numeric / sum_lw_revenue_discount::numeric)::numeric, 2)
                else null
            end::text as promo_percentage,
            coalesce(ROUND((sum_lw_revenue_discount::numeric / nullif(sum_abs_lw_units::numeric, 0))::numeric, 2), 0) as lw_price,
            ROUND((sum_abs_lw_revenue::numeric / nullif(sum_abs_lw_units::numeric, 0))::numeric, 2) as lw_aur,
            ROUND(sum_lw_units::numeric / nullif(distinct_store_count::numeric, 0), 2) as lw_aps,
            ROUND(sum_lw_units::numeric / nullif(sum_oh::numeric, 0), 2) as sell_through_rate,
            ROUND(sum_week_to_date_sales::numeric, 2) as week_to_date_sales, 
            ROUND(sum_sales_8_weeks::numeric, 2) as sales_8_ago,
            fwos,
            twos,
            ROUND(sum_sales_8_weeks::numeric, 0)::TEXT || '|' ||
				sum_sales_8_ago::TEXT || ',' ||
				sum_sales_7_ago::TEXT || ',' ||
				sum_sales_6_ago::TEXT || ',' ||
				sum_sales_5_ago::TEXT || ',' ||
				sum_sales_4_ago::TEXT || ',' ||
				sum_sales_3_ago::TEXT || ',' ||
				sum_sales_2_ago::TEXT || ',' ||
				sum_sales_1_ago::TEXT as sales_last_8_weeks,
				sum_week_to_date_sales::TEXT || '|' ||
				sum_lw_units::TEXT || ',' ||
				sum_week_to_date_sales::TEXT as sales_cw_vs_lw,
				array[
			    coalesce(min_tot_inv, 0),
			    coalesce(p25_tot_inv, 0),
			    coalesce(p50_tot_inv, 0),
				coalesce(p75_tot_inv, 0),
			    coalesce(max_tot_inv, 0)
			] as snapshot,
            TRIM(trailing '.' from TRIM(trailing '0' from fwos::TEXT)) || ',' ||
			    TRIM(trailing '.' from TRIM(trailing '0' from twos::TEXT)) as cwos
            from sales_metrics_base
        ),

        inventory_metrics as (
            select
                article,
              	SUM(coalesce(oh, 0))::numeric(10, 2) as oh,
				SUM(coalesce(it, 0))::numeric(10, 2) as it,
				SUM(coalesce(oo, 0))::numeric(10, 2) as oo,
				ROUND(AVG(COALESCE(size_integrity, 0))::numeric, 2) AS size_integrity,
				ROUND(SUM(coalesce(it_dc, 0))::numeric, 2) as it_dc,
                ROUND(SUM(coalesce(oo_dc, 0))::numeric, 2) as oo_dc,
                ROUND(SUM(coalesce(dc_oo_30_days, 0))::numeric, 2) as dc_oo_30_days,
                ROUND(SUM(coalesce(tot_inv, 0))::numeric, 2) as tot_inv,
                ROUND(AVG(case when coalesce(total_count, 0) > 0 then coalesce(in_stock_count, 0) / total_count end)::numeric, 2) as in_stock_perc,
                ROUND(SUM(coalesce(oh, 0))::numeric / nullif(SUM(coalesce(lw_units, 0))::numeric, 0), 2) as wos_oh,
                ROUND(SUM(coalesce(oh, 0) + coalesce(it, 0))::numeric / nullif(SUM(coalesce(lw_units, 0))::numeric, 0), 2) as wos_oh_it,
                ROUND(SUM(coalesce(oh, 0))::numeric / nullif(SUM(coalesce(lw_units, 0) + coalesce(lw_sfs_units, 0))::numeric, 0), 2) as hybrid_wos,
                ROUND(SUM(coalesce(oh, 0) + coalesce(it, 0))::numeric / nullif(SUM(coalesce(lw_units, 0) + coalesce(lw_sfs_units, 0))::numeric, 0), 2) as hybrid_wos_oh_it,
                AVG(upas)::numeric(10, 2) as upas
            from aid
            group by article
        ),

		  dc_metrics AS (
		    SELECT
		        article,
		        SUM(dc_available) AS dc_available,
		        ROUND(
		            MAX(CASE WHEN channel_name = '-' THEN oh_dc END)::numeric,
		        2) AS oh_dc,
		        (
		            COALESCE(MAX(CASE WHEN channel_name = '-' THEN oh_dc END), 0)
		            + COALESCE(SUM(it_dc), 0)
		            + COALESCE(SUM(oo_dc), 0)
		        )::numeric(10, 2) AS dc_total
		
		    FROM aid_all
		    GROUP BY article
		),
        
        forecast_metrics as (
            select
                article,
                SUM(forecast_this_wk) as forecast_this_wk,
                SUM(forecast_next_wk) as forecast_next_wk,
                SUM(forecast_4_next_wk) as forecast_4_next_wk,
                SUM(forecast_8_next_wk) as forecast_8_next_wk
            from aid
            group by article
        ),

        store_count as (
            select
                article,
                AVG(no_of_stores_oh) as no_of_stores_oh,
                SUM(stockout) as stockout,
                SUM(shortfall) as shortfall,
                SUM(normal) as normal,
                SUM(overstock) as overstock
            from aid
            group by article
        ),
    
        final_result as (
            select 
                ah.article, 
                ah.style_name, 
                ah.color_name,
                ah.l0_name, 
                ah.l1_name, 
                ah.l2_name, 
				ah.l3_name,
				ah.l4_name,
				ah.article_status_tag,
                ah.first_sale_date,
                ah.last_receipt_date,
				ah.product_tag,
                la.last_allocated,
                sm.lw_units,
                sm.lw_store_units,
                sm.lw_sfs_units,
                sm.lw_revenue, 
                sm.lw_margin,
                sm.promo_percentage, 
                sm.lw_price, 
                sm.lw_aur,
                sm.lw_aps,
                sm.sell_through_rate,
                sm.week_to_date_sales,
                sm.sales_8_ago,
				im.size_integrity,
                im.oh,
				im.oo,
                im.it,
				im.it_dc,
                im.oo_dc,
                im.dc_oo_30_days,
                im.tot_inv,
                im.in_stock_perc,
                im.wos_oh,
                im.wos_oh_it,
                im.hybrid_wos,
                im.hybrid_wos_oh_it,
                im.upas,
                dc.dc_available,
				dc.dc_total,
                dc.oh_dc,
                fm.forecast_this_wk,
                fm.forecast_next_wk,
                fm.forecast_4_next_wk,
                fm.forecast_8_next_wk,
                sc.no_of_stores_oh,
                sc.stockout, 
                sc.shortfall, 
                sc.normal, 
                sc.overstock,
                sm.cwos,
                sm.sales_cw_vs_lw,
                sm.snapshot,
                sm.sales_last_8_weeks
                %s
            from article_hierarchy ah
                left join sales_metrics sm on ah.article = sm.article
                left join inventory_metrics im on ah.article = im.article
                left join dc_metrics dc on ah.article = dc.article
                left join forecast_metrics fm on ah.article = fm.article
                left join store_count sc on ah.article = sc.article
                left join last_allocated la on ah.article = la.article
        ) 
        
        select * 
        from final_result
    $$, _query_pa, _query_sa, _dynamic_kpi_columns);

select
	*
from
	cache.wrap_sp(
        _cache_schema,
	_cache_sp,
	_cache_payload,
	_query_combine,
	_cache_dependencies,
	_cache_key_pattern
    )
into
	_cache_table_id;

_query_table_filters := global.form_table_query($4);

perform set_config('myvars.cache_table_id', _cache_table_id, true);

raise notice '%',
_query_combine;

open $1 for execute 'SELECT * FROM "cache"."' || _cache_table_id || '" X ' || _query_table_filters;

return $1;
end;

$function$
;
