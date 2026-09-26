--liquibase formatted sql
--changeset liquibase:rollup_inv_fy_fw_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rollup_inv_fy_fw_1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.rollup_inv_fy_fw(input date, date);
CREATE OR REPLACE FUNCTION global.rollup_inv_fy_fw(input date, date)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_fy int;
	_fw int;
begin
	for _fy, _fw in select fy, fw from global.fc_fy_fw_level where date >= '2020-09-21' and date <= '2021-09-13' group by fy, fw order by fy, fw asc loop
		perform global.rollup_inv_fy_fw(_fy, _fw);
		raise notice '%,%', _fy, _fw;
	end loop;
end 
$function$
;