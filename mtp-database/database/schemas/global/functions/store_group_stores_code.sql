--liquibase formatted sql
--changeset liquibase:store_group_stores_code runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_group_stores_code
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_group_stores_code(input integer);
CREATE OR REPLACE FUNCTION global.store_group_stores_code(input integer)
 RETURNS TABLE(store_code character varying)
 LANGUAGE plpgsql
AS $function$
	declare
	_query text := '';
	begin
 		_query := '
				select
					store_code
				from
					global.store_groups_mapping
				where
					sg_code = ' || $1 || ' ;';
		raise notice '%',_query;
		return query execute _query;
	end $function$
;
