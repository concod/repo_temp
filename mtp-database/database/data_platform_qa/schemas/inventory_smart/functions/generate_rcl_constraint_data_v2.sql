--liquibase formatted sql
--changeset ashish@impactanalytics.co:generate_rcl_constraint_data_v2 runOnChange:true stripComments:false splitStatements:false context:Release_3 labels:DAT-1509
--comment: initial changeset for generate_rcl_constraint_data_v2
--rollback: SELECT 1
DROP FUNCTION if exists "inventory_smart".generate_rcl_constraint_data_v2(_l0_name text, _inputs text);
CREATE OR REPLACE FUNCTION inventory_smart.generate_rcl_constraint_data_v2(_l0_name text, _inputs text)
 RETURNS TABLE(product_code text, store_code text, rcl_code integer, wos real, transit_time real, safety_stock real, min_stock real, max_stock real, aps real, ros real, st real)
 LANGUAGE plpgsql
AS $function$ 
#variable_conflict use_column 
declare 
	_version int;
	_sql text;
begin
	SELECT version_code into _version FROM "global".rcl_versioning WHERE module_code = 170 AND updated_at IS NOT NULL ORDER BY updated_at DESC LIMIT 1;
	_sql := format($$
		with res as materialized (
			select 
			  r.id,
			  t.product_code, 
			  t.store_code, 
			  r.rcl_code, 
			  r.wos, 
			  r.transit_time, 
			  r.safety_stock, 
			  r.min_stock, 
			  r.max_stock, 
			  r.aps, 
			  r.ros, 
			  r.st 
			FROM 
			  %2$s t 
			  join global.rcl_vc_%1$s r on r.store_codes @> array[t.store_code] :: varchar[] 
			  and r.product_codes @> array[t.product_code] :: varchar[] 
--			where 
--			  version_code = %1$s
--			  and l0_name = '%2$s'
--			  and rcl_code is not null
		),
		first_res as (
			select product_code, store_code, min(id) as id from res group by 1,2
		)
		select
		  res.product_code, 
		  res.store_code, 
		  res.rcl_code, 
		  res.wos, 
		  res.transit_time, 
		  res.safety_stock, 
		  res.min_stock, 
		  res.max_stock, 
		  res.aps, 
		  res.ros, 
		  res.st 
		from res join first_res using(product_code, store_code, id) $$, (_version || '_' || lower(regexp_replace(_l0_name, '\W+', '', 'g'))), _inputs);
	raise notice '_sql: %', _sql;
	return query execute _sql;
end
$function$
;
