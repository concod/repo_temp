-- liquibase formatted sql
-- changeset pradeep.kumar@impactanalytics.co:updated_order_cost_logic runOnChange:true stripComments:false splitStatements:false context:MTP-117108 labels:sync_oms_recommended_orders
-- comment: updated order_cost logic

DROP PROCEDURE IF EXISTS public.sync_oms_recommended_orders();
CREATE OR REPLACE PROCEDURE public.sync_oms_recommended_orders(IN _is_historic boolean DEFAULT false)
LANGUAGE 'plpgsql'
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_recommended_orders';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _worker varchar;
    _where_clause text;
    _insert_query text;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

    if _is_historic then

        select async_query INTO _worker from public.async_query('truncate table inventory_smart.oms_orders_recommended;');
        perform public.async_query_status(_worker, 'cleanup');
		
    else
        _where_clause := ' ( (order_status_id = 0)
        or (order_status_id = 3 and is_deleted = true)
        or ((
			order_status_id IN (1,2,-1)
			AND CASE WHEN 
			(
				TO_TIMESTAMP(SUBSTRING(order_batch_name FROM ''IA_Order_(\d{8}T\d{6})''),''YYYYMMDD"T"HH24MISS'') AT TIME ZONE ''Asia/Kolkata''
			)::date IS NOT NULL
				THEN current_date-7 > (TO_TIMESTAMP(SUBSTRING(order_batch_name FROM ''IA_Order_(\d{8}T\d{6})''),''YYYYMMDD"T"HH24MISS'')AT TIME ZONE ''Asia/Kolkata'')::date 
			ELSE false
			END
			) 
		 ) )';

        perform public.parellel_insert('WITH rows AS (
            delete from inventory_smart.oms_orders_recommended
            {where}
            and ' || _where_clause || '
            RETURNING 1
        )
        select count(1) as cnt FROM rows;',
        50,
        'inventory_smart.oms_orders_recommended',
        'product_code',
        null,
        100
        );
		--raise notice 'table query : %', _sql;

    end if;

	_log_step:= 'Index creation';
	SELECT async_query INTO _worker
	FROM public.async_query('CREATE INDEX IF NOT EXISTS idx_oms_safetystock_product_code ON public.oms_safetystock (product_code,channel,fiscal_year_week);');
	PERFORM public.async_query_status(_worker, 'cleanup');
	CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, NULL, (clock_timestamp() - _st)::text, NULL);
		
    _insert_query := 'WITH rows AS (
        insert into inventory_smart.oms_orders_recommended
		  (
		  id,
			order_group_id,
			order_batch_name,
			order_gen_type,
			product_code,
			style,
			size,
			loc_code,
			channel,
			article,
			vendor_code,
			vendor_name,
			rop,
			grade,
			order_quantity,
			order_cost,
			unit_cost,
			roq_constrained,
			raw_roq,
			ia_shipment_order_quantity,
			roq_unconstrained,
			order_placement_date,
			order_placement_recom_date,
			fiscal_year_week,
			fiscal_year_month,
			fiscal_year,
			fiscal_year_quarter,
			week_start_date,
			month,
			expected_receipt_date,
			rop_ideal,
			mode_shipment,
			lead_time,
			order_to_po_processing_time,
			effective_lead_time,
			min_order_quantity_shipment,
			min_order_quantity_sku,
			min_order_quantity_style,
			max_order_quantity_shipment,
			max_order_quantity_sku,
			max_order_quantity_style,
			order_multiple,
			inventory_hold,
			order_status_id,
			created_by,
			created_at,
			updated_by,
			updated_at,
			approve_by_date,
			is_deleted,
			is_resolved,
			recom_receipt_date,
			editable_expected_receipt_date,
			lost_sales_agg,
			inventory_deficit_agg,
			orders_upto_qty,
			elt_projected_bop,
			elt_projected_safety_stock,
			order_type,
			target_qty,
			forecasted_sales,
			target_wos,
			immd_roq,
			order_reason,
			safety_stock,
			elt_projected_store_inv,
			order_placement_date_original
		)
		select
			nextval(''inventory_smart.oms_orders_recommended_id_seq'') as id,	
			MD5(CONCAT(paf.style,
			(order_placement_date::date)::text,
			(order_placement_date::date)::text,
			''True'')) as order_group_id,
			null as order_batch_name,
			''Recommended'' as order_gen_type,
			orid.product_code,
			paf.style,
			paf.size,
			orid.loc_code as loc_code,
			orid.channel,
			paf.article,
			paf.primary_vendor_cd as vendor_code,
			paf.primary_vendor_dsc as vendor_name,
			order_placement_date::date as rop,
			null as grade,
			roq_unconstrained as order_quantity,
			coalesce(roq_unconstrained * paf.cost) as order_cost,
			paf.cost as unit_cost,
			roq_constrained as roq_constrained,
			raw_roq as raw_roq,
			ia_shipment_order_quantity as ia_shipment_order_quantity,
			roq_unconstrained as roq_unconstrained,
			order_placement_date::date as order_placement_date,
			order_placement_date::date as order_placement_recom_date,
			orid.fiscal_year_week as fiscal_year_week,
			fdm.fiscal_year_month as fiscal_year_month,
			fdm.fiscal_year as fiscal_year,
			fdm.fiscal_year_quarter as fiscal_year_quarter,
			fdm.week_start_date as week_start_date,
			fdm.month as month,
			orid.receipt_date::date as expected_receipt_date,
			order_placement_date::date as rop_ideal,
			null as mode_shipment,
			orid.eff_lead_time as lead_time,
			po_to_order_processing as order_to_po_processing_time,
			orid.eff_lead_time as effective_lead_time,
			orid.min_order_quantity_shipment as min_order_quantity_shipment,
			ok.min_order_quantity_sku as min_order_quantity_sku,
			orid.min_order_quantity_style as min_order_quantity_style,
			orid.max_order_quantity_shipment as max_order_quantity_shipment,
			ok.max_order_quantity_sku as max_order_quantity_sku,
			orid.max_order_quantity_style as max_order_quantity_style,
			null as order_multiple,
			pending_user_reserve as inventory_hold,
			0 as order_status_id,
			112 as created_by,
			current_timestamp as created_at,
			null as updated_by,
			null as updated_at,
			date(order_placement_date::date +
			interval ''7 day'') as approve_by_date,
			false as is_deleted,
			false as is_resolved,
			orid.recom_receipt_date::date,
			orid.receipt_date::date as editable_expected_receipt_date,
			lost_sales_agg as lost_sales_agg,
			inventory_deficit_agg as inventory_deficit_agg,
			null as orders_upto_qty,
			elt_projected_bop as elt_projected_bop,
			elt_projected_safety_stock as elt_projected_safety_stock,
			order_type as order_type,
			null as target_qty,
			total_store_forecast as forecasted_sales,
			target_wos as target_wos,
			null as immd_roq,
			null as order_reason,
			os.safety_stock,
			elt_projected_store_inv,
			cast(order_placement_date_original as date) as order_placement_date_original
        from (select * from public.oms_recommendation_input_data  {where} )orid
        join
			(
				select
					distinct product_code,
					article,
					style,
					size,
					primary_vendor_cd,
					primary_vendor_dsc,
					cost
				 from global.product_attributes_filter {where} and active_ladder_flg = true and l0_name = ''USA''
			)as paf		
				using(product_code)
			join
			(
				select
					distinct fiscal_year_week,
					fdm.fiscal_week_begin_date as week_start_date,
					fiscal_year_quarter,
					fiscal_year,
					fiscal_year_month,
					fiscal_month_name as month
				from
					global.fiscal_date_mapping fdm
				join
					(
						select distinct
							fiscal_week_begin_date
						from global.fiscal_date_mapping
					) as b1
				on fdm.calendar_date = b1.fiscal_week_begin_date
			)as fdm
				using(fiscal_year_week)
			join inventory_smart.oms_constraints_lead_time oclt
				using(article,loc_code,channel)
			left join public.oms_safetystock os
				on orid.product_code = os.product_code
				and orid.channel = os.channel
				and orid.fiscal_year_week = os.fiscal_year_week
			join inventory_smart.oms_kpi ok
				on orid.product_code = ok.product_code
				and orid.loc_code = ok.loc_code
				and orid.channel = ok.channel
			where order_type is not null
			ON conflict on constraint uk_oms_orders_recommended DO NOTHING
        RETURNING 1
    )
    select count(1) as cnt FROM rows;';
   --raise notice '_insert_query :%',_insert_query;
    perform public.parellel_insert(_insert_query,
    50,
    'public.oms_recommendation_input_data ',
    'product_code',
    'idx_oms_recommendation_input_data',
    100
    );

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$;