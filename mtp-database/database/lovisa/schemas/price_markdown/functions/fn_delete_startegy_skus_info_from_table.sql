--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_delete_startegy_skus_info_from_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_delete_startegy_skus_info_from_table
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_delete_startegy_skus_info_from_table;
CREATE OR REPLACE FUNCTION price_markdown.fn_delete_startegy_pcds_from_table(_strategy_id text, _table_name text, _pcd_ids integer[])
 RETURNS integer
	LANGUAGE plpgsql
AS $function$
declare
	temp_table_name text;
	check_table_exists boolean = FALSE;
	query text;
	schema_name_ text:= 'price_markdown';
begin
	if array_length(_product_ids, 1) > 0 then
		temp_table_name := format('%1$s%2$s', _table_name, _strategy_id);
		check_table_exists := exists (SELECT 1 FROM information_schema.tables where table_schema = schema_name_ and table_name = temp_table_name);
		if check_table_exists then
			query :=  format('delete from price_markdown.%1$s where %2$s = any(%3$L)', temp_table_name, _product_level, _product_ids);
			raise notice 'query: %', query;
			execute query;
		end if;
	end if;
	return 1;
end;
$function$
;