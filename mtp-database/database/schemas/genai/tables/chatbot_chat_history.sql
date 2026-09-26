--liquibase formatted sql
--changeset liquibase:chatbot_chat_history_ runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for chatbot_chat_history

CREATE TABLE IF NOT EXISTS genai.chatbot_chat_history (
    id serial4 PRIMARY KEY,                       
    user_code int4,                
    application_code int4,         
    user_query TEXT,   
    response_data TEXT,         
    extra jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),  
    updated_at TIMESTAMPTZ DEFAULT NOW()   
);  