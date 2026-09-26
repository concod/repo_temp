--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_ia_validation_for_ia_reco_decline runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: created fn_ia_validation_for_ia_reco_decline

DROP FUNCTION if exists price_markdown.fn_ia_validation_for_ia_reco_decline;

CREATE OR REPLACE FUNCTION price_markdown.fn_ia_validation_for_ia_reco_decline(payload jsonb, in_user_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
	strategy_ids integer[];
	temp_query text := '';
	total_time_taken integer;
	is_data boolean;

begin

temp_query := 'drop table if exists tmp_payload;';

execute temp_query;

temp_query := Format(
	'create temp table tmp_payload as (
	select * from json_to_recordset(%L) as d(strategy_id int, product_level_id int, store_level_id int, pcd_id int)
	)',
payload
        );

execute temp_query;

raise notice 'SQL 1 statement: %',
temp_query;

temp_query := 'select array_agg(distinct strategy_id) from tmp_payload';

execute temp_query
into
	strategy_ids;

temp_query := 'drop table if exists input_data_1;';

execute temp_query;

temp_query := format('create temp table input_data_1 as (
				select
				tp.strategy_id, tp.product_level_id, ts.store_level_id, tp.pcd_id, ts.markdown_percentage
				from tmp_payload tp left join price_markdown.tb_strategy_discount_ia ts
				on
				    tp.strategy_id = ts.strategy_id and
				    tp.product_level_id = ts.product_level_id and
				    tp.store_level_id = ts.store_level_id and
				    tp.pcd_id = ts.pcd_id
				where tp.strategy_id = any(%1$L)
			);',
strategy_ids);

execute temp_query;

temp_query := 'drop table if exists temp_1;';

execute temp_query;

temp_query := Format('
					create temp table temp_1 as (
					select
					    sd.strategy_id
					from price_markdown.tb_strategy_discount as sd
					join input_data_1 as input_data
					    on
                            sd.strategy_id = input_data.strategy_id
                            and sd.product_level_id = input_data.product_level_id
                            and sd.pcd_id = input_data.pcd_id
                            and sd.store_level_id = input_data.store_level_id
					where sd.strategy_id = ANY(%L) and input_data.markdown_percentage is not null
					);',
strategy_ids
				);

execute temp_query;

temp_query = 'select exists (select 1 from temp_1 limit 1);';

execute temp_query into is_data;

return is_data;

end;

$function$
;
