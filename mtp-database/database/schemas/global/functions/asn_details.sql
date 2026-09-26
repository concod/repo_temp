--liquibase formatted sql
--changeset liquibase:asn_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for asn_details
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.asn_details(input integer);
CREATE OR REPLACE FUNCTION global.asn_details(input integer)
 RETURNS TABLE(pasn_code integer, source_po_code character varying, source_asn_code character varying, product_code character varying, created_at timestamp with time zone, updated_at timestamp with time zone, total_quantity real, description text, line_number integer, product_name character varying, product_description text, style character varying, size character varying, color character varying, is_updated boolean, attributes jsonb, dc_map json)
 LANGUAGE plpgsql
AS $function$
declare
	_pm_filters jsonb;
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text;
	_product_code text;
	_product_code_sql text;
	begin
		_product_code_sql := 'select product_code from "global".product_asn_master where pasn_code = ' || $1;
		execute _product_code_sql into _product_code;
--		raise notice '%',_product_code;
		_pm_filters := '{"product_code":[{"type":"list", "operator":"in", "values":["' || _product_code || '"]}]}';
--		raise notice '%',_pm_filters;
		_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', _pm_filters));
 		_query_pa := "global".form_attribute_table_filters('product_attributes', 'product_code', '{"style":[], "size":[], "color":[]}');
		_query_combine := 'select
			pasn.pasn_code,
			pasn.source_po_code,
			pasn.source_asn_code,
			pasn.product_code,
			pasn.created_at,
			pasn.updated_at,
			pasn.total_quantity,
			pasn.description,
			pasn.line_number,
			pm.product_name,
			pm.product_description,
			pm.style,
			pm.size,
			pm.color,
			(case
				when pasn.updated_at > pasn.created_at then true
				else false
			end) as is_updated,
			attr.attributes,
			pasn_dc.dc_map
		from
			(SELECT * FROM "global".product_asn_master where pasn_code = ' || $1 || ') pasn
		join (SELECT main.*, attributes.size, attributes.color, attributes.style FROM (' || _query_pm || ') main JOIN (' || _query_pa || ') attributes ON main.product_code = attributes.product_code) pm
		on
			pasn.product_code = pm.product_code
		left join (
			select
				pasn_code,
				json_agg(
					json_build_object(
						''dc'', dc,
						''quantity'', quantity,
						''quantity_perc'', quantity_perc
					)
				) as dc_map
			from
				"global".product_asn_dc_mapping
			where pasn_code = ' || $1 || '
			group by
				pasn_code) pasn_dc on
			pasn.pasn_code = pasn_dc.pasn_code
		left join (
			select
				pasna1.pasn_code,
				jsonb_build_object(
					''issue_date'', pasna1.issue_date,
		    		''expected_receive_date'', pasna2.expected_receive_date,
		    		''vendor_name'', pasna3.vendor_name
		    ) as attributes
			from
				(
				select
					pasn_code,
					attribute_value as issue_date
				from
					"global".product_asn_attributes
				where
					pasn_code = ' || $1 || ' and
					attribute_name = ''issue_date'') pasna1
			left join (
				select
					pasn_code,
					attribute_value as expected_receive_date
				from
					"global".product_asn_attributes
				where
					pasn_code = ' || $1 || ' and
					attribute_name = ''expected_receive_date'') pasna2 on
				pasna1.pasn_code = pasna2.pasn_code
			left join (
				select
					pasn_code,
					attribute_value as vendor_name
				from
					"global".product_asn_attributes
				where
					pasn_code = ' || $1 || ' and
					attribute_name = ''vendor_name'') pasna3 on
				pasna2.pasn_code = pasna3.pasn_code
			group by
				1,
				2) attr
		on
			pasn.pasn_code = attr.pasn_code';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
