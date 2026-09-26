--liquibase formatted sql
--changeset liquibase:product_group_definition_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_group_definition_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_group_definition_list(input integer, jsonb);
CREATE OR REPLACE FUNCTION global.product_group_definition_list(input integer, jsonb)
 RETURNS TABLE(pgd_code integer, name character varying, pseudo_code text, rules jsonb)
 LANGUAGE plpgsql
AS $function$
	declare 
		_query text;
	begin
		_query := 'select
					pgd.pgd_code,
					pgd.name,
					pgd.pseudo_code,
					case
						when count(pgr.pgr_code) = 0 then null
						else jsonb_agg(jsonb_build_object(''pgr_code'', pgr.pgr_code, ''name'', pgr.name, ''attribute_name'', pgr.attribute_name, ''attribute_values'', pgr.attribute_values))
					end as rules
				from
					(
					select
						*
					from
						"global".product_group_definitions
					where
						pgd_code = ' || $1 || '
						and is_deleted = false) pgd
				left join (
					select
						*
					from
						"global".product_group_definitions_rules_mapping
					where
						pgd_code = ' || $1 || ') pgdrm
				on
					pgd.pgd_code = pgdrm.pgd_code
				left join (
					select
						*
					from
						"global".product_group_rules
					where
						is_deleted = false) pgr
				on
					pgdrm.pgr_code = pgr.pgr_code
				group by
					1,
					2,
					3';
		 _query := 'SELECT * FROM (' || _query || ') X ' || ("global".form_table_query($2));
		raise notice '%', _query;
		 return QUERY execute _query;
		execute _query;
	end $function$
;


CREATE OR REPLACE FUNCTION global.product_group_definition_list(input integer, integer, jsonb)
 RETURNS TABLE(pgd_code integer, name character varying, pseudo_code text, rules jsonb)
 LANGUAGE plpgsql
AS $function$
	declare 
		_query text;
	begin
		_query := 'select
					pgd.pgd_code,
					pgd.name,
					pgd.pseudo_code,
					case
						when count(pgr.pgr_code) = 0 then null
						else jsonb_agg(jsonb_build_object(''pgr_code'', pgr.pgr_code, ''name'', pgr.name, ''attribute_name'', pgr.attribute_name, ''attribute_values'', pgr.attribute_values))
					end as rules
				from
					(
					select
						*
					from
						"global".product_group_definitions
					where
						pgd_code = ' || $1 || '
						and is_deleted = false) pgd
				left join 
				(
					select
						*
					from
						"global".product_group_definitions_rules_mapping
					where
						pgd_code = ' || $1 || '
						and pg_code = ' || $2 || ') pgdrm
				on
					pgd.pgd_code = pgdrm.pgd_code
				left join (
					select
						*
					from
						"global".product_group_rules
					where
						is_deleted = false) pgr
				on
					pgdrm.pgr_code = pgr.pgr_code
				group by
					1,
					2,
					3';
		 _query := 'SELECT * FROM (' || _query || ') X ' || ("global".form_table_query($3));
		raise notice '%', _query;
		 return QUERY execute _query;
		execute _query;
	end $function$
;

--changeset shreyas.sankpal@impactanalytics.co:product_group_definition_list_MTP-46675 runOnChange:true stripComments:false splitStatements:false context:MTP-37094 labels:MTP-37094
--comment: updated SP to select created and updated info
DROP FUNCTION IF EXISTS "global".product_group_definition_list(input jsonb);
CREATE OR REPLACE FUNCTION global.product_group_definition_list(input jsonb)
 RETURNS TABLE(pgd_code integer, name character varying, pseudo_code text, created_by character varying, updated_by character varying, created_at timestamp with time zone, updated_at timestamp with time zone, rules jsonb)
 LANGUAGE plpgsql
AS $function$


    declare
        _query text;
    begin
        _query := 'select
                    pgd.pgd_code,
                    pgd.name,
                    pgd.pseudo_code,
                    um_cb.user_name as created_by,
					um_ub.user_name as updated_by,
					pgd.created_at,
					pgd.updated_at,
                    case
                        when count(pgr.pgr_code) = 0 then null
                        else jsonb_agg(jsonb_build_object(''pgr_code'', pgr.pgr_code, ''name'', pgr.name, ''attribute_name'', pgr.attribute_name, ''attribute_values'', pgr.attribute_values))
                    end as rules
                from
                    (
                    select
                        *
                    from
                        "global".product_group_definitions
                    where
                        is_deleted = false) pgd
                left join (
                    select
                        *
                    from
                        "global".product_group_definitions_rules_mapping
                    ) pgdrm
                on
                    pgd.pgd_code = pgdrm.pgd_code
                left join (
                    select
                        *
                    from
                        "global".product_group_rules
                    where
                        is_deleted = false) pgr
                on
                    pgdrm.pgr_code = pgr.pgr_code
				left join (
					select
						*
					from
						"global".user_master
					where
						is_deleted = false) um_cb
				on
					pgd.created_by = um_cb.user_code
				left join (
					select
						*
					from
						"global".user_master
					where
						is_deleted = false) um_ub
				on
					pgd.updated_by = um_ub.user_code
                group by
                    1,
                    2,
                    3,
                    4,
					5,
					6,
					7';
         _query := 'SELECT * FROM (' || _query || ') X ' || ("global".form_table_query($1));
         raise notice '%', _query;
         return QUERY execute _query;
        execute _query;
    end $function$
;