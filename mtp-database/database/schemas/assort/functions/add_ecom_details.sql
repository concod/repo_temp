--liquibase formatted sql
--changeset liquibase:add_ecom_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_ecom_details
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.add_ecom_details(input integer, text, text);
CREATE OR REPLACE FUNCTION assort.add_ecom_details(input integer, text, text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	_insert_plan_cluster_final text;
	_insert_plan_cluster_store_final text;
	_cluster_code_id int;
	_plan_step_query text;
    begin

        /*
		Function/Procedure name: assort.add_ecom_details
		Created by: Sadhana J
		Created at: 17-May-2022
		No of input parameter: 1
		Parameter Description : $1 = integer plan_code, $2 = text cluster_name Ecom, $3 = text STB store_code

		Purpose: to add ecomm channal details n clusters

		Calling Statement:

		select * from assort.add_ecom_details(plan_code);

		Updated_by Updated_on Purpose
		Sadhana J 17-05-2022: to add
		*/

		_insert_plan_cluster_final:= 'INSERT INTO assort.plan_cluster_final (cluster_name, plan_code)
		                              VALUES(''' || $2 || ''', ' || $1 || ') RETURNING cluster_code_id ;' ;

		execute _insert_plan_cluster_final into  _cluster_code_id;
		raise notice ' _cluster_code_id %', _cluster_code_id;

		_insert_plan_cluster_store_final:= 'INSERT INTO assort.plan_cluster_store_final (cluster_code_id, attribute_name, attribute_value)
		                                     VALUES('|| _cluster_code_id ||', ''store_code'', ''' || $3 || ''');' ;

		execute _insert_plan_cluster_store_final;
	
		_plan_step_query := 'select * from assort.update_plan_step('|| $1 ||',' || 2.1 ||')';
		--raise notice '_plan_step_query %',_plan_step_query;
		execute _plan_step_query;	
	
	end $function$
;
