--liquibase formatted sql
--changeset surya.avinash@impactanalytics.com:pc_insert_suggested_rules runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_insert_suggested_rules

drop procedure if exists price_markdown_opt.pc_insert_suggested_rules;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_insert_suggested_rules(IN _strategy_id integer, IN _temp_suggested_rules_table text, IN _pcd_count integer)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _insert_suggested_rules_query TEXT;
BEGIN
    _insert_suggested_rules_query = FORMAT('Delete from price_markdown.tb_strategy_suggested_rules
											where strategy_id = %1$s;

											with suggested_rules
											as
											(
											select b.strategy_id, constraint_id,
											case when constraint_id = 1 then 5
													when constraint_id = 2 then 5
														when constraint_id = 4 then 1
														when constraint_id = 6 then 1
														when constraint_id = 18 then 5
											end as min_value,
											case when constraint_id = 1 then 95
													when constraint_id = 2 then 50
														when constraint_id = 4 then %3$s
														when constraint_id = 6 then %3$s
														when constraint_id = 18 then 95
											end as max_value,
											array[]::integer[] as applicable_value,
											st_diff as objective_improvement
											from %2$s a
											join price_markdown.tb_strategy_rule b
											using(priority)
											where strategy_id = %1$s
											)
											insert into price_markdown.tb_strategy_suggested_rules
											select * from suggested_rules;
											', _strategy_id, _temp_suggested_rules_table, _pcd_count);
	raise notice '_insert_suggested_rules_query : %', _insert_suggested_rules_query;

	execute _insert_suggested_rules_query;
END;
$procedure$
;
