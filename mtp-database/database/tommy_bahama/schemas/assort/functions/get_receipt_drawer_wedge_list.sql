--liquibase formatted sql
--changeset liquibase:get_receipt_drawer_wedge_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_receipt_drawer_wedge_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_receipt_drawer_wedge_list(input integer);
CREATE OR REPLACE FUNCTION assort.get_receipt_drawer_wedge_list(input integer)
 RETURNS TABLE(l0_name text, l1_name text, l2_name text, l3_name text, updated_budget double precision, initial_budget double precision, difference_budget_no double precision, "difference_budget_%" double precision, difference_cogs double precision, "Difference_cogs_%" double precision, updated_units double precision, initial_units double precision, difference_units_no double precision, "difference_units_%" double precision)
 LANGUAGE plpgsql
AS $function$

	/*
Function/Procedure name: assort.get_receipt_drawer_wedge_list
Created by: Hemant Kumar Singh
Created at: 29-Mar-2022
No of input parameter: 1
Parameter Description : $1 = Plan code 

Purpose: This function been created to getting Receipt Drawer for Wedge screen list 

Calling Statement:

SELECT assort.get_receipt_drawer_wedge_list('82');


Hemant Kumar SIngh:getting Receipt Drawer list 
*/

declare
	_query_combine text;
	begin
		
		_query_combine := 'select
								update_total_budget.l0_name,
								update_total_budget.l1_name,
								update_total_budget.l2_name,
								update_total_budget.l3_name,
								(update_total_budget.update_buget) updated_budget,
								(in_total_bug.initial_budget) initial_budget,
								(update_total_budget.update_buget-in_total_bug.initial_budget) "Difference_$",
								coalesce((((update_total_budget.update_buget-in_total_bug.initial_budget)/((nullif(in_total_bug.initial_budget, 0)))) ), 0) as "Difference_%",
								coalesce(((inl_qty.AUC * qty)- (inl_qty.initial_units * inl_qty.AUC)), 0) as Difference_cogs,
								coalesce((((inl_qty.AUC * qty)- (inl_qty.initial_units * inl_qty.AUC))/((nullif(inl_qty.initial_units, 0)) * inl_qty.AUC)) , 0) as "Difference_cogs_%",
								round(qty) as Updated_qty,
								(inl_qty.initial_units),
								(qty-inl_qty.initial_units) "Difference_units",
								coalesce((((qty-inl_qty.initial_units)/(nullif(inl_qty.initial_units, 0))) ), 0) as "Difference_unit_%"
							from
								(
								select
									opt_aur_ty.l0_name,
									opt_aur_ty.l1_name,
									opt_aur_ty.l2_name,
									opt_aur_ty.l3_name,
									coalesce((opt_aur_ty.aur_ty * cluser_level_total_qty.total_qty), 0) update_buget,
									coalesce(cluser_level_total_qty.total_qty, 0) qty
								from
									(
									select
										cluser_total_qty.l0_name,
										cluser_total_qty.l1_name,
										cluser_total_qty.l2_name,
										cluser_total_qty.l3_name,
										sum((cluser_total_qty.total_qty)) total_qty
									from
										(
										select
											wedge_cluster.l0_name,
											wedge_cluster.l1_name,
											wedge_cluster.l2_name,
											wedge_cluster.l3_name,
											wedge_cluster.cluster_code,
											wedge_cluster.choice_name,
											wedge_cluster.clust_qty,
											cluster_final.store_cnt,
											((wedge_cluster.clust_qty)::float8 *(cluster_final.store_cnt)::float8) as total_qty
										from
											(
											select
												plan_code ,
												levels->>''l0_name'' l0_name,
												levels->>''l1_name'' l1_name,
												levels->>''l2_name'' l2_name,
												levels->>''l3_name'' l3_name,
												levels->>''cluster_code'' cluster_code,
												attribute_value->>''choice_name'' as choice_name,
												attribute_value->>''cluster_qty'' as clust_qty
											from
												assort.plan_wedge_opt_master
											where
												plan_code = ' || $1 ||'
												and levels->>''drop'' = ''-'') wedge_cluster
										left join (
												select
													cm.plan_code ,
													cm.cluster_name cluster_code,
													count(cbma.attribute_value) as store_cnt
												from
													assort.plan_cluster_final cm
												join assort.plan_cluster_store_final cbma on
													cm.cluster_code_id = cbma.cluster_code_id
												where
													plan_code = ' || $1 ||'
													and cbma.attribute_name = ''store_code''
												group by
													cm.cluster_name,
													cm.plan_code) cluster_final on
											wedge_cluster.cluster_code = cluster_final.cluster_code ) cluser_total_qty
									group by
										cluser_total_qty.l0_name,
										cluser_total_qty.l1_name,
										cluser_total_qty.l2_name,cluser_total_qty.l3_name) cluser_level_total_qty
								right join (
									select
										plan_code,
										levels->>''l0_name'' l0_name,
										levels->>''l1_name'' l1_name,
										levels->>''l2_name'' l2_name,
										levels->>''l3_name'' l3_name,
										(attribute_value->>''aur_ty'')::float8 aur_ty
									from
										assort.plan_l3_opt_master
									where
										plan_code = ' || $1 ||'
										and is_active = ''YES''
									) opt_aur_ty on
									opt_aur_ty.l0_name = cluser_level_total_qty.l0_name
									and opt_aur_ty.l1_name = cluser_level_total_qty.l1_name
									and opt_aur_ty.l2_name = cluser_level_total_qty.l2_name
									and opt_aur_ty.l3_name = cluser_level_total_qty.l3_name) update_total_budget
							left join (
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
									where
										plan_code = ' || $1 ||'
									group by
										l0_name,
										l1_name,
										l2_name,
										l3_name) aa ) inl_qty
							                                on
								inl_qty.l0_name = update_total_budget.l0_name
								and inl_qty.l1_name = update_total_budget.l1_name
								and inl_qty.l2_name = update_total_budget.l2_name
								and inl_qty.l3_name = update_total_budget.l3_name
							join (
								select
									levels->>''l0_name'' l0_name,
									                		levels->>''l1_name'' l1_name,
									                    	levels->>''l2_name'' l2_name,
									                    	levels->>''l3_name'' l3_name,
									                    	sum((attribute_value->>''budget_ty'')::float8) initial_budget
								from
									assort.plan_l3_opt_master
								where
									plan_code = ' || $1 ||'
								group by
									l0_name,
									l1_name,
									l2_name,
									l3_name) in_total_bug on
								in_total_bug.l0_name = update_total_budget.l0_name
								and in_total_bug.l1_name = update_total_budget.l1_name
								and in_total_bug.l2_name = update_total_budget.l2_name
								and in_total_bug.l3_name = update_total_budget.l3_name
							order by
								in_total_bug.l0_name,
								in_total_bug.l1_name,
								in_total_bug.l2_name,
								in_total_bug.l3_name ';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
		raise notice 'test%', 'test';
 	end
$function$
;
