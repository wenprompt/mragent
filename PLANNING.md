# Feature Planning: AI Message History Memory for Iterative Development

## Problem Statement

Currently, the AI agent (`codeAgentFunction`) treats each new message as an independent task to create a new project, even when working within an existing project. When a user asks the AI to "build a Netflix clone frontend" and then follows up with "add a contact page to it", the agent doesn't leverage the existing code/context from previous messages. This results in:

1. **Loss of Context**: The AI doesn't remember what was previously built
2. **Inconsistent Development**: Each message creates isolated solutions rather than building iteratively
3. **Poor User Experience**: Users cannot incrementally improve their projects
4. **Wasted Sandbox Resources**: New sandboxes are created instead of reusing existing ones

## Current Architecture Analysis

### Current Flow
1. User creates new message → `messages.create` procedure
2. Inngest event `code-agent/run` triggered with just the new message content
3. New sandbox created for each request
4. AI agent receives only the current message prompt (no history)
5. Agent generates code in isolation
6. Result stored as new fragment

### Key Issues Identified
- **Stateless Agent**: The agent prompt in `src/prompt.ts` doesn't include previous messages
- **No Context Passing**: `codeAgentFunction` only receives `event.data.value` (current message)
- **Fresh Sandbox Per Request**: Each request creates a new E2B sandbox
- **No Message History Retrieval**: Agent doesn't query previous messages in the project

## Proposed Solution Architecture

### 1. Enhanced Agent Context System

#### Database Schema Changes
**NO CHANGES NEEDED** - Current schema already supports this:
- `Project` → `Message[]` → `Fragment?` relationship exists
- Messages have `role` (USER/ASSISTANT) and `content` fields
- Fragments contain `files` (JSON) and `sandboxUrl`

#### New Message History Retrieval
- Modify `codeAgentFunction` to fetch all previous messages for the project
- Build conversation context from message history
- Pass enriched context to the AI agent

### 2. Sandbox Persistence Strategy

#### Sandbox Reuse Mechanism
- Store `sandboxId` in the database (new field: `Project.activeSandboxId`)
- Check if existing sandbox is still active before creating new one
- Reuse sandbox across multiple messages in the same project
- Implement sandbox cleanup/expiration strategy

#### Fallback Strategy
- If existing sandbox is expired/unavailable, create new one
- Sync previous project files to new sandbox before starting
- Update `Project.activeSandboxId` with new sandbox

### 3. Enhanced AI Agent Prompt

#### Context-Aware Prompting
- Modify `PROMPT` in `src/prompt.ts` to include message history section
- Format previous messages as conversation context
- Include previous file states and development history
- Provide clear context about what was previously built

#### Incremental Development Instructions
- Add specific instructions for iterative development
- Guide agent to analyze existing code before making changes
- Ensure consistency with previous architectural decisions

## Implementation Plan

### Phase 1: Database Schema Enhancement
```sql
-- Add sandbox tracking to Project table
ALTER TABLE "Project" ADD COLUMN "activeSandboxId" TEXT;
ALTER TABLE "Project" ADD COLUMN "sandboxExpiresAt" TIMESTAMP;
```

### Phase 2: Message History Integration

#### 2.1 Enhanced Code Agent Function
**File: `src/inngest/functions.ts`**
- Add `getProjectMessageHistory` utility function
- Modify `codeAgentFunction` to fetch message history
- Build context from previous messages and fragments
- Pass enriched context to agent

#### 2.2 Sandbox Management System
**File: `src/inngest/utils.ts`**
- Create `getOrCreateProjectSandbox` function
- Implement sandbox reuse logic
- Add file synchronization for new sandboxes
- Handle sandbox expiration and cleanup

#### 2.3 Context Builder
**File: `src/inngest/context-builder.ts` (new)**
- Format message history into conversation context
- Extract file states from previous fragments
- Build coherent project context for AI agent

### Phase 3: Enhanced AI Prompt System

#### 3.1 Dynamic Prompt Generation
**File: `src/prompt.ts`**
- Create `buildContextualPrompt` function
- Include message history in prompt
- Add development context and file states
- Maintain consistency with existing prompt structure

#### 3.2 Iterative Development Instructions
- Add specific guidance for building upon existing work
- Include instructions for code analysis and modification
- Ensure architectural consistency across iterations

### Phase 4: API Enhancements

#### 4.1 Enhanced Message Creation
**File: `src/modules/messages/server/procedures.ts`**
- No changes needed - existing create procedure works
- Message history will be fetched in the agent function

#### 4.2 Project Management
**File: `src/modules/projects/server/procedures.ts`**
- Add sandbox cleanup utilities
- Implement project reset functionality (if needed)

## Technical Implementation Details

### 1. Message History Context Building

```typescript
// New utility in src/inngest/context-builder.ts
export function buildProjectContext(messages: MessageWithFragment[]) {
  const conversationHistory = messages.map(msg => 
    `${msg.role}: ${msg.content}`
  ).join('\n\n');
  
  const latestFiles = getLatestProjectFiles(messages);
  const projectSummary = extractProjectSummary(messages);
  
  return {
    conversationHistory,
    currentFiles: latestFiles,
    projectSummary,
    developmentHistory: extractDevelopmentSteps(messages)
  };
}
```

