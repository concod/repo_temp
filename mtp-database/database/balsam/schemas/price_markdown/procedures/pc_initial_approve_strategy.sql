--liquibase formatted sql
--changeset liquibase:pc_initial_approve_strategy_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pc_initial_approve_strategy_1
--rollback: SELECT 1

DROP PROCEDURE if exists price_markdown.pc_initial_approve_strategy();
CREATE OR REPLACE PROCEDURE price_markdown.pc_initial_approve_strategy(IN p_strategy_id integer, IN p_selected_product_level_ids integer[], IN p_unselected_product_level_ids integer[], IN p_pcd_ids integer[], IN p_user_id integer)
 LANGUAGE plpgsql
AS $procedure$
	begin
		call price_markdown.pc_trim_parent_strategy(p_strategy_id);

        if (
            coalesce(array_length(p_selected_product_level_ids,1),0) = 0
            and coalesce(array_length(p_unselected_product_level_ids,1),0) = 0
        )
        then
            update price_markdown.tb_strategy_discount
            set approval_status = 'Initially Approved'::price_markdown.strategy_approval_status_enum
            where strategy_id = p_strategy_id and pcd_id = any(p_pcd_ids);

        elsif coalesce(array_length(p_selected_product_level_ids,1),0) != 0 then
            update price_markdown.tb_strategy_discount
            set approval_status = 'Initially Approved'::price_markdown.strategy_approval_status_enum
            where strategy_id = p_strategy_id and product_level_id = any(p_selected_product_level_ids)
            and pcd_id = any(p_pcd_ids)
            ;

        else
            update price_markdown.tb_strategy_discount
            set approval_status = 'Initially Approved'::price_markdown.strategy_approval_status_enum
            where strategy_id = p_strategy_id and not(product_level_id = any(p_unselected_product_level_ids))
            and pcd_id = any(p_pcd_ids);

        end if;

		update price_markdown.tb_strategy_master
        set status  = 2,updated_by = p_user_id
        where strategy_id = p_strategy_id;

	exception
		when others then
            -- Handle the exception here or re-raise it
            raise notice 'Exception caught: %', SQLERRM;
	end;
$procedure$
;
