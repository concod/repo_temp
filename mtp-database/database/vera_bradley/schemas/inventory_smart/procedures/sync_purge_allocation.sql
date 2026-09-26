--liquibase formatted sql
--changeset tarunreddy.challa@impactanalytics.co:sync_purge_allocation runOnChange:true stripComments:false splitStatements:false context:sync_purge_allocation. labels:DAT-1101
--comment: vb sync_purge_allocation.
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS inventory_smart.sync_purge_allocation();
CREATE OR REPLACE PROCEDURE inventory_smart.sync_purge_allocation()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
	begin 
		update
	inventory_smart.plan_master
set
	is_deleted = true
where
	plan_code in (
	select
		plan_code
	from
		inventory_smart.plan_master pm
	where
		plan_code in 
(
		select
			a.plan_code
		from
			inventory_smart.plan_master a
		left join inventory_smart.create_allocation_result_flat_gurobi b on
			a.plan_code = b.allocation_code
		where
			b.order_type != 'L'
			and a.status = 2
		group by
			a.plan_code )
		and is_deleted is false) ;
end
$procedure$ ;
