--liquibase formatted sql
--changeset liquibase:is_unique_product_unit_definition runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for is_unique_product_unit_definition
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.is_unique_product_unit_definition(input text, text);
CREATE OR REPLACE FUNCTION global.is_unique_product_unit_definition(input text, text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
	_query text;
	_cnt int;
	begin
		_query := 'select
						count(*)
					from
						(
						select
							pud_code
						from
							"global".style_mapping
						where
							style = ''' || $1 || ''') sm
					join (
						select
							pud_code
						from
							"global".product_unit_definitions
						where
							is_deleted = false
							and name = ''' || $2 || ''') pud on
						sm.pud_code = pud.pud_code;';
		execute _query into _cnt;
		return _cnt = 0;
	end
$function$
;
