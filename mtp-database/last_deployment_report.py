import os
import load_env
from services import PGSync

def get_latest_deployment_report():
	client = os.environ.get('CLIENT')
	env = os.environ.get('ENV')

	pg_sync = PGSync(client, env, False) #False server connection
	info = pg_sync.get_results("""
		select
			deployment_id,
			min(dateexecuted) as deployment_started_at,
			max(dateexecuted) as deployment_finished_at
		from
			liquibase.databasechangelog
		where
			dateexecuted = (
			select
				max(dateexecuted)
			from
				liquibase.databasechangelog)
		group by
			deployment_id
    """)

	for i in info:
		deployment_id = i['deployment_id']
		deployment_started_at = i['deployment_started_at']
		deployment_finished_at = i['deployment_finished_at']

	results = pg_sync.get_results("""
		select 
			(case when filename like 'schemas/%' then 'Common' else INITCAP(SPLIT_PART(filename, '/', 1)) end) as t1,
			replace((case when SPLIT_PART(filename, '/', -3) = 'global' then 'core' when SPLIT_PART(filename, '/', -3) = 'public' then 'Data Ingestion' else SPLIT_PART(filename, '/', -3) end), '_', ' ') as t2,
			(INITCAP(replace(replace(SPLIT_PART(filename, '/', -2) || '|', 's|', ''), '_', ' ')))
			|| ' ' ||
			replace(SPLIT_PART(filename, '/', -1), '.sql', '') as title,
			case when author is null then 'NA' else INITCAP(author) end as author,
			case when comments is null then 'NA' else INITCAP(comments) end as comments,
			case when tag is null then 'NA' else INITCAP(tag) end as tag,
			case when contexts is null then 'NA' else INITCAP(contexts) end as contexts,
			case when jira_id is null then 'NA' else INITCAP(jira_id) end as jira_id
		from (
			select
				author,
				replace(filename, 'database/', '') as filename,
				orderexecuted,
				"comments",
				tag,
				contexts,
				labels as jira_id
			from
				liquibase.databasechangelog
				where deployment_id = '{}'
				and filename not in ('database/schemas/global/functions/dc_list.sql', 'database/schemas/global/functions/dimensions_list.sql', 'database/schemas/global/functions/fc_list.sql', 'database/schemas/global/functions/filter_configurations_for_screen_application.sql', 'database/schemas/global/functions/filter_configurations_for_screen.sql', 'database/schemas/global/functions/filter_configurations_mapping_list.sql', 'database/schemas/global/functions/product_attributes_list.sql', 'database/schemas/global/functions/product_group_rule_list.sql', 'database/schemas/global/functions/products_filter.sql', 'database/schemas/global/functions/store_attributes_list.sql', 'database/schemas/global/functions/stores_filter.sql', 'database/schemas/global/functions/table_configurations_for_screen.sql', 'database/schemas/global/functions/table_configurations_mapping_list.sql')
		) x
		order by orderexecuted asc limit 100
	""".format(deployment_id))

	res_html = ""
	for res in results:
		# Prepare t2 block if present
		t2_html = ""
		if res['t2']:
			t2_html = f"""
			<span style="background-color: rgba(222,222,222,0.5); 
						 color: crimson; font-size: 12px; 
						 font-weight: bold; padding: 2px 10px;">
				{res['t2'].upper()}
			</span>
			"""
		# Append row
		res_html += f"""
		<tr>
			<td style="border: 1px solid #ddd;">
				<span style="background-color: rgba(222,222,222,0.5); 
							 color: crimson; font-size: 12px; 
							 font-weight: bold; padding: 2px 5px; margin:2px;">
					{res['t1'].upper()}
				</span>
				{t2_html}
				<br/>
				{res['title']}
			</td>
			<td style="border: 1px solid #ddd;">{res['author']}</td>
			<td style="border: 1px solid #ddd;">{res['comments']}</td>
			<td style="border: 1px solid #ddd;">{res['tag']}</td>
			<td style="border: 1px solid #ddd;">{res['contexts']}</td>
			<td style="border: 1px solid #ddd;">{res['jira_id']}</td>
		</tr>
		"""

	report_meta = f"""
	<table border="1" width="60%" cellspacing="0" cellpadding="8" 
		   style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 13px;">
		<tr>
			<th align="left" style="background-color:#f2f2f2;">Database</th>
			<td>{pg_sync.db_name}</td>
		</tr>
		<tr>
			<th align="left" style="background-color:#f2f2f2;">Client</th>
			<td>{client.capitalize()}</td>
		</tr>
		<tr>
			<th align="left" style="background-color:#f2f2f2;">Environment</th>
			<td>{env.upper()}</td>
		</tr>
		<tr>
			<th align="left" style="background-color:#f2f2f2;">Started At</th>
			<td>{deployment_started_at}</td>
		</tr>
		<tr>
			<th align="left" style="background-color:#f2f2f2;">Finished At</th>
			<td>{deployment_finished_at}</td>
		</tr>
	</table>
	"""

	report_html = report_meta + """<br/><table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 13px;">
	  <thead>
		<tr style="background-color: #f2f2f2; text-align: left;">
		  <th style="padding: 10px; border: 1px solid #ddd;">Title</th>
		  <th style="padding: 10px; border: 1px solid #ddd;">Author</th>
		  <th style="padding: 10px; border: 1px solid #ddd;">Comments</th>
		  <th style="padding: 10px; border: 1px solid #ddd;">Tag</th>
		  <th style="padding: 10px; border: 1px solid #ddd;">Context</th>
		  <th style="padding: 10px; border: 1px solid #ddd;">JIRA</th>
		</tr>
	  </thead>
	  <tbody>""" + res_html + """</tbody>
	</table>"""

	return report_html
