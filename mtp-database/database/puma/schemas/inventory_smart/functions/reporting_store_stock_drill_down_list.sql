--liquibase formatted sql
--changeset liquibase:reporting_store_stock_drill_down_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0_3 labels:MTP-21631
--comment: fixed sp issue
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_stock_drill_down_list(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_stock_drill_down_list(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
  
  	declare
  		_query_pa text := '';
  		_query_sa text := '';
  --		_channel text := inventory_smart.get_channel_from_input($3);
  		_query_table_filters text := '';
  		_query_combine text := '';
  		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3);
  		_cache_table_id text;
  		_cache_schema text := 'inventory_smart';
  		_cache_sp text := '.reporting_store_stock_drill_down_list';
  		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
  		_cache_dependencies text[] := '{inventory_smart.store_stock_drilldown}';
  		
  		_filter_query text := '';
	 	_sort_query text;
	 	_overall_search TEXT:= '';
	 	_limit text := '';
		_offset text := '';
	 	_sub_limit text := '';
	 	_sub_offset text := '';
	 	_limit_query text := '';
	 
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
		
		_query_table_filters := global.form_table_query($4);
		
  		_query_combine := '
  			WITH product_master_filters_data AS (
  				select * from (SELECT
  					saf.store_code,
  					saf.store_name,
  					saf.channel,
  					saf.store_id,
  					saf.climate,
  					saf.region,
  					paf.article,
  					asg.grade,
  					paf.l0_name,
  					paf.product_description,
  					paf.size_bucket,
  					paf.color,
  					paf.l1_name,
  					paf.l2_name,
  					paf.l5_name,
  					paf.clearance_article,
					array_agg(distinct ssd.product_code) as product_codes
  				FROM (select * FROM global.product_attributes_filter  ' || _query_pa || ') paf
  				join inventory_smart.store_stock_drilldown ssd on ssd.article = paf.article	and ssd.product_code = paf.product_code	
  				join (select channel,climate,region, store_code,store_id, store_name FROM global.store_attributes_filter ' || _query_sa || ') saf 
  				on saf.store_code = ssd.store_code and ssd.channel = saf.channel
  				left join inventory_smart.article_store_grade asg on asg.article = paf.article and saf.store_code = asg.store_code
  				group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16) x '|| _query_table_filters ||'
						
		 )
  				--select * from product_master_filters_data
  			,
  			dc_data as (
  				select
  					pmfd.store_code,
  					pmfd.article,
  					dc.dc_code,
  					dc.name as dc_name,
  					dc.linked_store_code as dc_store_code,
  					coalesce(store_avail_oh,0) as oh_dc
  				from 
  					inventory_smart.store_stock_drilldown ssd
  					left join "global".distribution_centres dc on dc.linked_store_code  = ssd.store_code
  					join product_master_filters_data pmfd on dc.linked_store_code = ssd.store_code
  					and pmfd.article = ssd.article and ssd.product_code = any(product_codes)
  					where dc.is_deleted = false and dc.is_active = true
  			)
  			--select * from dc_data
			,ssd_data as (
  				select 
  					pmfd.*,
  					ssd2.style_color_status,
  					ssd2.store_status,
  					avg(coalesce(size_integrity,0)) as size_integrity_oh,
  					avg(coalesce(si_it,0)) as size_integrity_it,
  					avg(coalesce(si_dc,0)) as size_integrity_dc,
  					avg(coalesce(si_all,0)) as size_integrity_all,
  					avg(coalesce(wos_predicted_oh_oo,0)) as wos_predicted_oh_oo,
  					avg(coalesce(wos_predicted_oh_oo,0)) as wos_predicted_oh,
  					avg(coalesce(wos_predicted,0)) as wos_predicted,
  					sum(coalesce(lw_qty,0)) as lw_qty,
  					sum(coalesce(store_avail_oh,0)) as oh,
  					sum(coalesce(store_in_transit,0)) as it,
  					sum(coalesce(oo,0)) as oo
  				from 
  					product_master_filters_data pmfd
  					join inventory_smart.store_stock_drilldown ssd2 using(article, store_code)
  					--on ssd2.article = pmfd.article and ssd2.store_code = pmfd.store_code
  					group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19
  			)
--  		select * from ssd_data
  			,
  			final_result AS (
  			    select
					ssd.product_codes,
  					ssd.article,
  					ssd.store_code,
  					ssd.store_id,
  					ssd.store_name,
  					ssd.climate,
  					ssd.region,
  					ssd.channel,
  					grade,
  					ssd.clearance_article,
  					product_description,
  					color,
  					size_bucket,
  					l0_name,
  					l1_name,
  					l2_name,
  					l5_name,
  					style_color_status,
  					store_status,
  					dc_code,
  					dc_name,
  					dc_store_code,
--  					array_agg(lw_qty) as tt,
  					avg(coalesce(size_integrity_oh,0)) as size_integrity_oh,
  					avg(coalesce(size_integrity_it,0)) as size_integrity_it,
  					avg(coalesce(size_integrity_dc,0)) as size_integrity_dc,
  					avg(coalesce(size_integrity_all,0)) as size_integrity_all,
  					avg(coalesce(wos_predicted_oh_oo,0)) as wos_predicted_oh_oo,
  					avg(coalesce(wos_predicted_oh,0)) as wos_predicted_oh,
  					avg(coalesce(wos_predicted,0)) as wos_predicted,
  					avg(coalesce(lw_qty,0)) as lw_qty,
  					avg(coalesce(oh,0)) as oh,
  					avg(coalesce(it,0)) as it,
  					avg(coalesce(oo,0)) as oo,
  					sum(coalesce(pmps.oh_dc,0)) as oh_dc
  				from ssd_data ssd 
  				left join dc_data pmps on pmps.store_code = ssd.store_code
  				and pmps.article = ssd.article
  				group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22
  			)
  			select *, concat(article,''-'',store_code,''-'',grade) as key from final_result';
  		raise notice '%',_query_combine;
  		open $1 for execute _query_combine;
  		RETURN $1;
  	end
  $function$
;