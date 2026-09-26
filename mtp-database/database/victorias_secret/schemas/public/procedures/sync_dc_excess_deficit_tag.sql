--liquibase formatted sql
--changeset anujkumar.singh@impactanalytics.co:sync_dc_excess_deficit_tag runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:MTP-59895
--comment: SP update for sales_forecast
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_dc_excess_deficit_tag();
CREATE OR REPLACE PROCEDURE public.sync_dc_excess_deficit_tag()
LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_excess_deficit_tag';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
delete from 
 		  inventory_smart.dc_excess_deficit_tag
 		where 
 		  true;
With base as (
	Select a.article, a.product_code, a.fiscal_year_week, a.dc_code, a.dc_outbound,
		a.dc_inv_bop_pre_reserve, a.dc_inv_bop_post_allocation, a.safety_stock, a.dc_inv_bop
	,coalesce(dsl.target_wos,4) as dc_twos, a.sales_forecast
	FROM inventory_smart.dc_forecast_week_level a
	left join inventory_smart.dc_service_levels dsl
	on a.product_code = dsl."hierarchy"->>'product_code'::varchar and a.dc_code = dsl.dc
	where fiscal_year_week>= (select fiscal_year_week from "global".fiscal_date_mapping where date=current_date)
)
,updated_base as (
	Select *  from (
    	SELECT *,ROW_NUMBER() OVER (PARTITION BY product_code, dc_code ORDER BY fiscal_year_week ASC) AS row_num
    	FROM base
    ) as a
    where row_num<=dc_twos
)

,aggregated_data AS (
    SELECT
        product_code, dc_code,
        MIN(dc_inv_bop_post_allocation) AS min_dc_rem_ur_po,
        MIN(dc_inv_bop) AS min_dc_rem_ur,
        MAX(safety_stock) AS max_safety_stock,
        SUM(dc_outbound) AS total_allocations,
        AVG(sales_forecast) as sales_forecast
    from updated_base
    GROUP BY 1,2
)
,window_values as (
	SELECT DISTINCT
        product_code,
        dc_code,
        FIRST_VALUE(dc_inv_bop_pre_reserve) OVER (PARTITION BY product_code, dc_code ORDER BY fiscal_year_week) AS dc_oh_start,
        LAST_VALUE(dc_inv_bop) OVER (PARTITION BY product_code, dc_code ORDER BY fiscal_year_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS
        dcrem_po_end,
        LAST_VALUE(dc_inv_bop_post_allocation) OVER (PARTITION BY product_code, dc_code ORDER BY fiscal_year_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS dcrem_ur_po_end
    FROM
        updated_base
)


INSERT INTO inventory_smart.dc_excess_deficit_tag (product_code,dc_code,deficit_excess_units,tag,total_allocations,sales_forecast) 
Select product_code,dc_code,deficit_excess_units, 
   (CASE
        WHEN (deficit_excess_units > 0) THEN 'Excess'
        WHEN (deficit_excess_units < 0) THEN 'Deficit'
        ELSE 'At Level' 
    END) AS tag ,
	total_allocations,sales_forecast from
(
Select *,
    (CASE
        WHEN min_dc_rem_ur_po < GREATEST(safety_stock, dc_min) THEN min_dc_rem_ur_po - GREATEST(safety_stock, dc_min)
        WHEN dc_oh > total_allocations + GREATEST(safety_stock, dc_min) THEN min_dc_rem_ur - GREATEST(safety_stock, dc_min)
        ELSE 0
    END) AS deficit_excess_units
FROM
(
SELECT
    a.product_code,
    a.dc_code,
    a.max_safety_stock AS safety_stock,
    coalesce(dsl.min_stock,1) as dc_min,
    w.dc_oh_start AS dc_oh,
    a.total_allocations,
    a.sales_forecast,
    a.min_dc_rem_ur_po,
    a.min_dc_rem_ur,
    w.dcrem_po_end AS dcrem_po,
    w.dcrem_ur_po_end AS dcrem_ur_po
FROM
    aggregated_data a
left join inventory_smart.dc_service_levels dsl 
on a.product_code = dsl."hierarchy"->>'product_code'::text and a.dc_code = dsl.dc::int
JOIN
    window_values w ON a.product_code = w.product_code AND a.dc_code = w.dc_code
    ) a1
    ) a2
    on conflict do nothing;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
    end
$procedure$
;