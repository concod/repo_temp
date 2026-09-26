--liquibase formatted sql
--changeset liquibase:pc_clear_strategy_metrics-3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added security definer


DROP PROCEDURE IF EXISTS price_markdown.pc_clear_strategy_metrics();
CREATE OR REPLACE PROCEDURE price_markdown.pc_clear_strategy_metrics(IN p_strategy_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare
		metric varchar;
	begin
		delete from price_markdown.tb_strategy_discount_ia where strategy_id = p_strategy_id;
		for metric in select unnest(array['ia','actual','fin'])
		loop
			begin
				raise notice 'drop table %' ,FORMAT('price_markdown.tb_agg_%s_%s',metric,p_strategy_id::text);
				raise notice 'drop table %' ,FORMAT('price_markdown.tb_ssd_%s_%s',metric,p_strategy_id::text);
				execute 'drop table ' || FORMAT('price_markdown.tb_ssd_%s_%s',metric,p_strategy_id::text);
				execute 'drop table ' || FORMAT('price_markdown.tb_agg_%s_%s',metric,p_strategy_id::text);

			exception
				when sqlstate '42P01' then
					raise notice 'exception handled %', metric;
					continue;
			end;
		end loop;

        delete from price_markdown.tb_strategy_date_metrics_fin
        where strategy_id = p_strategy_id;

        delete from price_markdown.tb_strategy_date_metrics_ia
        where strategy_id = p_strategy_id;

        delete from price_markdown.tb_approval_metrics
        where strategy_id = p_strategy_id;

        delete from price_markdown.tb_stg_metric
        where strategy_id = p_strategy_id;

	end;
$procedure$
;
