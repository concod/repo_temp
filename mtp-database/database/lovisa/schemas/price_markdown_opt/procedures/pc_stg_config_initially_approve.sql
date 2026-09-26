--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.com:pc_stg_config_initially_approve_26112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_stg_config_initially_approve

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_stg_config_initially_approve(int4);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_stg_config_initially_approve(IN _strategy_id integer,  IN _currency_type text)
 LANGUAGE plpgsql
  SECURITY DEFINER
AS $procedure$
declare update_stg_disc_query text;
   		update_stg_master_query text;
begin
	update_stg_master_query = 'update price_markdown.tb_strategy_master
							set status = 1, is_optimisation_running = false
							where strategy_id = $1;';
	raise notice 'Update strategy master query : %', update_stg_master_query;
	execute update_stg_master_query using _strategy_id;
	raise notice 'Strategy is Initially approved in Strategy master table';

	  update_stg_disc_query := format('
        UPDATE price_markdown.tb_strategy_discount_%2$s
        SET approval_status = ''Initially Approved''::price_markdown.strategy_approval_status_enum
        WHERE strategy_id = %1$s;', _strategy_id, _currency_type);

    RAISE NOTICE 'Update strategy discount query: %', update_stg_disc_query;
    EXECUTE update_stg_disc_query ;
    RAISE NOTICE 'Strategy is initially approved in tb_strategy_discount_%', _currency_type;
END;
$procedure$
;