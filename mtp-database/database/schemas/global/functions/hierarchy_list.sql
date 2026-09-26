--liquibase formatted sql
--changeset liquibase:hierarchy_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for hierarchy_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.hierarchy_list(input character varying);
CREATE OR REPLACE FUNCTION global.hierarchy_list(input character varying)
 RETURNS TABLE(hl json)
 LANGUAGE plpgsql
AS $function$
declare
    _query text;
    begin
    _query := '
 select hl from (
			select
					--1 hl
    json_agg(pal.attribute_name) hl
					from global.product_attributes_list pal
				where
					pal.attribute_name like ''l%_name''
					and pal.hierarchy_level <=
				(
					select
						pal.hierarchy_level
					from
						global.product_attributes_list pal
					where
		pal.attribute_name like ''l%_name''
		and pal.attribute_name = '''||$1||'''
	) )x  ';

           raise notice '%',  _query;
           return QUERY execute _query;
    end
$function$
;
