--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:fn_v3_get_step3_table_data_v4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_get_step3_table_data_v4
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_get_step3_table_data_v4;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_get_step3_table_data_v4(_strategy_id integer, _pcd_ids integer[], _product_levels integer[], _store_levels integer[], _strategy_actual_product_levels integer[], _strategy_actual_store_levels integer[], _include_copy_ia boolean, _copy_ia_session_id text, _is_data_changed boolean, _pcd_metrics_filter jsonb, _approval_filter text[], _page_number integer, _number_of_pages integer, _limit integer, _offset integer, _records_filters jsonb, _record_sort_key character varying, _record_sort_order character varying, _alerts_seviority_filter integer[], _alerts_metric_filter integer[])
 RETURNS TABLE(rowid text, is_footer_row boolean, is_row_locked boolean, product_level_id integer, product_level_value jsonb, store_level_id integer, store_level_value jsonb, cw_offer_percentage double precision, min_offer_value double precision, max_offer_value double precision, pcd_metrics jsonb, ia_pcd_metrics jsonb, optimisation_type integer, step_count integer, total_count integer, cw_incremental_discount double precision, cw_effective_price_point double precision, brand text[], division text[], department text[], style text[], color text[], size text[], product_name text[], age double precision, base_price double precision, show_alert boolean, sales_units_diff double precision, ia_discount_next_pcd double precision, upcoming_pcd_id integer, max_alert_severity integer, alert_triggered_case text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
BEGIN
    if (_product_levels is null or _store_levels is null or array_length(_product_levels, 1) is null or array_length(_store_levels, 1) is null)
       or (_product_levels = _strategy_actual_product_levels and _store_levels = _strategy_actual_store_levels) then
        return query select * from price_markdown.fn_v3_get_step3_default_table_data_v4(
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
            _copy_ia_session_id,
            _alerts_seviority_filter,
            _alerts_metric_filter
        );
    else
        return query select * from price_markdown.fn_v3_get_step3_custom_table_data_v4(
            _strategy_id,
            _pcd_ids,
            _product_levels,
            _store_levels,
            _strategy_actual_product_levels,
            _strategy_actual_store_levels,
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
            _record_sort_order,
            _alerts_seviority_filter,
            _alerts_metric_filter
        );
    end if;
END;
$function$
;
