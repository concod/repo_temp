--liquibase formatted sql
--changeset liquibase:product_group_specific_definition_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_group_specific_definition_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_group_specific_definition_list(input integer, jsonb);
CREATE OR REPLACE FUNCTION global.product_group_specific_definition_list(input integer, jsonb)
 RETURNS TABLE(pgd_code integer, name character varying, pseudo_code text, rules jsonb)
 LANGUAGE plpgsql
AS $function$
	declare 
		_query text;
	begin
		_query := 'select
					pgd.pgd_code,
					pgd.name,
					pgd.pseudo_code,
					case
						when count(pgr.pgr_code) = 0 then null
						else jsonb_agg(jsonb_build_object(''pgr_code'', pgr.pgr_code, ''name'', pgr.name, ''attribute_name'', pgr.attribute_name, ''attribute_values'', pgr.attribute_values))
					end as rules
				from
					(
					select
						*
					from
						"global".product_group_definitions
					where
						is_deleted = false) pgd
				join (
					select
						*
					from
						"global".product_group_definitions_rules_mapping
					where
						pg_code = ' || $1 || ') pgdrm 
				on
					pgd.pgd_code = pgdrm.pgd_code
				left join (
					select
						*
					from
						"global".product_group_rules
					where
						is_deleted = false) pgr
				on
					pgdrm.pgr_code = pgr.pgr_code
				group by
					1,
					2,
					3';
		 _query := 'SELECT * FROM (' || _query || ') X ' || ("global".form_table_query($2));
		 raise notice '%', _query;
		 return QUERY execute _query;
		execute _query;
	end $function$
;
