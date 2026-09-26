--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:fn_update_approval_status runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Updated fn_update_approval_status

DROP FUNCTION if exists price_markdown.fn_update_approval_status;

CREATE OR REPLACE FUNCTION price_markdown.fn_update_approval_status(cta_action text, payload jsonb, in_user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	vl_test_query text := '';

begin
	vl_test_query := 'drop table if exists tmp_payload;';

execute vl_test_query;

vl_test_query := Format(
	'create temp table tmp_payload as (
	select * from json_to_recordset(%L) as d(strategy_id int, product_level_id int, store_level_id int, pcd_id int)
	)',
payload
        );

execute vl_test_query;
RAISE NOTICE 'query: %', vl_test_query;

if cta_action = 'approve' then

	vl_test_query := 'update
						price_markdown.tb_approval_metrics
					set
						status = ''Finally Approved''::price_markdown.strategy_approval_status_enum,
						action_status = ''Approved''::price_markdown.action_status_enum
					where
						status = ''Initially Approved'' and
						(strategy_id,
						pcd_id,
						store_level_id,
						product_level_id) in (
							select
								strategy_id,
								pcd_id,
								store_level_id,
								product_level_id
							from
								tmp_payload
					        );';
	execute vl_test_query;
	RAISE NOTICE 'query: %', vl_test_query;

	vl_test_query := format('update
						price_markdown.tb_strategy_discount
					set
						approval_status = ''Finally Approved''::price_markdown.strategy_approval_status_enum,
						action_status = ''Approved''::price_markdown.action_status_enum,
						updated_at = now(),
						updated_by = %1$L::integer
					where
						approval_status = ''Initially Approved'' and
						(strategy_id,
						pcd_id,
						store_level_id,
						product_level_id) in (
							select
								strategy_id,
								pcd_id,
								store_level_id,
								product_level_id
							from
								tmp_payload
							);', in_user_id);
	execute vl_test_query;
	RAISE NOTICE 'query: %', vl_test_query;

	vl_test_query := format('update
						price_markdown.tb_strategy_master
					set
						status = 2,
						updated_at = now(),
						updated_by = %1$L::integer
					where
						strategy_id
						in (select
								strategy_id
							from
								tmp_payload
							)
						and status not in (3);', in_user_id);
	execute vl_test_query;
	RAISE NOTICE 'query: %', vl_test_query;

elsif cta_action = 'withdraw' then

	vl_test_query := 'update
						price_markdown.tb_approval_metrics
					set
						status = ''Initially Approved''::price_markdown.strategy_approval_status_enum,
						action_status = ''Withdrawn''::price_markdown.action_status_enum
					where
						status = ''Finally Approved'' and
						(strategy_id,
						pcd_id,
						store_level_id,
						product_level_id) in (
							select
								strategy_id,
								pcd_id,
								store_level_id,
								product_level_id
							from
								tmp_payload
						    );';

	execute vl_test_query;
	RAISE NOTICE 'query: %', vl_test_query;

	vl_test_query := format('update
						price_markdown.tb_strategy_discount
					set
						approval_status = ''Initially Approved''::price_markdown.strategy_approval_status_enum,
						action_status = ''Withdrawn''::price_markdown.action_status_enum,
						updated_at = now(),
						updated_by = %1$L::integer
					where
						approval_status = ''Finally Approved'' and
						(strategy_id,
						pcd_id,
						store_level_id,
						product_level_id) in (
							select
								strategy_id,
								pcd_id,
								store_level_id,
								product_level_id
							from
								tmp_payload
			        );', in_user_id);
	execute vl_test_query;
	RAISE NOTICE 'query: %', vl_test_query;

	vl_test_query := format('with strategy_approval_status as (
					    select
					        ta.strategy_id,
					        max(case when ta.status = ''Finally Approved''::price_markdown.strategy_approval_status_enum then 1 else 0 end) AS has_final_approval
					    from
					        price_markdown.tb_approval_metrics ta
					    where strategy_id in (
							select distinct strategy_id from tmp_payload
						)
					    group by
					        ta.strategy_id
					)
					update
					    price_markdown.tb_strategy_master ts
					set
					    status = case
					                when sas.has_final_approval = 1 then 2
					                else 1
					             end,
						updated_at = now(),
						updated_by = %1$L::integer
					from
					    strategy_approval_status sas
					where
					    ts.strategy_id = sas.strategy_id
						and ts.status not in (3)
;', in_user_id);
	execute vl_test_query;
	RAISE NOTICE 'query: %', vl_test_query;

end if;
return 1;
end;
$function$
;
