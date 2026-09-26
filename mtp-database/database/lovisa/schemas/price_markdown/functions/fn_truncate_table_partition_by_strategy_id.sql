--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_truncate_table_partition_by_strategy_id-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added security definer
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_truncate_table_partition_by_strategy_id;
CREATE OR REPLACE FUNCTION price_markdown.fn_truncate_table_partition_by_strategy_id(_strategy_id text, _table_name text)
 RETURNS integer
	LANGUAGE plpgsql
    SECURITY DEFINER
AS $function$
declare
	temp_table_name text;
	check_table_exists boolean = FALSE;
	query text;
	schema_name_ text:= 'price_markdown';
begin
	temp_table_name := format('%1$s_%2$s', _table_name, _strategy_id);
	check_table_exists := EXISTS (SELECT 1 FROM information_schema.tables where table_schema = schema_name_ and table_name = temp_table_name);
	if check_table_exists then
		query := format('truncate table price_markdown.%1$s',temp_table_name);
		raise notice 'query: %', query;
		execute query;
	end if;
	return 1;
end;
$function$
;