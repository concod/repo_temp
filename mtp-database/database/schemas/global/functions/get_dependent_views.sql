--liquibase formatted sql
--changeset liquibase:get_dependent_views runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_dependent_views
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_dependent_views(input text);
CREATE OR REPLACE FUNCTION global.get_dependent_views(input text)
 RETURNS TABLE(dependent_schema text, dependent_table text, dependent_objecttype text, source_schema text, source_table text)
 LANGUAGE plpgsql
AS $function$
	/*  
 * Function/Procedure name: global.get_dependent_views
 * Created by: Kailash Yadav
 * Created at: 29-oct-2022
 * No of input parameter: 1
 * Parameter Description : $1 = table_name
 *                        
 * Purpose: This function been created to get the list of dependent materialized views and views 
 * Calling Statement:   
 *  select global.get_dependent_views('product_attributes_filter')
 * 
 * if any modification done in same function/procedure please record the changes in below format
 * 
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 *     
 */
	declare 
		_query text := '';
	begin
		_query := 'WITH RECURSIVE view_deps AS (
SELECT DISTINCT dependent_ns.nspname::text as dependent_schema
, dependent_view.relname::text as dependent_view
, case dependent_view.relkind
        when ''r'' then ''TABLE''
        when ''m'' then ''MATERIALIZED_VIEW''
        when ''i'' then ''INDEX''
        when ''S'' then ''SEQUENCE''
        when ''v'' then ''VIEW''
        when ''c'' then ''TYPE''
        else dependent_view.relkind::text
    end as dependent_ObjectType
, source_ns.nspname::text as source_schema
, source_table.relname::text as source_table
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
WHERE NOT (dependent_ns.nspname = source_ns.nspname AND dependent_view.relname = source_table.relname)
and source_table.relname ='''|| $1||'''
UNION
SELECT DISTINCT dependent_ns.nspname::text as dependent_schema
, dependent_view.relname::text as dependent_view
, case dependent_view.relkind
        when ''r'' then ''TABLE''
        when ''m'' then ''MATERIALIZED_VIEW''
        when ''i'' then ''INDEX''
        when ''S'' then ''SEQUENCE''
        when ''v'' then ''VIEW''
        when ''c'' then ''TYPE''
        else dependent_view.relkind::text
    end as dependent_ObjectType
, source_ns.nspname::text as source_schema
, source_table.relname::text as source_table
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
INNER JOIN view_deps vd
    ON vd.dependent_schema = source_ns.nspname
    AND vd.dependent_view = source_table.relname
    AND NOT (dependent_ns.nspname = vd.dependent_schema AND dependent_view.relname = vd.dependent_view)
)
select  * from view_deps
where 1=1;
		';
		RETURN QUERY EXECUTE _query;
	end
$function$
;
