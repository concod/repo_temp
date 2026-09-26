--liquibase formatted sql
--changeset liquibase:asn_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for asn_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.asn_list(input jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.asn_list(input jsonb, jsonb, jsonb)
 RETURNS TABLE(pasn_code integer, source_po_code character varying, source_asn_code character varying, product_code character varying, created_at timestamp with time zone, updated_at timestamp with time zone, total_quantity real, description text, line_number integer, product_description text, is_updated boolean, attributes jsonb, dc_map json)
 LANGUAGE plpgsql
AS $function$
declare
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text;
	begin
		_query_pm := 'SELECT * FROM "global".product_master' || (global.form_main_table_filters('product_master', $1));
 		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
		_query_table_filters := global.form_table_query($3);
		_query_combine := 'SELECT * FROM (select
			asn.pasn_code,
			asn.source_po_code,
			asn.source_asn_code,
			asn.product_code,
			asn.created_at,
			asn.updated_at,
			asn.total_quantity,
			asn.description,
			asn.line_number,
			pm.product_description,
			(case
				when asn.updated_at > asn.created_at then true
				else false
			end) as is_updated,
			attr.attributes,
			asn_dc.dc_map
		from
			"global".product_asn_master asn
		join (SELECT main.* FROM (' || _query_pm || ') main JOIN (' || _query_pa || ') attributes ON main.product_code = attributes.product_code) pm
		on
			asn.product_code = pm.product_code
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
			group by
				pasn_code) asn_dc on
			asn.pasn_code = asn_dc.pasn_code
		left join (
			select
				asna1.pasn_code,
				jsonb_build_object(
					''issue_date'', asna1.issue_date,
		    		''expected_receive_date'', asna2.expected_receive_date,
		    		''vendor_name'', asna3.vendor_name
		    ) as attributes
			from
				(
				select
					pasn_code,
					attribute_value as issue_date
				from
					"global".product_asn_attributes
				where
					attribute_name = ''issue_date'') asna1
			left join (
				select
					pasn_code,
					attribute_value as expected_receive_date
				from
					"global".product_asn_attributes
				where
					attribute_name = ''expected_receive_date'') asna2 on
				asna1.pasn_code = asna2.pasn_code
			left join (
				select
					pasn_code,
					attribute_value as vendor_name
				from
					"global".product_asn_attributes
				where
					attribute_name = ''vendor_name'') asna3 on
				asna2.pasn_code = asna3.pasn_code
			group by
				1,
				2) attr
		on
			asn.pasn_code = attr.pasn_code) X ' || _query_table_filters;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
