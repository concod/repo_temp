--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:pc_strategy_sync_tracker_insert_strategies_v111124 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_strategy_sync_tracker_insert_strategies

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_strategy_sync_tracker_insert_strategies(
    IN _strategy_sync_tracker TEXT,
    IN _tb_strategy_master TEXT
);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_strategy_sync_tracker_insert_strategies(
    IN _strategy_sync_tracker TEXT,
    IN _tb_strategy_master TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_insert_stg_sync_tracker_query text;
BEGIN

    _insert_stg_sync_tracker_query = format('TRUNCATE %1$s;

		INSERT INTO %1$s (strategy_id, strategy_name, strategy_sync_flag_ia, strategy_sync_flag_fin, strategy_sync_date)
         SELECT strategy_id, strategy_name, 0 AS strategy_sync_flag_ia, 0 AS strategy_sync_flag_fin,
		 current_date AS strategy_sync_date
         FROM %2$s
         WHERE status IN (1, 2, 3, 6, 7)
         AND current_date < end_date;',
        _strategy_sync_tracker,
        _tb_strategy_master
    );
   raise notice '_insert_stg_sync_tracker_query : %', _insert_stg_sync_tracker_query;
  execute _insert_stg_sync_tracker_query;
END;
$procedure$;