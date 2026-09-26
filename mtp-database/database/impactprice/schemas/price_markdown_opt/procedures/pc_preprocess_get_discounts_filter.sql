--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co::pc_preprocess_get_discounts_filter_23032026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_get_discounts_filter_23032026

drop procedure if exists price_markdown_opt.pc_preprocess_get_discounts_filter;

create or replace procedure price_markdown_opt.pc_preprocess_get_discounts_filter(IN _discounts_filter_table text, IN _strategy_id integer)
LANGUAGE plpgsql
security definer
AS $procedure$
declare
	_discounts_filter_query text;
begin
	_discounts_filter_query = FORMAT('DROP TABLE IF EXISTS %1$s;
									CREATE TABLE %1$s as
									(
									with reco_disc_base as
									(
									select product_level_id, (pcd.value->>''markdown_percentage'')::numeric as markdown_percentage
									from price_markdown.tb_strategy_discount_level tsd
									CROSS JOIN LATERAL jsonb_each(tsd.pcd_data) AS pcd(key, value)
									where strategy_id = %2$s
									and (
										(pcd.value->>''is_locked'')::integer = 1
										or pcd.value->>''approval_status'' = ''Finally Approved''
									)
									group by 1,2
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
									select * from
									(select * from reco_disc
									union
									select * from app_disc) d
									group by 1,2);', _discounts_filter_table, _strategy_id);
	raise notice '_discounts_filter_query: %', _discounts_filter_query;
	execute _discounts_filter_query;
end;
$procedure$
;