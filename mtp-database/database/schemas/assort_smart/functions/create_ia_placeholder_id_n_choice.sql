--liquibase formatted sql
--changeset liquibase:create_ia_placeholder_id_n_choice runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_ia_placeholder_id_n_choice
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.create_ia_placeholder_id_n_choice_id(source_plan_code integer, placeholder_choice_key text, placeholder_style_key text, style_no_column text);
CREATE OR REPLACE FUNCTION assort_smart.create_ia_placeholder_id_n_choice_id(source_plan_code integer, placeholder_choice_key text, placeholder_style_key text, style_no_column text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare

_update_placeholder_style_query text;
_update_placeholder_choice_query text;
_plan_code_with_dash text;

	    /*
            Function/Procedure name: assort_smart.create_ia_placeholder_id_n_choice_id - (for flex integration)
            Created by: Mohammed Ayaz
            Created at: 07-Jun-2022
            No of input parameter: 4
            Parameter Description : $1 = plan_code
                                    $2 = placeholder_choice_key i.e.  "ia_placeholder_choice_id"
                                    $3 = placeholder_style_key i.e.  "ia_placeholder_style_id"
                                    $4 = style_no_column i.e "global_style_number"

            Purpose: This function is for creating ia_placholder according style_id and choice_name


            Calling Statement:

                select * from assort_smart.create_ia_placeholder_id_n_choice_id(5000, 'ia_placeholder_choice_id', 'ia_placeholder_style_id', 'global_style_number')

            Updated_by Updated_on Purpose
                Mohammed Ayaz 07-06-2022: to create placeholder for style_id and choice_name with plancode (flex integration)
            */

begin
    _plan_code_with_dash := '-'||''||$1||'';

    _update_placeholder_style_query := 'UPDATE assort_smart.plan_omni_wedge_opt_master
            SET attribute_value= attribute_value::jsonb || jsonb_build_object('''||$3||''',attribute_value->>'''||$4||''' ||'''||_plan_code_with_dash||''', ''block_choice'', true )
            WHERE source_plan_code='''||$1||''' and attribute_value->>'''||$4||''' IS NOT NULL and attribute_value->>'''||$3||''' IS NULL ;';

           raise notice '_update_placeholder_style_query%s', _update_placeholder_style_query;

    execute _update_placeholder_style_query;

   _update_placeholder_choice_query := 'UPDATE assort_smart.plan_omni_wedge_opt_master
			  SET attribute_value= attribute_value::jsonb || jsonb_build_object('''||$2||''', source_choice_id|| '''||_plan_code_with_dash||''')
				   WHERE source_plan_code='''||$1||'''
			   and source_choice_id IS NOT NULL
				   and attribute_value->>'''||$2||''' IS null';

	raise notice '%s', _update_placeholder_choice_query;

    execute _update_placeholder_choice_query;


end
;

$function$
;