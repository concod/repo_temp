// Base Tag Component
export { default as Tag } from './Tag';

// Factory Function
export { createTag } from './TagFactory';

// ================================
// OUTLINE TAGS
// ================================
export { 
  OutlineTag,
  OutlineTagWithClear,
  OutlineTagWithIcon,
  OutlineTagWithIconAndClear,
  OutlineTagWithAvatar,
  OutlineTagWithAvatarAndClear
} from './TagFactory';

// ================================
// FILL TAGS
// ================================
export { 
  FillTag,
  FillTagWithClear,
  FillTagWithIcon,
  FillTagWithIconAndClear,
  FillTagWithAvatar,
  FillTagWithAvatarAndClear
} from './TagFactory';

// ================================
// NONE TAGS (NO BORDER)
// ================================
export { 
  NoneTag,
  NoneTagWithIcon,
  NoneTagWithClear,
  NoneTagWithIconAndClear
} from './TagFactory';

// Agent Tags - Dynamic System
export { 
  AgentTag,
  getAllAgentTags,
  getAgentTagById,
  getAgentTagsByCategory,
  AGENT_TAG_CONFIGS
} from './AgentTags';
export type { AgentTagConfig } from './AgentTags';
