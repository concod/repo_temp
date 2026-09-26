--liquibase formatted sql
--changeset liquibase:dc_list runAlways:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.dc_list(input integer);
DROP FUNCTION IF EXISTS global.dc_list(input integer[]);
DROP FUNCTION IF EXISTS global.dc_list(refcursor, jsonb, jsonb, boolean);
DROP FUNCTION IF EXISTS global.dc_list(jsonb, jsonb);

CREATE OR REPLACE FUNCTION global.dc_list(input integer)
 RETURNS SETOF global.distribution_centres
 LANGUAGE plpgsql
AS $function$
	begin
	return QUERY
	   select
	   *
		from
			"global".distribution_centres WHERE dc_code = $1 AND is_deleted = false;
	end
	$function$
;

CREATE OR REPLACE FUNCTION global.dc_list(input integer[])
 RETURNS TABLE(dc_name character varying[])
 LANGUAGE plpgsql
AS $function$
declare
	_query_combine text:='';
	begin
		
		_query_combine := 'select array[name::text] dc_name from global.distribution_centres dc where dc_code = any('||concat($1)||')';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
	end
	$function$
;

CREATE OR REPLACE FUNCTION global.dc_list(refcursor, jsonb, jsonb, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
	_query_sa text := '';
	_query_combine text;
	_query_table_filters text := '';
	_final_query text := '';
	begin
		_query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $2);
		_query_table_filters := "global".form_table_query($3);
		_query_combine := 'SELECT * FROM (
		select dc.* from (
						SELECT main.dc_code,main.name,main.lead_time,main.cost_per_km, attributes.* FROM (select dc.*, sm.store_code from (select *
		from
			"global".distribution_centres WHERE is_deleted = false and is_active =true ) dc join "global".store_master sm on dc.dc_code = sm.dc_code) main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code) dc
		) X ' || _query_table_filters;
		raise notice '%', _query_combine;
			if $4 is false then 
                _final_query := _query_combine;
            else
            	_final_query := 'select count(*) from (' || _query_combine || ') temp' ;
            end if;
            
			open $1 for execute _final_query;
			RETURN $1;
	end
	$function$
;

CREATE OR REPLACE FUNCTION global.dc_list(jsonb, jsonb)
 RETURNS TABLE(dc_code integer, name character varying, lead_time integer, cost_per_km integer, region character varying)
 LANGUAGE plpgsql
AS $function$
declare
	_query_sa text := '';
	_query_combine text;
	_query_table_filters text := '';
	begin
		_query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $1);
		_query_table_filters := "global".form_table_query($2);
		_query_combine := 'SELECT * FROM (select
			dc_code,
dc.name,
dc.lead_time,
dc.cost_per_km,
dc.region from (SELECT main.*, region FROM ( select dc.*, sm.store_code from (select
	   *
		from
			"global".distribution_centres WHERE is_deleted = false and is_active =true ) dc join "global".store_master sm on dc.dc_code = sm.dc_code) main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code) dc
		) X ' || _query_table_filters;
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
	end
	$function$
;
