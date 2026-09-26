--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_get_step3_table_data-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_get_step3_table_data-1
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_get_step3_table_data;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_get_step3_table_data(_strategy_id integer, _pcd_ids integer[] DEFAULT NULL::integer[], _product_level integer DEFAULT NULL::integer, _store_level integer DEFAULT NULL::integer, _strategy_actual_product_level integer DEFAULT NULL::integer, _strategy_actual_store_level integer DEFAULT NULL::integer, _include_copy_ia boolean DEFAULT false, _copy_ia_session_id text DEFAULT ''::text, _is_data_changed boolean DEFAULT false, _pcd_metrics_filter jsonb DEFAULT NULL::jsonb, _approval_filter text[] DEFAULT NULL::text[], _page_number integer DEFAULT 1, _number_of_pages integer DEFAULT 1, _limit integer DEFAULT 100, _offset integer DEFAULT NULL::integer, _records_filters jsonb DEFAULT NULL::jsonb, _record_sort_key character varying DEFAULT NULL::character varying, _record_sort_order character varying DEFAULT 'asc'::character varying)
 RETURNS TABLE(rowid text, is_footer_row boolean, is_row_locked boolean, product_level_id integer, product_level_value text, store_level_id integer, store_level_value text, cw_offer_percentage double precision, min_offer_value double precision, max_offer_value double precision, pcd_metrics jsonb, optimisation_type integer, step_count integer, total_count integer, cw_incremental_discount double precision, cw_effective_price_point double precision, brand text[], department text[], class text[], mfg text[], age double precision, base_price double precision, show_alert boolean, sales_units_diff double precision, ia_discount_next_pcd double precision, upcoming_pcd_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
	DECLARE
		
	BEGIN
	    if ( _product_level is null or _store_level is null) or ( _product_level = _strategy_actual_product_level and _store_level = _strategy_actual_product_level) then 
			return query select * from price_markdown.fn_v3_get_step3_default_table_data(
											_strategy_id,
											_page_number,
											_number_of_pages,
											_limit,
											_offset,
											_pcd_metrics_filter,
											_approval_filter,
											_records_filters,
											_record_sort_key,
											_record_sort_order,
											_is_data_changed,
											_include_copy_ia,
											_copy_ia_session_id
										);
		else
			return query select * from price_markdown.fn_v3_get_step3_custom_table_data(
											_strategy_id,
											_pcd_ids,
											_product_level,
											_store_level, 
											_strategy_actual_product_level,
											_strategy_actual_store_level,
											_include_copy_ia,
											_copy_ia_session_id, 
											_is_data_changed, 
											_pcd_metrics_filter, 
											_approval_filter, 
											_page_number, 
											_number_of_pages, 
											_limit, _offset, 
											_records_filters, 
											_record_sort_key, 
											_record_sort_order
										);
		end if;
  	END;
$function$
;
