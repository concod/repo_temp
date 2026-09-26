--liquibase formatted sql
--changeset ashish@impactanalytics.co:generate_rcl_constraint_data_v2 runOnChange:true stripComments:false splitStatements:false context:Release_3 labels:DAT-1509
--comment: initial changeset for generate_rcl_constraint_data_v2
--rollback: SELECT 1
DROP FUNCTION if exists inventory_smart.generate_rcl_constraint_data_v3(_l0_name text, _inputs text);
CREATE OR REPLACE FUNCTION inventory_smart.generate_rcl_constraint_data_v3(_l0_name text, _inputs text)
 RETURNS TABLE(product_code text, store_code text, rcl_code integer, wos real, transit_time real, safety_stock real, min_stock real, max_stock real, aps real, ros real, st real, dos real, min_distribution character varying)
 LANGUAGE plpgsql
AS $function$ 
#variable_conflict use_column 
declare 
	_version int;
	_sql text;
begin
SET local work_mem = '10GB';
	SELECT version_code into _version FROM "global".rcl_versioning WHERE module_code = 170 AND updated_at IS NOT NULL ORDER BY updated_at DESC LIMIT 1;
execute 'CREATE INDEX if not exists idx_rcl_vc_id 
ON global.rcl_vc_' || _version || ' (id);';
	_sql := format($$
		SELECT 
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
    r.st,
    r.dos,
    r.min_distribution
FROM %2$s t
CROSS JOIN LATERAL (
    SELECT *
    FROM global.rcl_vc_%1$s r
    WHERE r.store_codes @> array[t.store_code]::varchar[]
      AND r.product_codes @> array[t.product_code]::varchar[]
    ORDER BY r.id
    LIMIT 1
) r $$, (_version || '_' || lower(regexp_replace(_l0_name, '\W+', '', 'g'))), _inputs);
	raise notice '_sql: %', _sql;
		return query execute _sql ;
end
$function$
;
