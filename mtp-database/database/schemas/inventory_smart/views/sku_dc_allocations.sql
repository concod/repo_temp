--liquibase formatted sql
--changeset liquibase:sku_dc_allocations runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sku_dc_allocations
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_allocations;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_allocations
as
select
	carfs.allocation_code,
	carfs.article,
	carfs.retail_size_cd as size,
	ph.product ->> 'product_code'::text as product_code,
	replace(carfs.dc_codes[1]::text, ''''::text, ''::text)::integer as dc_code,
	channel[1],
	sum(carfs.allocated_total) as quantity,
	max(carfs.updated_at) as updated_at
from
	inventory_smart.create_allocation_result_flat_gurobi carfs
join inventory_smart.plan_master pm on
	carfs.allocation_code::text = pm.plan_code::text
join (
	select
		ph_master.ph_code,
		ph_master.article,
		unnest(ph_master.product_code_size_map) as product
	from
		inventory_smart.ph_master) ph on
	ph.article::text = carfs.article::text
	 AND carfs.retail_size_cd::text = (ph.product ->> 'size'::text)
	 
JOIN ( SELECT plan_attributes.plan_code,
    plan_attributes.attribute_value::character varying[] AS channel
   FROM inventory_smart.plan_attributes
  WHERE plan_attributes.attribute_name::text = 'channel'::text) pa ON pm.plan_code::text = pa.plan_code
where
	date((pm.updated_at at TIME zone 'UTC'::text)) = (now() at TIME ZONE 'UTC')::date
	and pm.status = ANY (ARRAY[2, 3])
	and pm.is_deleted = false
	and carfs.allocated_total <> 0::double precision
	and carfs.retail_size_cd::text = (ph.product ->> 'size'::text)
group by
	carfs.allocation_code,
	carfs.article,
	carfs.retail_size_cd,
	(ph.product ->> 'product_code'::text),
	(carfs.dc_codes[1]),
channel;
;