--liquibase formatted sql
--changeset chaitanyaprasad.reddy@impactanalytics.co:MNS_UAM_CHANGE runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MNS_UAM_CHANGE
--comment: initial changeset for urm_hierarchies_aggregate_source and added group by for MNS usecase to avoid duplicates
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.urm_hierarchies_aggregate_source(input refcursor, jsonb, jsonb, character varying);
CREATE OR REPLACE FUNCTION global.urm_hierarchies_aggregate_source(input refcursor, jsonb, jsonb, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
	_query text := '';
	_where_clause text := '';
	begin
 		_where_clause := "global".form_where_clause('varchar',$2 || $3);
 		raise notice ' where clause %', _where_clause;
 		raise notice ' % variable', $4;
 		_query := '
			select concat('
 				|| $4||') as id,'
				|| $4 ||
			' from
				global.product_store_hierarchy_mapping	
			' || _where_clause || ' group by ' || $4 || ' order by ' || $4;
	
	raise notice ' query %', _query;
	open $1 for execute _query;
	return $1;
	end $function$
;
