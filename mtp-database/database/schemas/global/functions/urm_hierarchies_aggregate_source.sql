--liquibase formatted sql
--changeset srishti.kumari@impactanalytics.co:MNS_UAM_CHANGE runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-131537
--comment: combined all dimensions filters in single json
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.urm_hierarchies_aggregate_source(input refcursor, jsonb, character varying);
CREATE OR REPLACE FUNCTION global.urm_hierarchies_aggregate_source(input refcursor, jsonb, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
	_query text := '';
	_where_clause text := '';
	begin
 		_where_clause := "global".form_where_clause('varchar',$2);
 		raise notice ' where clause %', _where_clause;
 		raise notice ' % variable', $3;
 		_query := '
			select concat('
 				|| $3||') as id,'
				|| $3 ||
			' from
				global.product_store_hierarchy_mapping	
			' || _where_clause || ' group by ' || $3 || ' order by ' || $3;
	
	raise notice ' query %', _query;
	open $1 for execute _query;
	return $1;
	end $function$
;