### 2. Sandbox Persistence

```typescript
// Enhanced sandbox management in src/inngest/utils.ts
export async function getOrCreateProjectSandbox(
  projectId: string,
  previousFiles?: Record<string, string>
): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { activeSandboxId: true, sandboxExpiresAt: true }
  });
  
  // Try to reuse existing sandbox
  if (project?.activeSandboxId && isActiveSandbox(project)) {
    return project.activeSandboxId;
  }
  
  // Create new sandbox and sync files
  const sandbox = await Sandbox.create("mragent-nextjs-test-2");
  
  if (previousFiles) {
    await syncFilesToSandbox(sandbox, previousFiles);
  }
  
  // Update project with new sandbox
  await prisma.project.update({
    where: { id: projectId },
    data: {
      activeSandboxId: sandbox.sandboxId,
      sandboxExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
    }
  });
  
  return sandbox.sandboxId;
}
```

### 3. Enhanced Agent Prompt

```typescript
// Modified prompt building in src/prompt.ts
export function buildContextualPrompt(projectContext?: ProjectContext): string {
  const basePrompt = PROMPT;
  
  if (!projectContext) return basePrompt;
  
  const contextSection = `
IMPORTANT: ITERATIVE DEVELOPMENT CONTEXT
You are continuing work on an existing project. Here is the context:

PROJECT SUMMARY:
${projectContext.projectSummary}

CONVERSATION HISTORY:
${projectContext.conversationHistory}

CURRENT PROJECT FILES:
${formatFilesForPrompt(projectContext.currentFiles)}

DEVELOPMENT HISTORY:
${projectContext.developmentHistory}

INSTRUCTIONS FOR ITERATIVE DEVELOPMENT:
1. ANALYZE the existing code structure and architecture
2. BUILD UPON the existing work - do not start from scratch
3. MAINTAIN consistency with established patterns and design
4. ONLY MODIFY files that need changes for the current request
5. PRESERVE existing functionality while adding new features
6. If files already exist, use readFiles to understand current state before modifying

`;

  return basePrompt + contextSection;
}
```

## Migration Strategy

### Step 1: Database Migration
1. Add new columns to Project table
2. Update Prisma schema
3. Generate and run migration

### Step 2: Backward Compatibility
1. Implement feature flags for gradual rollout
2. Maintain existing behavior for projects without context
3. Test thoroughly with existing projects

### Step 3: Gradual Rollout
1. Enable for new projects first
2. Gradually enable for existing projects
3. Monitor performance and adjust

## Expected Benefits

### 1. Improved User Experience
- Users can iteratively improve their projects
- Natural conversation flow for development
- Consistent code quality across iterations

### 2. Better Resource Utilization
- Reduced sandbox creation overhead
- Reuse of existing development environments
- Faster response times for follow-up requests

### 3. Enhanced AI Capabilities
- Context-aware code generation
- Better architectural consistency
- More sophisticated development workflows

## Potential Risks & Mitigation

### 1. Performance Impact
**Risk**: Fetching message history could slow down agent execution
**Mitigation**: 
- Implement efficient database queries with proper indexing
- Limit context size to recent messages (e.g., last 10-20 messages)
- Cache frequently accessed data

### 2. Sandbox Management Complexity
**Risk**: Managing persistent sandboxes could introduce reliability issues
**Mitigation**:
- Implement robust error handling and fallback mechanisms
- Add sandbox health checks
- Implement automatic cleanup procedures

### 3. Context Size Limitations
**Risk**: Large conversation histories could exceed AI model context limits
**Mitigation**:
- Implement intelligent context summarization
- Prioritize recent and relevant messages
- Implement context truncation strategies

## Success Metrics

### 1. User Experience Metrics
- Reduction in user frustration with iterative development
- Increased project completion rates
- Better user satisfaction scores

### 2. Technical Metrics
- Reduced sandbox creation overhead (target: 50% reduction)
- Improved code consistency scores
- Faster response times for follow-up requests

### 3. Business Metrics
- Increased user engagement and retention
- Higher project completion rates
- Reduced support tickets related to development issues

## Implementation Timeline

### Week 1-2: Foundation
- Database schema updates
- Basic message history retrieval
- Sandbox management utilities

### Week 3-4: Core Features
- Context builder implementation
- Enhanced agent prompt system
- Sandbox persistence logic

### Week 5-6: Integration & Testing
- End-to-end integration
- Comprehensive testing
- Performance optimization

### Week 7-8: Deployment & Monitoring
- Gradual rollout
- Performance monitoring
- Bug fixes and improvements

## Conclusion

This implementation will transform MRAgent from a one-shot code generator into a true iterative development assistant. By leveraging message history and persistent sandboxes, users will be able to build complex applications through natural conversation, making the platform significantly more powerful and user-friendly.

The proposed architecture maintains backward compatibility while adding sophisticated context awareness, ensuring a smooth transition for existing users while providing enhanced capabilities for new development workflows.