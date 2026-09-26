--liquibase formatted sql
--changeset liquibase:inventory_agent_log stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for inventory_agent_log

CREATE TABLE IF NOT EXISTS inventory_smart.inventory_agent_log (
	user_id varchar(255) NOT NULL,
	session_id varchar(255) NOT NULL,
	chat_id varchar(255) NULL,
	user_name varchar(255) NULL,
	user_query text NULL,
	chatbot_output text NULL,
	query_category varchar(50) NULL,
	query_type varchar(50) NULL,
	time_taken float8 NULL,
	failure_node text NULL,
	"cost" float8 NULL,
	human_in_loop_inputs jsonb NULL,
	query_subtasks _text NULL,
	agent_tools_selected jsonb NULL,
	user_liked bool NULL,
	query_status bool NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	total_tokens int4 DEFAULT 0 NULL,
	sql_queries jsonb NULL
);
