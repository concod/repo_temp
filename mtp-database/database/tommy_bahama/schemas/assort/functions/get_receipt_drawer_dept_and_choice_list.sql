--liquibase formatted sql
--changeset liquibase:get_receipt_drawer_dept_and_choice_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_receipt_drawer_dept_and_choice_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_receipt_drawer_dept_and_choice_list(input integer);
CREATE OR REPLACE FUNCTION assort.get_receipt_drawer_dept_and_choice_list(input integer)
 RETURNS TABLE(l0_name text, l1_name text, l2_name text, l3_name text, updated_budget double precision, initial_budget double precision, difference_budget_no double precision, "difference_budget_%" double precision, difference_cogs double precision, "Difference_cogs_%" double precision, updated_units double precision, initial_units double precision, difference_units_no double precision, "difference_units_%" double precision)
 LANGUAGE plpgsql
AS $function$

	/*
Function/Procedure name: assort.get_receipt_drawer_dept_and_choice_list
Created by: Hemant Kumar Singh
Created at: 16-Mar-2022
No of input parameter: 1
Parameter Description : $1 = Plan code 

Purpose: This function been created to getting Receipt Drawer for Dept and choice screen list 

Calling Statement:

SELECT assort.get_cluster_and_level_list('30');


Hemant Kumar SIngh:getting Receipt Drawer list 
*/

declare
	_query_combine text;
	begin
		
		_query_combine := 'select	
				up_total_bug.l0_name,
 							up_total_bug.l1_name,
                            up_total_bug.l2_name,
                            up_total_bug.l3_name,
                            up_total_bug.updated_budget,
                            in_total_bug.initial_budget,
                            (up_total_bug.updated_budget-in_total_bug.initial_budget) difference_budget_no,
                            (((up_total_bug.updated_budget-in_total_bug.initial_budget)/(nullif(in_total_bug.initial_budget,0))) ) as "difference_budget_%",
                            coalesce(((inl_qty.AUC* qty)- (inl_qty.initial_units * inl_qty.AUC)),0) as Difference_cogs,
                            coalesce((((inl_qty.AUC* qty)- (inl_qty.initial_units * inl_qty.AUC))/(nullif(inl_qty.initial_units,0) * inl_qty.AUC)) ,0) as "Difference_cogs_%",
                            round(qty) as updated_units,(inl_qty.initial_units),
                            (qty-inl_qty.initial_units) difference_units_no,
                            (((qty-inl_qty.initial_units)/(nullif(inl_qty.initial_units,0))) ) as "difference_units_%"
            from
                (
                select
                   total.l0_name, total.l1_name,total.l2_name,total.l3_name,
                    sum(updated_budget) as updated_budget,
                    sum(qty) qty
                from
                    (
                    select
                        x.l0_name,x.l1_name,x.l2_name,x.l3_name,
                        round(x.depth) * round(x.choice) * (y.store_cnt) * (z.aur_ty) as updated_budget,
                        round(x.depth) * round(x.choice) * (y.store_cnt) as qty
                    from
                        (
                        select
                            plan_code ,
                            levels->>''l0_name'' l0_name,
                        	levels->>''l1_name'' l1_name,
                            levels->>''l2_name'' l2_name,
                            levels->>''l3_name'' l3_name,
                            levels->>''cluster_code'' cluster_code,
                            (attribute_value->>''depth_ty'')::float8 depth,
                            (attribute_value->>''choice_ty'')::float8 choice
                        from
                            assort.plan_cluster_depth_choice
                         where plan_code = ' || $1 ||' ) as x
                    join (
                        select
                            cm.plan_code ,
                            cm.cluster_name cluster_code,
                            count(cbma.attribute_value) as store_cnt
                        from
                            assort.plan_cluster_final cm
                        join assort.plan_cluster_store_final cbma on
                            cm.cluster_code_id = cbma.cluster_code_id
                         where plan_code = ' || $1 ||'  and cbma.attribute_name = ''store_code''
                        group by
                            cm.cluster_name,
                            cm.plan_code) y on
                        y.cluster_code = x.cluster_code
                    left join (
                        select
                            plan_code,
                            levels->>''l0_name'' l0_name,
                        	levels->>''l1_name'' l1_name,
                            levels->>''l2_name'' l2_name,
                            levels->>''l3_name'' l3_name,
                            (attribute_value->>''aur_ty'')::float8 aur_ty
                        from
                            assort.plan_l3_opt_master
                         where plan_code = ' || $1 ||' ) z on
                        z.l0_name = x.l0_name
                        and z.l1_name = x.l1_name
                        and z.l2_name = x.l2_name
                        and z.l3_name = x.l3_name ) total
                group by
                    total.l0_name,total.l1_name,total.l2_name,total.l3_name ) up_total_bug
                left join (select
                    aa.*,
                    (available_cost / nullif(available_units,0)) as AUC
                from
                    (
                    select
                        levels->>''l0_name'' l0_name,
                		levels->>''l1_name'' l1_name,
                    	levels->>''l2_name'' l2_name,
                    	levels->>''l3_name'' l3_name,
                        sum((attribute_value->>''total_available_cost_ly'')::float8) available_cost,
                        sum((attribute_value->>''total_available_units_ly'')::float8) available_units,
                        sum(NULLIF(attribute_value->>''receipts_quantity_ty'', '''')::float8) initial_units
                    from
                        assort.plan_l3_opt_master
                     where plan_code = ' || $1 ||' 
                    group by
                        l0_name,
                        l1_name,
                        l2_name,l3_name) aa ) inl_qty
                        on inl_qty.l0_name = up_total_bug.l0_name
                and inl_qty.l1_name = up_total_bug.l1_name
                and inl_qty.l2_name = up_total_bug.l2_name
                and inl_qty.l3_name = up_total_bug.l3_name
            join (
                select
                	levels->>''l0_name'' l0_name,
                	levels->>''l1_name'' l1_name,
                    levels->>''l2_name'' l2_name,
                    levels->>''l3_name'' l3_name,
                    sum((attribute_value->>''budget_ty'')::float8) initial_budget
                from
                    assort.plan_l3_opt_master
                 where plan_code = ' || $1 ||' 
                group by
                    l0_name,l1_name,l2_name,l3_name) in_total_bug on
                in_total_bug.l0_name = up_total_bug.l0_name
                and in_total_bug.l1_name = up_total_bug.l1_name
                and in_total_bug.l2_name = up_total_bug.l2_name
                and in_total_bug.l3_name = up_total_bug.l3_name
                order by in_total_bug.l0_name,in_total_bug.l1_name,in_total_bug.l2_name,in_total_bug.l3_name ';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
		raise notice 'test%', 'test';
 	end
$function$
;
