--liquibase formatted sql
--changeset liquibase:store_groups_stores_lists runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_groups_stores_lists
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_groups_stores_lists(input integer[], jsonb);
CREATE OR REPLACE FUNCTION global.store_groups_stores_lists(input integer[], jsonb)
 RETURNS TABLE(store_code character varying, store_name character varying, region character varying)
 LANGUAGE plpgsql
AS $function$
	declare
	_query_table_filters text := '';
	_query_combine text := '';
	begin
		_query_table_filters := global.form_table_query($2);
 		_query_combine := 'SELECT * FROM (
			select
				sg.store_code,
				sm.store_name,
                rg.region
			from
				(
				select
					*
				from
					global.store_groups_mapping
				where
					sg_code = ' || any($1) || ') sg
			join global.store_master sm on
				sg.store_code = sm.store_code
			join (
				select
					store_code,
					attribute_value as region
				from
					global.store_attributes
				where
					attribute_name = ''region'') as rg on
				sg.store_code = rg.store_code
		) X ' || _query_table_filters;
		raise notice '%',_query_combine;
		return query execute _query_combine;
	end $function$
;
