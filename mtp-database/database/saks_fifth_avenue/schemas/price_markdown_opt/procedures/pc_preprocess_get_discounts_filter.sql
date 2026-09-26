--liquibase formatted sql
--changeset liquibase:pc_preprocess_get_discounts_filter_v191224 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_get_discounts_filter

drop procedure if exists price_markdown_opt.pc_preprocess_get_discounts_filter;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_discounts_filter(IN _discounts_filter_table text, IN _strategy_id integer, IN _stg_start_date date)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_discounts_filter_query text;
begin
	_discounts_filter_query = FORMAT('DROP TABLE IF EXISTS %1$s;
									CREATE TABLE %1$s as
									(
									with fut_pcds as
									(
									select pcd_id from price_markdown.tb_strategy_pcd
									where strategy_id = %2$s
		                            and pcd_start_date >= ''%3$s''
		                            group by 1
									),
									reco_disc_base as
									(
									select distinct * from
									(
									select product_level_id, markdown_percentage
									from price_markdown.tb_strategy_discount_%2$s
									join fut_pcds
									using(pcd_id)
									where is_locked = 1
									group by 1,2
									) fd
									union
									(
									select product_level_id, markdown_percentage
									from price_markdown.tb_strategy_discount_%2$s
									where pcd_id not in (select pcd_id from fut_pcds)
									and (is_locked = 1 or approval_status = ''Finally Approved'')
									group by 1,2
									)
									),
									reco_disc as
									(
									select product_id, markdown_percentage from reco_disc_base d
									join price_markdown.tb_strategy_sku_store_mapping_%2$s ssm
									on d.product_level_id = ssm.product_level_id
									group by 1,2
									),
									app_disc as
									(select * from
									(select distinct product_id from price_markdown.tb_strategy_sku_store_mapping_%2$s) a,
									(SELECT UNNEST(applicable_value) AS markdown_percentage
									                        FROM price_markdown.tb_strategy_rule a1
									                        INNER JOIN (
									                            SELECT rule_id, rule_type
									                            FROM price_markdown.tb_rule_master trm
									                        ) a2
									                        ON a1.constraint_id = a2.rule_id
									                        WHERE strategy_id = %2$s
									                        AND rule_type = 47
									                        AND status = 0) b
									                        )
									select distinct * from
									(select * from reco_disc
									union
									select * from app_disc) d
									group by 1,2);', _discounts_filter_table, _strategy_id, _stg_start_date);
	raise notice '_discounts_filter_query: %', _discounts_filter_query;
	execute _discounts_filter_query;
end;
$procedure$
;
