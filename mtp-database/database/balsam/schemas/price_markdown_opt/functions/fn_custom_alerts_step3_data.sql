--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_custom_alerts_step3_data_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_custom_alerts_step3_data_1

drop FUNCTION if exists price_markdown_opt.fn_custom_alerts_step3_data;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_custom_alerts_step3_data(_strategy_id integer, _level text, _product_level_id integer DEFAULT NULL::integer, _store_level_id integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    _alerts_query text;
    _product_level_col text;
   _store_level_col text;
   _product_master_query text;
  _store_master_query text;
   _start_time text;
begin
	_start_time = to_char(clock_timestamp(), 'YYYYMMDD_HH24MISSMS');
   raise notice 'start time : %', _start_time;

    IF _level = 'default' THEN
        _product_level_col := 'product_level_id';
       			_store_level_col := 'store_level_id';
       _product_master_query := ' ';
      _store_master_query := ' ';

     elsif _product_level_id = -200 and _store_level_id = -200
    	then 	_product_level_col := '-200';
       			_store_level_col := '-200';
       			_product_master_query := ' ';
      			_store_master_query := ' ';

      elsif _product_level_id = -200 and _store_level_id != -200
      	then 	_product_level_col := '-200';
       			_store_level_col := 's' || _store_level_id::text || '_id';
       			_product_master_query := ' ';
      			_store_master_query := 'join (select store_id,  s' || _store_level_id::text || '_id from global.tb_store_master) c
										using(store_id)';

	 elsif _product_level_id != -200 and _store_level_id = -200
      	then 	_product_level_col := 'l' || _product_level_id::text || '_cid';
       			_store_level_col := '-200';
       			_product_master_query := 'join (select product_id, l' || _product_level_id::text || '_cid from price_markdown.product_master) b
										 using(product_id)';
      			_store_master_query := ' ';

    ELSE
        _product_level_col := 'l' || _product_level_id::text || '_cid';
       _store_level_col := 's' || _store_level_id::text || '_id';
       _product_master_query := 'join (select product_id, l' || _product_level_id::text || '_cid from price_markdown.product_master) b
										 using(product_id)';
	   _store_master_query := 'join (select store_id,  s' || _store_level_id::text || '_id from global.tb_store_master) c
										using(store_id)';

    END IF;

    _alerts_query := FORMAT('
		CREATE TEMP TABLE tb_step3_custom_alerts_%1$s_%6$s as
        WITH
		alerts as
		(
		select strategy_id, alert_id, display_alert, measured_by, severity_id
		from price_markdown.tb_custom_alerts_trigger_data a
		join (select strategy_id, alert_id, max(measured_by) measured_by
		from price_markdown.tb_custom_alerts_trigger_data
		where strategy_id = %1$s
		group by 1,2) b
		using(strategy_id, alert_id, measured_by)
		join price_markdown.tb_custom_alerts_master tcam
		using(alert_id)
		where display_alert = 1
		),
        achieved_metrics AS (
            SELECT
                strategy_id,
                %2$s, %3$s,
                COALESCE(SUM(sales_units) * 100 / NULLIF(SUM(inventory), 0), 0) AS st_perc,
                SUM(margin) AS gm,
                COALESCE((SUM(margin) / NULLIF(SUM(revenue), 0)), 0) * 100 AS gm_perc
            FROM price_markdown.tb_custom_alerts_trigger_base_data_%1$s
			%4$s
			%5$s
            WHERE pcd_id in (select distinct measured_by from alerts)
            GROUP BY 1,2,3
        ),
        alerts_data AS (
            SELECT
                strategy_id,
                %2$s, %3$s,
                alert_id,
				severity_id,
				measured_by,
                logical_operator,
                CONCAT(logical_operator, '' '',
                    CASE
                        WHEN metric_id = 2 THEN gm
                        WHEN metric_id = 3 THEN gm_perc
                        ELSE st_perc
                    END,
                    '' '', c.operator_name, '' '', threshold_value) AS chk
            FROM alerts a
            JOIN price_markdown.tb_custom_alerts_metrics b USING (alert_id)
            JOIN price_markdown.tb_custom_alerts_operator_config c
              ON b.operator_id = c.operator_id
            JOIN achieved_metrics am USING (strategy_id)
            GROUP BY 1,2,3,4,5,6,7,8
        ),
		base as
		(
        SELECT
            alert_id,
            strategy_id,
            %2$s, %3$s,
			severity_id,
            measured_by,
            CASE WHEN (SELECT * FROM price_markdown_opt.fn_custom_alerts_condition_check(alert_condition_chk)) THEN 1 ELSE 0 END AS display_alert_flag,
            CURRENT_DATE AS triggered_on,
            alert_condition_chk
        FROM (
            SELECT
                alert_id,
                strategy_id, severity_id, measured_by,
                %2$s, %3$s,
                STRING_AGG(chk, '' '' ORDER BY logical_operator DESC) AS alert_condition_chk
            FROM alerts_data
            GROUP BY 1,2,3,4,5,6
        ) a
		)
		select strategy_id, %2$s as product_level_id, %3$s as store_level_id, severity_id, array_agg(distinct alert_id) as alert_ids
        from base
        where display_alert_flag = 1
        group by 1,2,3,4;
    ', _strategy_id, _product_level_col, _store_level_col, _product_master_query, _store_master_query, _start_time);

    raise notice '_alerts_query : %', _alerts_query;

    EXECUTE _alerts_query;
   RETURN  format('tb_step3_custom_alerts_%1$s_%2$s', _strategy_id, _start_time);
END;
$function$
;
