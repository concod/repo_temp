--liquibase formatted sql
--changeset liquibase:build_product_store_attributes_partitions runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for build_product_store_attributes_partitions
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.build_product_store_attributes_partitions();
CREATE OR REPLACE PROCEDURE global.build_product_store_attributes_partitions()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
/*
 * Function/Procedure name: global.build_product_store_attributes_partitions
 * Created by: Kailash Yadav
 * Created at: 18-Sep-2022
 * No of input parameter: 0
 * Parameter Description : 
 * Purpose: This SP been created to create partition on product_attributes and store_attributes table based on attributes 
 * mention the attributes in tables  product_generic_schema_mapping and store_generic_schema_mapping  
 * Calling Statement:   
 *  call global.build_product_store_attributes_partitions()

 * 
 * if any modification done in same function/procedure please record the changes in below format
 * 
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 *  
 */

	declare
	_partition_statement text;
	_partition_name text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_product_store_attributes_partitions';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		for _partition_statement,_partition_name in 
			select partition_stmt,partition_name from (
					select partition_stmt,partition_name,rn  from 
						(
						select 'create table "global".product_attributes_default PARTITION OF "global".product_attributes DEFAULT ;' partition_stmt,'product_attributes_default' partition_name ,  1 rn
						union all
						select distinct 'CREATE TABLE "global".product_attributes_'||pgsm.generic_column_name||' PARTITION OF "global".product_attributes FOR VALUES IN ('''||pgsm.generic_column_name||''');' partition_stmt, 'product_attributes_'||pgsm.generic_column_name  partition_name, 2 rn  
						from global.product_generic_schema_mapping pgsm 
						where required_in_product and is_attribute
						union all
						select 'create table "global".store_attributes_default PARTITION OF "global".store_attributes DEFAULT ;' partition_stmt, 'store_attributes_default' partition_name, 1 rn
						union all
						select distinct 'CREATE TABLE "global".store_attributes_'||pgsm.generic_column_name||' PARTITION OF "global".store_attributes FOR VALUES IN ('''||pgsm.generic_column_name||''');' partition_stmt, 'store_attributes_'||pgsm.generic_column_name  partition_name, 2 rn  
						from global.store_generic_schema_mapping pgsm 
						where required_in_product and is_attribute 
						) x
						order by 3 ) y
						where 1=1 
						and not exists (SELECT
						    'p'
						FROM pg_inherits
						    JOIN pg_class parent            ON pg_inherits.inhparent = parent.oid
						    JOIN pg_class child             ON pg_inherits.inhrelid   = child.oid
						    JOIN pg_namespace nmsp_parent   ON nmsp_parent.oid  = parent.relnamespace
						    JOIN pg_namespace nmsp_child    ON nmsp_child.oid   = child.relnamespace
						WHERE parent.relname in ('store_attributes','product_attributes')
						and y.partition_name= child.relname
						 )   
			 loop 
				 execute _partition_statement ;
				 raise notice '%',_partition_statement ||' '||_partition_name;
			
			 end loop;	 
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	end
$procedure$
;
