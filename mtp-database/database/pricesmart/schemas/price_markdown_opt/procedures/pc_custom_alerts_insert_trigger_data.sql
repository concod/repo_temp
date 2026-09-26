--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:pc_custom_alerts_insert_trigger_data_v020425 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: schema change for pc_custom_alerts_insert_trigger_data_3

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_custom_alerts_insert_trigger_data;
CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_custom_alerts_insert_trigger_data(IN _strategy_id integer, IN _trigger_data_table_name text, IN _pcd_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_previous_pcd_id integer;
	_insert_trigger_data_query text;
BEGIN

	select pcd_id from price_markdown.tb_strategy_pcd
	where strategy_id = _strategy_id
	and pcd_start_date = (select max(pcd_start_date) from price_markdown.tb_strategy_pcd
						where strategy_id = _strategy_id and pcd_start_date < (select pcd_start_date from price_markdown.tb_strategy_pcd
																				where strategy_id = _strategy_id and pcd_id = _pcd_id)
						) into _previous_pcd_id;

    _insert_trigger_data_query = format(';
	DELETE FROM %1$s
	WHERE strategy_id = %2$s
	AND current_pcd_id = %3$s;

    INSERT INTO %1$s
	with
	achieved_metrics as
	(
	select strategy_id, coalesce(sum(sales_units)*100/nullif((sum(sales_units) + max(rem_inv)),0),0) as st_perc,
	sum(margin) as gm,
	coalesce((sum(margin)/nullif(sum(revenue),0)),0) * 100 as gm_perc
	from price_markdown.tb_ssd_actual_%2$s
	where pcd_id = %4$s
	group by 1
	),
	alerts_data as
	(
	select strategy_id, alert_id, logical_operator,
	concat(logical_operator, '' '', case when metric_id = 2 then gm
	when metric_id = 3 then gm_perc
	else st_perc end, '' '', c.operator_name, '' '', threshold_value) as chk
	from (select * from price_markdown.tb_custom_alerts_strategy_mapping
			where strategy_id = %2$s
			and is_deleted = false) a
	join price_markdown.tb_custom_alerts_metrics b
	using(alert_id)
	join price_markdown.tb_custom_alerts_operator_config c
	on b.operator_id = c.operator_id
	and strategy_id = %2$s
	and %4$s <= measured_by
	join achieved_metrics am
	using(strategy_id)
	group by 1,2,3,4
	)
	select alert_id, strategy_id, %3$s as current_pcd_id, %4$s as measured_by,
	case when
		(select * from price_markdown_opt.fn_custom_alerts_condition_check(alert_condition_chk))
			then 1 else 0 end as display_alert_flag,
	current_date as triggered_on, alert_condition_chk, 0 as is_notification_sent
	from (
		select alert_id, strategy_id,
		string_agg(chk, '' '' order by logical_operator desc) as alert_condition_chk
		from alerts_data
		group by 1,2) a; ',
    _trigger_data_table_name, _strategy_id, _pcd_id, _previous_pcd_id
    );
  raise notice '_insert_trigger_data_query : %', _insert_trigger_data_query;
  execute _insert_trigger_data_query;
END;
$procedure$
;
