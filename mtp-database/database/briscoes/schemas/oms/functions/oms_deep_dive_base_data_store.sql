--liquibase formatted sql
--changeset aman.pareek:oms_deep_dive_base_data_storev2 runOnChange:true stripComments:false splitStatements:false context:None labels:oms_deep_dive_base_data_storev2
--comment: Created oms_deep_dive_base_data_store
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_deep_dive_base_data_store(text, bool, bool);
CREATE OR REPLACE FUNCTION inventory_smart.oms_deep_dive_base_data_store(inp_data text, week_qc_time boolean DEFAULT false, signet_version boolean DEFAULT false)
 RETURNS TABLE(product_code character varying, dc_id character varying, channel character varying, vendor_code character varying, order_quantity double precision, unit_cost double precision, roq_constrained integer, roq_unconstrained integer, order_cost double precision, rop_week integer, nb_fiscal_year_week integer, rd_fiscal_year_week integer, order_type character varying, raw_roq integer, product_size character varying, store_name character varying, ia_shipment_order_quantity integer)
 LANGUAGE plpgsql
AS $function$
declare 
	query_part_1 text;
	query_elt text;
	query_part_2 text;
	signet_query text;
	final_query text;
begin
	query_part_1 := 'select
	*
from
	((
	select
		product_code::varchar,
		oor.store_code::varchar as dc_id,
		oor.channel::varchar,
		vendor_code::varchar,
		order_quantity::float8 as order_quantity,
		unit_cost::float8,
		roq_constrained,
		roq_unconstrained::int,
		order_quantity::float8 * unit_cost::float8 as order_cost,
		fdm3.fiscal_year_week as rop_week,
		fdm1.fiscal_year_week as nb_fiscal_year_week,
		fdm2.fiscal_year_week as rd_fiscal_year_week,
		order_type::varchar,
		raw_roq,
		product_size::varchar,
		saf.store_name::varchar,
		oor.ia_shipment_order_quantity
	from
		(with
ct1 as (
		select
			product_code,
			oor.store_code ,
			oor.channel,
			oor.ia_shipment_order_quantity,
			vendor_code,
			order_quantity::float8 as order_quantity,
			unit_cost,
			roq_constrained,
			roq_unconstrained,
			editable_expected_receipt_date,
			rop,
			order_quantity::float8 * unit_cost as order_cost,
			fdm.fiscal_year_week as nb_fiscal_year_week,
			is_deleted,
			order_placement_date,
			order_status_id,
			case
				when order_type = ''Order Cycle (Shifted)'' then ''Order Cycle''
				when order_type = ''Immediate (Shifted)'' then ''Immediate''
				when order_type = ''Zero ROQ (Shifted)'' then ''Zero ROQ''
				else order_type
			end as order_type,
			raw_roq as raw_roq,
			size as product_size
		from
			inventory_smart.oms_orders_recommended_store oor
		left join global.fiscal_date_mapping fdm on
			oor.editable_expected_receipt_date = fdm.calendar_date)';
	if week_qc_time then
		query_elt := ',ct2 as (
		select
			*
		from
			inventory_smart.oms_qc_days)
		select
			ct1.*,
			ct2.qc_days,
			(ct1.editable_expected_receipt_date + ct2.qc_days) as elt_date_dynamic
		from
			ct1
		left join ct2 on
			ct1.product_code = ct2.product_code
			and ct1.vendor_code = ct2.vendor_code
			and ct1.store_code = ct2.dc_id
			and ct1.nb_fiscal_year_week = ct2.vlt_week
			) oor';
	else
		query_elt := 'select
			ct1.*,
			(ct1.editable_expected_receipt_date) as elt_date_dynamic
		from
			ct1
			) oor';
	end if;
	query_part_2 := '
left join global.fiscal_date_mapping fdm1 on
		oor.editable_expected_receipt_date = fdm1.calendar_date
	left join global.fiscal_date_mapping fdm2 on
		oor.elt_date_dynamic = fdm2.calendar_date
	left join global.fiscal_date_mapping fdm3 on
		oor.order_placement_date = fdm3.calendar_date
	left join global.store_attributes_filter saf on
		oor.store_code = saf.store_code
	where
		oor.order_status_id in (0, 3) and
		((oor.is_deleted = false)
			or (oor.is_deleted = true
				and oor.order_placement_date = current_date))
		and ' || inp_data ||')';
	if signet_version then
	signet_query := 'union distinct
(with max_fw_1
as
(
select
	MAX(order_placement_date) as max_fw
from
	inventory_smart.oms_orders_recommended oor
),
reqd_fw as
(
select
	distinct fiscal_year_week
from
	global.fiscal_date_mapping
where
	(date_trunc(''week'',
	calendar_date)::date-1)>(
	select
		max_fw
	from
		max_fw_1)
order by
	1
limit 22
)
select
	product_code,
	store_code as dc_id,
	channel,
	vendor_code,
	roq as order_quantity,
	unit_cost::float8,
	roq as roq_constrained,
	roq as roq_unconstrained,
	roq * unit_cost::float8 as order_cost,
	fdm1.fiscal_year_week as rop_week,
	fdm2.fiscal_year_week as nb_fiscal_year_week,
	fdm3.fiscal_year_week as rd_fiscal_year_week,
	case
		when oorb.order_type = ''Order Cycle (Shifted)'' then ''Order Cycle''
		when order_type = ''Immediate (Shifted)'' then ''Immediate''
		when oorb.order_type = ''Zero ROQ (Shifted)'' then ''Zero ROQ''
		else oorb.order_type
	end as order_type,
	saf.store_name,
	ia_shipment_order_quantity
from
	inventory_smart.oms_orders_recommended_base oorb
left join global.fiscal_date_mapping fdm1 on
	oorb.start_week_date_dynamic = fdm1.calendar_date
left join global.fiscal_date_mapping fdm2 on
	oorb.not_before_date = fdm2.calendar_date
left join global.fiscal_date_mapping fdm3 on
	oorb.expected_receipt_date = fdm3.calendar_date
left join global.store_attributes_filter saf on
	oorb.store_code = saf.store_code
where
	fdm1.fiscal_year_week in (
	select
		fiscal_year_week
	from
		reqd_fw)
	and' || inp_data ||')';
	else
	signet_query := '';
	end if;
	final_query := query_part_1 || query_elt || query_part_2 || signet_query || ') X';
	RAISE NOTICE 'Executing query: %', final_query;
	return query execute final_query;
end;
$function$
;
