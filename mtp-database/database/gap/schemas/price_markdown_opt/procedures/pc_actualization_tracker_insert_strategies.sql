--liquibase formatted sql
--changeset liquibase:pc_actualization_tracker_insert_strategies_v111124 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_actualization_tracker_insert_strategies

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_actualization_tracker_insert_strategies(IN _actualization_tracker text, IN _tb_strategy_master text, IN _process_execution_tracker text);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_actualization_tracker_insert_strategies(IN _actualization_tracker text, IN _tb_strategy_master text, IN _process_execution_tracker text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_insert_actualization_tracker_query text;
BEGIN
    -- Truncate the actualization_tracker table
    _insert_actualization_tracker_query = format('TRUNCATE %1$s;

    INSERT INTO %1$s (strategy_id, strategy_name, actualization_flag, actualization_date)
        SELECT strategy_id, strategy_name, 0 as actualization_flag, current_date as actualization_date
        FROM %2$s
        WHERE status in (2,3,4,6) AND
        (SELECT updated_date
         FROM %3$s bp
         WHERE process_name = ''trans_date'')
        BETWEEN start_date AND end_date;',
        _actualization_tracker, _tb_strategy_master, _process_execution_tracker
    );
  raise notice '_insert_actualization_tracker_query : %', _insert_actualization_tracker_query;
  execute _insert_actualization_tracker_query;
END;
$procedure$
;
