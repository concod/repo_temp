--liquibase formatted sql
--changeset liquibase:store_group_stores_lists runOnChange:true stripComments:false splitStatements:false context:MTP-19086 labels:store_grade
--comment: initial changeset for store_group_stores_lists
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_group_stores_lists(input refcursor, integer, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.store_group_stores_lists(input refcursor, integer, jsonb, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
	declare
	_query_table_filters text := '';
	_query_sa text := '';
	_query_combine text := '';
	begin
		_query_table_filters := global.form_table_query($4);
		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
 		_query_combine := 'select * from (SELECT * FROM (
			select
				sm.store_name,
                coalesce(sg.ref_sg_code, 0) as ref_sg_code,
                attributes.*,
				sgtg.grade as grade
			from
				(
				select
					store_code,
					ref_sg_code
				from
					global.store_groups_mapping
				where
					sg_code = ' || $2 || ') sg
			join global.store_master sm on
				sg.store_code = sm.store_code and  sm.active
			JOIN (' || _query_sa || ') attributes ON sm.store_code = attributes.store_code
			LEFT JOIN (select store_code, grade, sg_code from "global".store_groups_to_grade where sg_code = ' || $2 || ') sgtg on sgtg.store_code = sm.store_code) main
		) X ' || _query_table_filters;
		raise notice '%',_query_combine;
		OPEN $1 FOR execute _query_combine;
		return _query_combine;
	end $function$
;

--changeset arnab.nandy@impactanalytics.co:store_group_stores_list_adding_store_grade runOnChange:true stripComments:false splitStatements:false context:MTP-39878 labels:MTP-39878
--comment: changeset for store_group_stores_lists function for adding store grade
DROP FUNCTION IF EXISTS global.store_group_stores_lists(input refcursor, integer, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.store_group_stores_lists(input refcursor, integer, jsonb, jsonb, boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
	declare
	_query_table_filters text := '';
	_query_sa text := '';
	_query_combine text := '';
    _psa_flag bool := $5;
	begin
		_query_table_filters := global.form_table_query($4);
		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
		if _psa_flag = true then
			_query_combine := 'select * from (SELECT * FROM (
				select
	                psa.psa_name psa_name, max(psa.l0_name) as l0_name, max(psa.l1_name) l1_name, max(psa.l3_name) l3_name, max(psa.l4_name) l4_name
				from
					(
					select
						psa_code
					from
						global.aggregated_store_groups_mapping
					where
						sg_code = ' || $2 || ') sg
				join (select psa_code, psa_name, l0_name, l1_name, l3_name, l4_name from global.product_store_attributes_filter) psa
					on sg.psa_code = psa.psa_code
				group by psa_name
			) main ) X ' || _query_table_filters;
		else
	 		_query_combine := 'select * from (SELECT * FROM (
					select
						sm.store_name,
						coalesce(sg.ref_sg_code, 0) as ref_sg_code,
						attributes.*,
						sgtg.grade as grade
					from
						(
						select
							store_code,
							ref_sg_code
						from
							global.store_groups_mapping
						where
							sg_code = ' || $2 || ') sg
					join global.store_master sm on
						sg.store_code = sm.store_code and  sm.active
					JOIN (' || _query_sa || ') attributes ON sm.store_code = attributes.store_code
					LEFT JOIN (select store_code, grade, sg_code from "global".store_groups_to_grade where sg_code = ' || $2 || ') sgtg on sgtg.store_code = sm.store_code) main
				) X ' || _query_table_filters;
		end if;
		raise notice '%',_query_combine;
		OPEN $1 FOR execute _query_combine;
		return _query_combine;
	end $function$
;
