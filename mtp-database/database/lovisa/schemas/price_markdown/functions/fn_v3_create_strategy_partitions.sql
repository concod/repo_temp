--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_create_strategy_partitions-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_create_strategy_partitions-1
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_create_strategy_partitions;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_create_strategy_partitions(p_strategy_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
	declare
		query text;
	begin
		
		query = format('
					CREATE TABLE if not exists price_markdown.tb_strategy_sku_store_mapping_%1$s
					PARTITION OF price_markdown.tb_strategy_sku_store_mapping 
					FOR VALUES IN (%1$s)
				', p_strategy_id);
		
		execute query;	
	end;
$function$
;
