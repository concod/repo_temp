--liquibase formatted sql
--changeset liquibase:pc_reoptimize_tracker_insert_strategies_v111124 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_reoptimize_tracker_insert_strategies

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_reoptimize_tracker_insert_strategies;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_reoptimize_tracker_insert_strategies(IN _reoptimize_tracker text, IN _tb_strategy_master text, IN _strategy_pcd text, IN _reopti_day_extend integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_insert_reopti_tracker_query text;
BEGIN
    -- Truncate the target table
    _insert_reopti_tracker_query = format('TRUNCATE %1$s;

        INSERT INTO %1$s (strategy_id, strategy_name, reoptimize_flag, reoptimize_date)
         SELECT tsm.strategy_id, tsm.strategy_name, 0 AS reoptimize_flag, current_date AS reoptimize_date
         FROM %2$s tsm
         WHERE tsm.strategy_id IN (
             SELECT DISTINCT tsp.strategy_id
             FROM %3$s tsp
             WHERE tsp.strategy_id IN (
                 SELECT tsm.strategy_id
                 FROM %2$s tsm
                 WHERE tsm.status IN (1, 2, 3, 6, 7)
                 AND tsm.end_date >= current_date + INTERVAL ''%4$s days''
             )
             AND tsp.pcd_start_date > current_date + INTERVAL ''%4$s days''
         );',
        _reoptimize_tracker,
        _tb_strategy_master,
        _strategy_pcd,
        _reopti_day_extend
    );
   raise notice '_insert_reopti_tracker_query : %', _insert_reopti_tracker_query;
  execute _insert_reopti_tracker_query;
END;
$procedure$
;
