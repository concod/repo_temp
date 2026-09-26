--liquibase formatted sql
--changeset liquibase:ref_stores_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ref_stores_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.ref_stores_list();
CREATE OR REPLACE FUNCTION global.ref_stores_list()
 RETURNS TABLE(store_code character varying, store_name character varying)
 LANGUAGE plpgsql
AS $function$
begin
return query execute 'select
	sm.store_code,
	sm.store_name
from
	(
	select
		distinct store_code
	from
		"global".product_mapping_product_store where validity is not null) psm
join "global".store_master sm on
	psm.store_code = sm.store_code
AND sm.dc_code is null and sm.active
order by
	2 asc;';
end $function$
;
