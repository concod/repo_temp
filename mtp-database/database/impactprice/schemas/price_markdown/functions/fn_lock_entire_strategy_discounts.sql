--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_lock_entire_strategy_discounts-6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: remove old tb_strategy_discount update, pass strategy_id to simulation results fn
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_lock_entire_strategy_discounts;
CREATE OR REPLACE FUNCTION price_markdown.fn_lock_entire_strategy_discounts(_strategy_id integer, _action text, p_pcd_id integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    action_value INT;
    _pcd_ids_to_lock int[];
BEGIN
   	IF _action = 'lock' THEN
        action_value := 1;
    ELSIF _action = 'unlock' THEN
        action_value := 0;
    end if;

    -- Determine which pcd_ids to lock/unlock
    IF p_pcd_id IS NOT NULL THEN
        _pcd_ids_to_lock := ARRAY[p_pcd_id];
    ELSE
        _pcd_ids_to_lock := array(
            SELECT pcd_id FROM price_markdown.tb_strategy_pcd_new WHERE strategy_id = _strategy_id
        );
    END IF;

    -- Update is_locked inside pcd_data JSONB for matching pcd_ids
    EXECUTE format(
        'UPDATE price_markdown.tb_strategy_discount_level_%1$s dl
         SET pcd_data = (
             SELECT jsonb_object_agg(
                 e.key,
                 CASE WHEN (e.value->>''pcd_id'')::int = ANY(%2$L::int[])
                      THEN jsonb_set(e.value, ''{is_locked}'', %3$s::text::jsonb)
                      ELSE e.value
                 END
             )
             FROM jsonb_each(dl.pcd_data) e
         )
         WHERE strategy_id = %1$s',
        _strategy_id,
        _pcd_ids_to_lock,
        action_value
    );

    EXECUTE format(
        '
            update price_markdown_temp.tb_strategy_step4_full_%1$s
            set pcd_metrics = price_markdown.fn_update_strategy_simulation_results_json(
                pcd_metrics,
                %2$L::int[],
                ''%3$s''::jsonb,
                %1$s
            )
        ',
        _strategy_id,
        _pcd_ids_to_lock,
        case 
            when _action= 'lock' then '{"is_locked" :1}'
            else '{"is_locked": 0}'
        end
    );

   	return 'Action Successful' as status;
end;
$function$
;
