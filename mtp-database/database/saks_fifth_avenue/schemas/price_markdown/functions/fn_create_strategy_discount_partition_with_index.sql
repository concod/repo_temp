--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_create_strategy_discount_partition_with_index_4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added security definer
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_create_strategy_discount_partition_with_index;
CREATE OR REPLACE FUNCTION price_markdown.fn_create_strategy_discount_partition_with_index(_strategy_id integer, _table_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
	declare
    	query text;
		partition_table_name text;
		table_name text;
    begin
	    -- Generate partition table name.
		partition_table_name := format('%1$s_%2$s', _table_name, _strategy_id);
		raise notice 'table_name : %, partition_table_name : %', _table_name, partition_table_name;

		-- Generate query for partion create.
		query := format('CREATE TABLE IF NOT EXISTS price_markdown.%1$s PARTITION OF price_markdown.%2$s FOR VALUES IN (%3$s)', partition_table_name, _table_name, _strategy_id::text);
		raise notice 'partition create query :  %', query;
		execute query;

		-- Generate query for create index.
		query := format('CREATE UNIQUE INDEX IF NOT EXISTS %1$s_strategy_id_product_level_id_sto_idx ON price_markdown.%1$s USING btree(strategy_id ASC NULLS LAST, product_level_id ASC NULLS LAST, store_level_id ASC NULLS LAST, pcd_id ASC NULLS LAST)', partition_table_name);
		raise notice 'create index query : %', query;
		execute query;
    end;
$function$
;
