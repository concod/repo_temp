--liquibase formatted sql
--changeset liquibase:reporting_store_stock_drill_down_article_store_size_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0_2 labels:MTP-25423, MTP-25419, MTP-25412
--comment: added sorting functionality
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_stock_drill_down_article_store_size_details(input refcursor, jsonb, jsonb, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_stock_drill_down_article_store_size_details(input refcursor, jsonb, jsonb, text, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
  
  	declare
  		_query_pa text := '';
  		_query_sa text := '';
  		_query_table_filters text := '';
  		_query_combine text := '';
  		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'article', $4, 'store_code', $5);
  		_cache_table_id text;
  		_cache_schema text := 'inventory_smart';
  		_cache_sp text := '.reporting_store_stock_drill_down_article_store_size_details';
  		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
  		_cache_dependencies text[] := '{inventory_smart.store_stock_drilldown}';
  	begin 		
  		_query_pa := global.form_main_table_filters(
  		  'product_attributes_filter',
  		  $2
  		);
  		_query_sa := global.form_main_table_filters(
  		  'store_attributes_filter',
  		  $3
  		);
  		raise notice '%', _query_pa;
  		raise notice '%', _query_sa;
  		_query_combine := '
  			WITH product_master_filters_data AS (
  				SELECT
  					saf.channel,
  					saf.store_code,
  					paf.article,
  					paf.size,
  					paf.product_code
  				FROM (select * FROM global.product_attributes_filter  ' || _query_pa || ') paf
  				join inventory_smart.store_stock_drilldown ssd on ssd.article = paf.article	and ssd.product_code = paf.product_code	
  				join (select channel, store_code, store_name FROM global.store_attributes_filter ' || _query_sa || ') saf 
  				on saf.store_code = ssd.store_code and ssd.channel = saf.channel
  				left join inventory_smart.article_store_grade asg on asg.article = paf.article and saf.store_code = asg.store_code
  				where paf.article = '''|| $4 ||''' and saf.store_code = '''|| $5 ||'''
				group by 1,2,3,4,5
  				)
  				--select * from product_master_filters_data
  			,
  			dc_data as (
  				select
  					pmfd.*,
  					dc.dc_code,
  					dc.name as dc_name,
  					dc.linked_store_code as dc_store_code,
  					coalesce(store_avail_oh,0) as oh_dc
  				from 
  					inventory_smart.store_stock_drilldown ssd
					left join "global".distribution_centres dc on dc.linked_store_code  = ssd.store_code
					join product_master_filters_data pmfd on dc.linked_store_code = ssd.store_code
					and pmfd.article = ssd.article and pmfd.product_code = ssd.product_code and ssd.channel = pmfd.channel
					where dc.is_deleted = false and dc.is_active = true
  			)
  			--select * from dc_data
			,ssd_data as (
				select 
					pmfd.*,
					avg(coalesce(size_integrity,0)) as size_integrity,
					sum(coalesce(lw_qty,0)) as lw_qty,
					sum(coalesce(store_avail_oh,0)) as oh,
					sum(coalesce(store_in_transit,0)) as it,
					sum(coalesce(oo,0)) as oo
				from 
					product_master_filters_data pmfd
					join inventory_smart.store_stock_drilldown ssd2
					on ssd2.article = pmfd.article and ssd2.store_code = pmfd.store_code
					and ssd2.product_code = pmfd.product_code
					group by 1,2,3,4,5
			)
			--select * from ssd_data
  			,
  			final_result AS (
  			    select
  					ssd.size,
					dc_code,
					dc_name,
					avg(coalesce(size_integrity,0)) as size_integrity,
					avg(coalesce(lw_qty,0)) as lw_qty,
					avg(coalesce(oh,0)) as oh,
					avg(coalesce(it,0)) as it,
					avg(coalesce(oo,0)) as oo,
					sum(coalesce(pmps.oh_dc,0)) as oh_dc
				from ssd_data ssd 
				join dc_data pmps on pmps.store_code = ssd.store_code
				and pmps.article = ssd.article
				and pmps.product_code = ssd.product_code
				group by 1,2,3
  			)
  			select * from final_result';
  		raise notice '%',_query_combine;
--  		select * from cache.wrap_sp(
--  				_cache_schema,
--  				_cache_sp,
--  				_cache_payload,
--  				_query_combine,
--  				_cache_dependencies,
--  				_cache_key_pattern) into _cache_table_id;
--  		perform set_config('myvars.cache_table_id', _cache_table_id, true);
--  		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ';
  		open $1 for execute _query_combine;
  		RETURN $1;
  	end
  $function$
;