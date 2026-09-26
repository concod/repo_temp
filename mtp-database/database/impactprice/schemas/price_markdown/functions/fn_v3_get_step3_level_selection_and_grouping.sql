--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_get_step3_level_selection_and_grouping-4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_get_step3_level_selection_and_grouping-4
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_get_step3_level_selection_and_grouping;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_get_step3_level_selection_and_grouping(_product_level integer, _store_level integer)
 RETURNS TABLE(product_select text, product_group_by text, store_select text, store_group_by text)
 LANGUAGE plpgsql
AS $function$
begin

    -- product level logic
    case _product_level 
		when 7 then 
            product_select := 'pm.product_id as product_level_id, pm.product_name as product_level_value,';
            product_group_by := 'pm.product_id, pm.product_name,';
        when 6 then 
            product_select := 'pm.customer_choice_id as product_level_id, pm.customer_choice_description as product_level_value,';
            product_group_by := 'pm.customer_choice_id, pm.customer_choice_description,';
        when 5 then 
            product_select := 'pm.l5_cid as product_level_id, pm.l5_cuq as product_level_value,';
            product_group_by := 'pm.l5_cid, pm.l5_cuq,';
        when 4 then 
            product_select := 'pm.l4_cid as product_level_id, pm.l4_cuq as product_level_value,';
            product_group_by := 'pm.l4_cid, pm.l4_cuq,';
        when 3 then 
            product_select := 'pm.l3_cid as product_level_id, pm.l3_cuq as product_level_value,';
            product_group_by := 'pm.l3_cid, pm.l3_cuq,';
        when 2 then 
            product_select := 'pm.l2_cid as product_level_id, pm.l2_cuq as product_level_value,';
            product_group_by := 'pm.l2_cid, pm.l2_cuq,';
        when 1 then 
            product_select := 'pm.l1_cid as product_level_id, pm.l1_cuq as product_level_value,';
            product_group_by := 'pm.l1_cid, pm.l1_cuq,';
        when 0 then 
            product_select := 'pm.l0_cid as product_level_id, pm.l0_cuq as product_level_value,';
            product_group_by := 'pm.l0_cid, pm.l0_cuq,';
        when -100 then 
            product_select := 'pg.pg_id as product_level_id, pg.pg_name as product_level_value,';
            product_group_by := 'pg.pg_id, pg.pg_name,';
		when -200 then 
            product_select := '-200 as product_level_id, ''overall'' as product_level_value,';
            product_group_by := '';
    end case;

    -- store level logic
    case _store_level 
        when 6 then 
            store_select := 'sm.store_id as store_level_id, sm.store_name as store_level_value,';
            store_group_by := 'sm.store_id, sm.store_name,';
        when 5 then 
            store_select := 'sm.s5_id as store_level_id, sm.s5_name as store_level_value,';
            store_group_by := 'sm.s5_id, sm.s5_name,';
        when 4 then 
            store_select := 'sm.s4_id as store_level_id, sm.s4_name as store_level_value,';
            store_group_by := 'sm.s4_id, sm.s4_name,';
        when 3 then 
            store_select := 'sm.s3_id as store_level_id, sm.s3_name as store_level_value,';
            store_group_by := 'sm.s3_id, sm.s3_name,';
        when 2 then 
            store_select := 'sm.s2_id as store_level_id, sm.s2_name as store_level_value,';
            store_group_by := 'sm.s2_id, sm.s2_name,';
        when 1 then 
            store_select := 'sm.s1_id as store_level_id, sm.s1_name as store_level_value,';
            store_group_by := 'sm.s1_id, sm.s1_name,';
        when 0 then 
            store_select := 'sm.s0_id as store_level_id, sm.s0_name as store_level_value,';
            store_group_by := 'sm.s0_id, sm.s0_name,';
        when -100 then 
            store_select := 'sg.sg_id as store_level_id, sg.sg_name as store_level_value,';
            store_group_by := 'sg.sg_id, sg.sg_name,';
		when -200 then 
			store_select := '-200 as store_level_id, ''overall'' as store_level_value,';
            store_group_by := '';
    end case;

    return next;
end;
$function$
;
