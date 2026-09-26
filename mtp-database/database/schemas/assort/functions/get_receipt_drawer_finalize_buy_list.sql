--liquibase formatted sql
--changeset liquibase:get_receipt_drawer_finalize_buy_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_receipt_drawer_finalize_buy_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_receipt_drawer_finalize_buy_list(input integer);
CREATE OR REPLACE FUNCTION assort.get_receipt_drawer_finalize_buy_list(input integer)
 RETURNS TABLE(l0_name text, l1_name text, l2_name text, l3_name text, updated_budget double precision, initial_budget double precision, difference_budget_no double precision, "difference_budget_%" double precision, difference_cogs double precision, "Difference_cogs_%" double precision, updated_units double precision, initial_units double precision, difference_units_no double precision, "difference_units_%" double precision)
 LANGUAGE plpgsql
AS $function$

	/*
Function/Procedure name: assort.get_receipt_drawer_finalize_buy_list
Created by: Hemant Kumar Singh
Created at: 01-Apr-2022
No of input parameter: 1
Parameter Description : $1 = Plan code 

Purpose: This function been created to getting Receipt Drawer for finalize buy screen list 

Calling Statement:

SELECT assort.get_receipt_drawer_finalize_buy_list('82');


Hemant Kumar SIngh:getting Receipt Drawer list 
*/

declare
	_query_combine text;
	begin
		
		_query_combine := 'select
								initial_qty.l0_name,
								initial_qty.l1_name,
						        initial_qty.l2_name,
						        initial_qty.l3_name,
						        coalesce(up_bug.upd_bug, 0) updated_budget,  
						        in_total_bug.initial_budget initial_budget,
						        coalesce((coalesce(up_bug.upd_bug, 0)-in_total_bug.initial_budget),0) "Difference_$",
						        coalesce((((coalesce(up_bug.upd_bug, 0)-in_total_bug.initial_budget)/(nullif(in_total_bug.initial_budget, 0))) ),0) as "Difference_%",
						        coalesce((coalesce((initial_qty.AUC * qty), 0)- (initial_qty.initial_units * initial_qty.AUC)),0) as Difference_cogs,
						        coalesce(((coalesce((initial_qty.AUC * qty ), 0)- (initial_qty.initial_units * initial_qty.AUC))/((nullif(initial_qty.initial_units, 0)) * initial_qty.AUC)) ,0) as "Difference_cogs_%",
						        coalesce(round(qty), 0) as Updated_qty,
						        (initial_qty.initial_units),
						        coalesce((coalesce(qty, 0)-initial_qty.initial_units),0) "Difference_units",
						        coalesce((((coalesce(qty, 0)-initial_qty.initial_units)/(nullif(initial_qty.initial_units, 0)))),0) as "Difference_unit_%"
						    from
						        (
						        select
						            aa.*,
						            (available_cost / nullif(available_units, 0)) as AUC
						        from
						            (
						            select
						                levels->>''l0_name'' l0_name,
										levels->>''l1_name'' l1_name,
						    			levels->>''l2_name'' l2_name,
						    			levels->>''l3_name'' l3_name,
						                sum((attribute_value->>''total_available_cost_ly'')::float8) available_cost,
						                sum((attribute_value->>''total_available_units_ly'')::float8) available_units,
						                sum(nullif(attribute_value->>''receipts_quantity_ty'', '''')::float8) initial_units
						            from
						                assort.plan_l3_opt_master
						            where plan_code = ' || $1 ||'
						            group by
						                l0_name,
						                l1_name,
						                l2_name,l3_name) aa ) initial_qty
						    left join
						    (
						        select
						            qty.l0_name,
						            qty.l1_name,
						            qty.l2_name,
									qty.l3_name,
						            coalesce((qty.Quantity * aur.ty_aur), 0) upd_bug,
						            coalesce(qty.Quantity, 0) as qty
						        from
						            (
						            select
						                levels->>''l0_name'' l0_name,
										levels->>''l1_name'' l1_name,
						    			levels->>''l2_name'' l2_name,
						    			levels->>''l3_name'' l3_name,
						                sum(("attributes"->>''Quantity'')::float8) Quantity
						            from
						                assort.plan_finalize_size_master
						             where plan_code = ' || $1 ||'
						                and levels->>''drop'' = ''-''
						            group by
						                l0_name,
						                l1_name,
						                l2_name,l3_name) qty
						        join (
						            select
						                levels->>''l0_name'' l0_name,
										levels->>''l1_name'' l1_name,
						    			levels->>''l2_name'' l2_name,
						    			levels->>''l3_name'' l3_name,
						                sum((attribute_value->>''aur_ty'')::float8) ty_aur
						            from
						                assort.plan_l3_opt_master
						             where plan_code = ' || $1 ||'
						            group by
						                l0_name,
						                l1_name,
						                l2_name,l3_name) aur on
						            aur.l0_name = qty.l0_name
						            and aur.l1_name = qty.l1_name
						            and aur.l2_name = qty.l2_name
						            and aur.l3_name = qty.l3_name) up_bug
						    on
						        initial_qty.l0_name = up_bug.l0_name
						        and initial_qty.l1_name = up_bug.l1_name
						        and initial_qty.l2_name = up_bug.l2_name
						        and initial_qty.l3_name = up_bug.l3_name
						    left join (
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
						            l0_name,
						            l1_name,
						            l2_name,l3_name) in_total_bug on
						        in_total_bug.l0_name = initial_qty.l0_name
						        and in_total_bug.l1_name = initial_qty.l1_name
						        and in_total_bug.l2_name = initial_qty.l2_name
						        and in_total_bug.l3_name = initial_qty.l3_name
						    order by
						    	in_total_bug.l0_name,
						    	in_total_bug.l1_name,
						        in_total_bug.l2_name,
						        in_total_bug.l3_name ';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
