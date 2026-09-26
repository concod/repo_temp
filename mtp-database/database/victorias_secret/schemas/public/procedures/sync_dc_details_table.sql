--liquibase formatted sql
--changeset anujkumar.singh@impactanalytics.co:sync_dc_details_table_v2 runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:MTP-59895
--comment: Updated SP to handle the null asn_ids rows
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_dc_details_table();
CREATE OR REPLACE PROCEDURE public.sync_dc_details_table()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_details_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    
delete from inventory_smart.dc_details_table
where true;

insert into inventory_smart.dc_details_table(product_code,dc_code,article,recommendation_flag,next_po_upcoming_date,next_po_upcoming_units,excess_deficit_units,excess_deficit_tag,demand_projection,sales_forecast,cwos,safety_stock)
with base as 
(
	select "hierarchy"->>'product_code'::text as product_code,
	"hierarchy"->>'article'::text as article,dc::int4 as dc_code,
	coalesce(b.recommendation_flag,0) as recommendation_flag
	from inventory_smart.dc_service_levels dsl 
	left join (
	select product_code, recommendation_flag 
	from inventory_smart.dc_review_recommendation drrt 
	group by 1,2
	) b
	on dsl."hierarchy"->>'product_code'::text = b.product_code
)

,asn_data AS (
  SELECT product_code,a.dc_code,requirement_date AS delivery_date,SUM(available_qty ) AS asn_qty
  FROM inventory_smart.asn_master_null_asn_id  as a
  inner join (
    select product_code, dc_code
    from base
    group by 1,2
  ) b
  on a.pack_type_id = b.product_code and a.dc_code = b.dc_code
  where requirement_date > current_date
  GROUP BY 1,2,3
)

,po_data AS (
  SELECT product_code,a.dc_code, requirement_date AS delivery_date,SUM(available_qty ) AS po_qty
  FROM inventory_smart.po_master as a
  inner join (
    select product_code, dc_code 
    from base
    group by 1,2
  ) b
  on a.pack_type_id = b.product_code and a.dc_code = b.dc_code
  where requirement_date > current_date
  GROUP BY 1,2,3
)

,po_asn_combined as (
  Select product_code,dc_code,delivery_date,sum(po_qty) as po_qty 
  from (
    SELECT product_code,dc_code,delivery_date,asn_qty as po_qty 
    FROM asn_data
    UNION ALL
    SELECT product_code,dc_code,delivery_date,po_qty
    FROM po_data
  ) a
  group by 1,2,3
)

,min_po_date as( 
  Select product_code,dc_code ,min(delivery_date) as next_po_upcoming_date
  from po_asn_combined
  group by 1,2
)

,po_metrics as (
  select a.product_code, a.dc_code,next_po_upcoming_date, sum(PO_QTY) as next_po_upcoming_units
  from po_asn_combined a
  inner join min_po_date b
  on a.product_code = b.product_code and a.dc_code = b.dc_code
  and next_po_upcoming_date = delivery_date
  group by 1,2,3
)

,excess_metrics as (
	select product_code, dc_code, abs(deficit_excess_units) as deficit_excess_units, tag as excess_deficit_tag, total_allocations as demand_projection, sales_forecast 
	from inventory_smart.dc_excess_deficit_tag  
)

,initial_oh AS (
	SELECT product_code, dc_code, oh AS oh_initial
	FROM inventory_smart.dc_to_dc_available_units
)

,wos_metrics as (
	SELECT f.product_code,f.dc_code, i.oh_initial, max(safety_stock) as safety_stock,
	count(*) FILTER (WHERE i.oh_initial::double precision >= f.cumulative_outbound) AS cwos
    FROM ( 
    	SELECT  product_code, dc_code, fiscal_year_week,safety_stock,
    	sum(dc_outbound) OVER (PARTITION BY product_code, dc_code ORDER BY fiscal_year_week) AS cumulative_outbound
		FROM inventory_smart.dc_forecast_week_level
	) f
	JOIN initial_oh i 
	ON f.product_code::text = i.product_code::text AND f.dc_code = i.dc_code
	GROUP BY f.product_code, f.dc_code, i.oh_initial
)


select a_1.product_code, a_1.dc_code, a_1.article, a_1.recommendation_flag::bool as recommendation_flag
,a_2.next_po_upcoming_date, a_2.next_po_upcoming_units, a_3.deficit_excess_units,a_3.excess_deficit_tag
,ROUND(a_3.demand_projection::numeric,2) AS demand_projection,ROUND(a_3.sales_forecast::numeric,2) AS sales_forecast, a_4.cwos,coalesce(ROUND(a_4.safety_stock::numeric,2),0) as safety_stock
from base a_1
left join po_metrics as a_2 using(product_code,dc_code)
left join excess_metrics as a_3 using(product_code,dc_code)
left join wos_metrics as a_4 using(product_code, dc_code)
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