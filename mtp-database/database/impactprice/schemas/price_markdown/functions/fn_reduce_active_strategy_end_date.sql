--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_reduce_active_strategy_end_date-3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_strategy_pcd_new migration + tb_strategy_discount_level pcd_data JSONB key removal

drop function if exists price_markdown.fn_reduce_active_strategy_end_date;
CREATE OR REPLACE FUNCTION price_markdown.fn_reduce_active_strategy_end_date(
    p_strategy_id int,
    p_end_date date
)
 RETURNS int
 LANGUAGE plpgsql
AS $function$
    declare
        _metric_type text;
        _query text;
	begin

        update price_markdown.tb_strategy_master
            set end_date = p_end_date
        where strategy_id = p_strategy_id;

        delete from price_markdown.tb_strategy_pcd_new
        where strategy_id = p_strategy_id
        and pcd_start_date > p_end_date;

        update price_markdown.tb_strategy_pcd_new
        set pcd_end_date = p_end_date
        where strategy_id = p_strategy_id
        and pcd_end_date = (
            select max(pcd_end_date)
            from price_markdown.tb_strategy_pcd_new
            where strategy_id = p_strategy_id
        );

        -- OLD: delete from old discount tables where pcd_id no longer exists (mark for future removal)
        delete from price_markdown.tb_strategy_discount
        where strategy_id = p_strategy_id
        and pcd_id not in (select pcd_id from price_markdown.tb_strategy_pcd_new where strategy_id = p_strategy_id);

        delete from price_markdown.tb_strategy_discount_ia
        where strategy_id = p_strategy_id
        and pcd_id not in (select pcd_id from price_markdown.tb_strategy_pcd_new where strategy_id = p_strategy_id);

        -- NEW: remove order_number keys from tb_strategy_discount_level pcd_data/ia_pcd_data
        -- that no longer correspond to existing PCDs after end-date reduction
        _query = format(
            'UPDATE price_markdown.tb_strategy_discount_level_%1$s dl
             SET pcd_data = (
                 SELECT CASE WHEN count(*) = 0 THEN NULL
                        ELSE jsonb_object_agg(e.key, e.value) END
                 FROM jsonb_each(dl.pcd_data) e
                 WHERE e.key::int IN (SELECT order_number FROM price_markdown.tb_strategy_pcd_new WHERE strategy_id = %1$s)
             ),
             ia_pcd_data = (
                 SELECT CASE WHEN count(*) = 0 THEN NULL
                        ELSE jsonb_object_agg(e.key, e.value) END
                 FROM jsonb_each(dl.ia_pcd_data) e
                 WHERE e.key::int IN (SELECT order_number FROM price_markdown.tb_strategy_pcd_new WHERE strategy_id = %1$s)
             )
             WHERE dl.strategy_id = %1$s AND (dl.pcd_data IS NOT NULL OR dl.ia_pcd_data IS NOT NULL)',
            p_strategy_id
        );
        execute _query;

        for _metric_type in (select unnest(array['ia','fin']))
        loop
            _query = format(
                '
                    delete from price_markdown.tb_agg_%1$s
                    where recommendation_date > ''%3$s'' and strategy_id = %2$s;
                    delete from price_markdown.tb_ssd_%1$s
                    where recommendation_date > ''%3$s'' and strategy_id = %2$s;
                ',
                _metric_type,
                p_strategy_id,
                p_end_date
            );
            execute _query;
        end loop;


        delete from price_markdown.tb_strategy_date_metrics_fin
        where strategy_id = p_strategy_id
            and recommendation_date > p_end_date;

        delete from price_markdown.tb_strategy_date_metrics_ia
        where strategy_id = p_strategy_id
            and recommendation_date > p_end_date;

        call price_markdown_opt.pc_insert_approval_metrics(p_strategy_id);

        call price_markdown_opt.pc_insert_stg_metric(p_strategy_id);

        return 1;

	end;
$function$
;
