--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_lock_entire_strategy_discounts-4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: caching improvement changes
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_lock_entire_strategy_discounts;
CREATE OR REPLACE FUNCTION price_markdown.fn_lock_entire_strategy_discounts(_strategy_id integer, _action text, p_pcd_id integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    temp_table_name TEXT;
    action_value INT;
    pcd_where_str text;
    insert_pcd_str text;
    is_draft_present bool;
BEGIN
    temp_table_name := 'temp_strategy_discount_table_' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISSMS');
   	IF _action = 'lock' THEN
        action_value := 1;
    ELSIF _action = 'unlock' THEN
        action_value := 0;
    end if;

   IF p_pcd_id IS NOT NULL then
       pcd_where_str := ' and pcd_id = '|| p_pcd_id::text ;
       insert_pcd_str := p_pcd_id::text;
   else
  	   pcd_where_str := '';
       insert_pcd_str := 'pcd_id';
   end if;
    -- Locking tb_strategy_discount
    EXECUTE 'CREATE TEMP TABLE ' || temp_table_name || ' AS SELECT * FROM price_markdown.tb_strategy_discount where strategy_id = ' || _strategy_id::text || pcd_where_str;
   	EXECUTE 'DELETE FROM price_markdown.tb_strategy_discount where strategy_id = ' || _strategy_id::text || pcd_where_str;
    EXECUTE 'INSERT INTO price_markdown.tb_strategy_discount (
            strategy_id,
            product_level_value, store_level_value, pcd_id, markdown_percentage,
            is_locked,created_at, created_by,updated_by, product_level_id, store_level_id, 
            previous_pcd_id,previous_markdown_percentage,approval_status, channel_info, average_retail_price,
            markdown_type,incremental_discount,action_status, currency_id, average_retail_price_with_vat
        )
        select ' || _strategy_id::text
                ||', product_level_value, store_level_value, ' || insert_pcd_str ||', markdown_percentage, '
                || action_value::text || ', created_at, created_by,updated_by, product_level_id, store_level_id, previous_pcd_id,
                previous_markdown_percentage, approval_status,channel_info, average_retail_price,
                markdown_type,incremental_discount,action_status, currency_id, average_retail_price_with_vat
        from ' || temp_table_name
        ;

    raise notice 'query: %',format(
        '
            update price_markdown_temp.tb_strategy_step4_full_%1$s
            set pcd_metrics = price_markdown.fn_update_strategy_simulation_results_json(
                pcd_metrics,
                %2$L::int[],
                %3$s::jsonb
            )
        ',
        _strategy_id,
        case when p_pcd_id is null then array(
            select pcd_id from price_markdown.tb_strategy_pcd where strategy_id = _strategy_id
            and pcd_start_date > date(timezone(
							(select
								remarks
							from
								metaschema.tb_app_sub_master
							where
								name = 'client_timezone'),
							now())
                        )
            )
        else 
            array[p_pcd_id]::int[]
        end,
        case 
            when _action= 'lock' then '{"is_locked" :1}'
            else '{"is_locked": 0}'
        end
    );

    EXECUTE format(
        '
            update price_markdown_temp.tb_strategy_step4_full_%1$s
            set pcd_metrics = price_markdown.fn_update_strategy_simulation_results_json(
                pcd_metrics,
                %2$L::int[],
                ''%3$s''::jsonb
            )
        ',
        _strategy_id,
        case when p_pcd_id is null then array(
            select pcd_id from price_markdown.tb_strategy_pcd where strategy_id = _strategy_id
            and pcd_start_date > date(timezone(
							(select
								remarks
							from
								metaschema.tb_app_sub_master
							where
								name = 'client_timezone'),
							now())
                        )
            )
        else 
            array[p_pcd_id]::int[]
        end,
        case 
            when _action= 'lock' then '{"is_locked" :1}'
            else '{"is_locked": 0}'
        end
    );

	-- Droping Temp Table
    EXECUTE 'DROP TABLE ' || temp_table_name;
   	return 'Action Successful' as status;
end;
$function$
;
