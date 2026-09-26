--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:sync_excess_units_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-77364
--comment: sync_excess_units
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_excess_units();
CREATE OR REPLACE PROCEDURE public.sync_excess_units(IN is_historic boolean DEFAULT false)
LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_excess_units';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_worker text;
	_record_count integer := 0;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
-- Check if there's any data in public.excess_units
SELECT count(*) INTO _record_count FROM public.excess_units;

if _record_count = 0 then
    raise notice 'No data found in public.excess_units. Skipping sync process.';
    return;
end if;

raise notice 'Found % records in public.excess_units. Starting sync process.', _record_count;

if is_historic then
    select async_query into _worker from public.async_query('delete from
    inventory_smart.excess_units
    where
    true;');
    perform public.async_query_status(_worker, 'cleanup');
    raise notice 'Step1: %', (clock_timestamp() - st);
end if;

perform public.parellel_insert('WITH rows AS (
INSERT INTO inventory_smart.excess_units (
product_hierarchy, store_code, store_name,
fiscal_year, fiscal_week, "date",
oh, oo, it, week_qty, ros, target_wos,
wos_pred, excess_inv, excess_inv_cost,
tot_inv, fiscal_year_week, min_stock,
bop_oh, bop_it, bop_oo,
style_color_description, l0_name, l1_name, l2_name, l3_id_name, brand,
s0_name, s1_id_name, s2_id_name, s3_id_name, store_tier, store_code_name,
country, fullfillment_type
)
SELECT DISTINCT
a.product_hierarchy,
a.store_code,
COALESCE(a.store_name, '''') as store_name,
a.fiscal_year,
a.fiscal_week,
a."date",
a.oh,
a.oo,
a.it,
a.week_qty,
a.ros,
a.target_wos,
a.wos_pred,
a.excess_inv,
a.excess_inv_cost,
a.tot_inv,
(a.fiscal_year*100+a.fiscal_week) as fiscal_year_week,
null::int4 as min_stock,
a.bop_oh,
a.bop_it,
a.bop_oo,
COALESCE(paf.style_color_description, '''') as style_color_description,
COALESCE(paf.l0_name, '''') as l0_name,
COALESCE(paf.l1_name, '''') as l1_name,
COALESCE(paf.l2_name, '''') as l2_name,
COALESCE(paf.l3_id_name, '''') as l3_id_name,
paf.brand,
COALESCE(saf.s0_name, '''') as s0_name,
saf.s1_id_name,
saf.s2_id_name,
saf.s3_id_name,
saf.store_tier,
COALESCE(saf.store_code_name, '''') as store_code_name,
a.country,
a.fullfillment_type
FROM
public.excess_units a
LEFT JOIN global.product_attributes_filter paf ON a.product_hierarchy = paf.article
LEFT JOIN global.store_attributes_filter saf ON a.store_code = saf.store_code
WHERE a."date" IS NOT NULL
{where} RETURNING 1
)
SELECT
count(1) as cnt
FROM
rows;', 50, 'public.excess_units', '"date"', null);

raise notice 'Step2: %', (clock_timestamp() - st);

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
