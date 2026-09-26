--liquibase formatted sql
--changeset liquibase:import_cluster runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for import_cluster
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.import_cluster(input1 integer, input2 integer);
CREATE OR REPLACE FUNCTION assort.import_cluster(input1 integer, input2 integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$

declare

_del_plan_clu_buk_map text;
_del_plan_clu_grade_attr text;
_insert_plan_clu_buk_map text;
_insert_plan_clu_buk_map_attr text;
_insert_plan_cluster_grade text;

    begin
	    /* 
		Function/Procedure name: assort.import_cluster
		Created by: Hemant Kumar Singh
		Created at: 25-Apr-2022
		No of input parameter: 2
		Parameter Description : $1 = plan_code, $2 = import plan_code 

		Purpose: This function been created to import cluster data 

		Calling Statement:

		select * from assort.import_cluster(42, 62);

		Hemant Kumar Singh 25-04-2022: to update import cluster 
		*/
        

        _del_plan_clu_buk_map := ' delete from assort.plan_cluster_bucket_map where plan_code = ' ||$1 ||'' ;

        execute _del_plan_clu_buk_map;


        _del_plan_clu_grade_attr := ' delete from assort.plan_cluster_grade_attributes where plan_code = ' ||$1 ||'' ;

        execute _del_plan_clu_grade_attr;
        
        _insert_plan_clu_buk_map := 'insert into assort.plan_cluster_bucket_map (plan_code,
                            cluster_name,
                            bucket_id,
                            special_classification,
                            is_optimal,
                            is_final)
                            (
                            select
                            ' ||$1 ||' as plan_code,
                            cluster_name ,
                            bucket_id,
                            special_classification,
                            is_optimal,
                            is_final from assort.plan_cluster_bucket_map where plan_code = ' ||$2 ||')' ;
        
        execute _insert_plan_clu_buk_map;


        _insert_plan_clu_buk_map_attr := ' insert into assort.plan_cluster_bucket_map_attributes
                            (cluster_bucket_code,attribute_name ,attribute_value  ) 
                                select  pcm.cluster_bucket_code,cbma.attribute_name ,cbma.attribute_value  from
                                (select pcbm.cluster_name,pcbm.bucket_id,pcbm.special_classification, pcbma.*  from assort.plan_cluster_bucket_map pcbm 
                                join assort.plan_cluster_bucket_map_attributes pcbma 
                                on pcbma.cluster_bucket_code = pcbm.cluster_bucket_code 
                                where plan_code = ' ||$2 ||'
                                ) cbma ,
                                (select * from assort.plan_cluster_bucket_map where plan_code = ' ||$1 ||' ) pcm
                                where 1=1
                                and cbma.cluster_name =pcm.cluster_name
                                and cbma.bucket_id = pcm.bucket_id 
                                and cbma.special_classification=pcm.special_classification ' ;
        
        execute _insert_plan_clu_buk_map_attr;

        
        _insert_plan_cluster_grade := ' insert into assort.plan_cluster_grade_attributes (plan_code,
                            store_code,
                            special_classification,
                            attribute_name,
                            attribute_value) 
                            (
                            select 
                            ' ||$1 ||' as plan_code,
                            store_code,
                            special_classification,
                            attribute_name,
                            attribute_value from assort.plan_cluster_grade_attributes where plan_code = ' ||$2 ||') ' ;
        
        execute _insert_plan_cluster_grade;


    end
$function$
;
