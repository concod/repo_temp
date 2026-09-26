import React from 'react';
import { ModelCard } from '../../components/Card';
import { PageHeader } from '../../components/Header';

/**
 * Hardcoded model data based on the provided screenshot
 */
// const modelProviders = [
//   {
//     provider: 'OPENAI',
//     description: 'OpenAI model refers to any artificial intelligence model developed by OpenAI, including large language models (LLMs) like GPT-4, GPT-3.5, and multimodal models like GPT-4o that can process both text and images.',
//     models: ['GPT-5','GPT-4', 'GPT-3.5'],
//     gradientIndex: 0
//   },
//   {
//     provider: 'GOOGLE',
//     description: 'Google Gemini is a family of advanced AI models developed by Google DeepMind. It is designed to handle text, images, audio, video, and code in a multimodal way, making it one of the most powerful AI models from Google.',
//     models: ['Gemini 1.0', 'Gemini 1.5', 'Gemini Flash', 'Gemini Ultra'],
//     gradientIndex: 1
//   },
//   {
//     provider: 'GROQ',
//     description: 'Groq models refer to AI models running on Groq\'s ultra-fast AI hardware, designed for low-latency, high-speed inference.',
//     models: ['Llama 3 (Meta)', 'Mistral 7B, Mixtral 8×7B', 'DeepSeek 1.5B', 'Gemma 2B, 7B (Google)'],
//     gradientIndex: 2
//   },
//   {
//     provider: 'ANTHROPIC',
//     description: 'Anthropic\'s Claude models are advanced AI assistants designed to be helpful, harmless, and honest. Claude excels at analysis, coding, math, and creative tasks with strong reasoning capabilities.',
//     models: ['Claude 3.5 Sonnet', 'Claude 3 Opus', 'Claude 3 Haiku', 'Claude 2'],
//     gradientIndex: 3
//   },
//   {
//     provider: 'META',
//     description: 'Meta\'s Llama (Large Language Model Meta AI) is an open-source foundation model designed for research and commercial use, known for its strong performance and accessibility.',
//     models: ['Llama 3.1 405B', 'Llama 3.1 70B', 'Llama 3.1 8B', 'Code Llama'],
//     gradientIndex: 0
//   },
//   {
//     provider: 'MISTRAL AI',
//     description: 'Mistral AI develops efficient and powerful language models with a focus on performance and safety. Their models are designed for enterprise applications and complex reasoning tasks.',
//     models: ['Mistral Large', 'Mistral Medium', 'Mistral Small', 'Codestral'],
//     gradientIndex: 1
//   },
//   {
//     provider: 'COHERE',
//     description: 'Cohere provides enterprise-grade language models optimized for business applications, with strong capabilities in text generation, summarization, and retrieval-augmented generation (RAG).',
//     models: ['Command R+', 'Command R', 'Command', 'Embed'],
//     gradientIndex: 2
//   }
// ];

const modelProviders = [
  {
    provider: 'OPENAI',
    description: 'OpenAI develops cutting-edge language models like GPT-5, which integrates reasoning and multimodal capabilities. Earlier versions like GPT-4 and GPT-3.5 remain widely used for a variety of applications.',
    models: ['GPT-5', 'GPT-4', 'GPT-3.5'],
    gradientIndex: 0
  },
  {
    provider: 'GOOGLE',
    description: 'Google’s Gemini 2.5 family is its latest multimodal AI, capable of handling text, images, audio, code, and video. It includes Flash and Pro variants designed for fast, efficient, and large-context reasoning.',
    models: ['Gemini 2.5 Pro', 'Gemini 2.5 Flash', 'Gemini 1.5', 'Veo 3'],
    gradientIndex: 1
  },
  {
    provider: 'GROQ',
    description: 'Groq delivers ultra-fast AI inference using its LPU hardware, primarily running optimized versions of Llama 3 and other open-weight models focused on tool use and low latency.',
    models: ['Llama 3 (Groq 70B)', 'Llama 3 (Groq 8B)', 'Mixtral 8×7B', 'Gemma 7B'],
    gradientIndex: 2
  },
  {
    provider: 'ANTHROPIC',
    description: 'Anthropic’s Claude models, such as Claude 4 Opus and Claude 3.7 Sonnet, are built for reliable reasoning and safe AI alignment, offering strong performance in tasks like analysis, coding, and creative writing.',
    models: ['Claude 4 Opus', 'Claude 4 Sonnet', 'Claude 3.7 Sonnet', 'Claude 3 Haiku'],
    gradientIndex: 3
  },
  {
    provider: 'META',
    description: 'Meta’s Llama 4 models are advanced open-source language models with variants like Scout and Maverick designed for both research and enterprise use, with a focus on accessibility and high performance.',
    models: ['Llama 4 Scout', 'Llama 4 Maverick', 'Llama 4 Behemoth', 'Code Llama'],
    gradientIndex: 0
  },
  {
    provider: 'MISTRAL AI',
    description: 'Mistral AI produces efficient, open-weight models like Mixtral and Mathstral, tuned for language, code, and math tasks, with long-context support and strong performance in specialized reasoning.',
    models: ['Mixtral 8×7B', 'Mathstral 7B', 'Codestral Mamba', 'Mistral 7B'],
    gradientIndex: 1
  },
  {
    provider: 'COHERE',
    description: 'Cohere’s Command series, including Command A and Command R+, are enterprise-grade LLMs focused on long-context understanding, tool use, and retrieval-augmented generation (RAG).',
    models: ['Command A', 'Command R+', 'Command R', 'Embed v4'],
    gradientIndex: 2
  },
  {
    provider: ' Impact Analytics Retail Fine-tuned Models',
    description: 'Impact Analytics Retail Fine-tuned models, as well as fine-tuned models for specific tasks like image classification and sentiment analysis.',
    models: ['Coming Soon'],
    gradientIndex: 3
  },
  {
    provider: 'Impact Analytics Foundational models',
    description: 'Impact Analytics Foundational models, as well as fine-tuned models for specific tasks like image classification and sentiment analysis.',
    models: ['Coming Soon'],
    gradientIndex: 0
  }
];


/**
 * SupportedModelsPage Component
 * Displays all supported AI model providers with their descriptions and available models
 */
const SupportedModelsPage: React.FC = () => {
  return (
    <div className="supported-models-page">
      <PageHeader 
        title="Supported Models"
        description="Explore the wide range of AI models available in our platform"
        onSearch={() => {}} // No search functionality needed for this page
        onResetSearch={() => {}} // No search functionality needed for this page
        buttons={[]} // No action buttons needed for this page
        showResetButton={false}
        showSearchBar={false}
      />
      
      <div className="supported-models-page__content">
        <div className="supported-models-page__grid">
          {modelProviders.map((provider) => (
            <ModelCard
              key={provider.provider}
              provider={provider.provider}
              description={provider.description}
              models={provider.models}
              gradientIndex={provider.gradientIndex}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SupportedModelsPage;
