# Task Breakdown: AI Message History Memory for Iterative Development

## Overview
This task breakdown converts the planning document into actionable development tasks for implementing AI message history memory and iterative development capabilities.

---

## Phase 1: Database Schema Enhancement

### 1.1 Database Schema Updates
- [ ] Add `activeSandboxId` and `sandboxExpiresAt` fields to Prisma schema (`prisma/schema.prisma`)
- [ ] Generate Prisma migration for new Project fields
- [ ] Run database migration to add new columns
- [ ] Update generated Prisma client types
- [ ] Verify new fields work correctly in development environment

---

## Phase 2: Sandbox Management System

### 2.1 Create Sandbox Management Utilities
- [ ] Create `src/inngest/sandbox-manager.ts` module
- [ ] Implement `isActiveSandbox` function to check sandbox validity
- [ ] Implement `getOrCreateProjectSandbox` function for sandbox reuse logic
- [ ] Implement `syncFilesToSandbox` function for file synchronization
- [ ] Implement `cleanupExpiredSandboxes` function for maintenance
- [ ] Add proper error handling and logging for sandbox operations

### 2.2 Sandbox Lifecycle Management
- [ ] Implement sandbox expiration time calculation (2 hours default)
- [ ] Add sandbox cleanup logic for project deletion
- [ ] Implement fallback mechanisms when sandbox becomes unavailable
- [ ] Add sandbox health check utilities

---

## Phase 3: Message History Context System

### 3.1 Create Context Builder Module
- [ ] Create `src/inngest/context-builder.ts` module
- [ ] Implement `buildProjectContext` function to combine all context
- [ ] Implement `getLatestProjectFiles` utility to extract current file state
- [ ] Implement `extractProjectSummary` utility to create project overview
- [ ] Implement `extractDevelopmentSteps` utility to track development history
- [ ] Add TypeScript interfaces for context structures

### 3.2 Message History Retrieval
- [ ] Create `getProjectMessageHistory` utility in `src/inngest/utils.ts`
- [ ] Implement efficient Prisma query for message history with fragments
- [ ] Add message history size limits (last 20 messages) to prevent context overflow
- [ ] Implement proper ordering and filtering of message history

### 3.3 Context Formatting for AI
- [ ] Implement `formatFilesForPrompt` function to format file structure for AI
- [ ] Implement conversation history formatting with proper role labels
- [ ] Add context size management and truncation logic
- [ ] Create helper functions for context string building

---

## Phase 4: Enhanced AI Agent Prompt System

### 4.1 Dynamic Prompt Generation
- [ ] Modify `src/prompt.ts` to add `buildContextualPrompt` function
- [ ] Implement conditional context inclusion based on message history
- [ ] Add iterative development instructions to prompt template
- [ ] Create context section formatting for prompts

### 4.2 Prompt Context Integration
- [ ] Implement conversation history inclusion in prompts
- [ ] Add current file state description in prompts
- [ ] Include development step summary in prompts
- [ ] Add instructions for analyzing existing code before modifications

---

## Phase 5: Enhanced Code Agent Function

### 5.1 Modify Core Agent Function
- [ ] Update `codeAgentFunction` in `src/inngest/functions.ts` to fetch message history
- [ ] Integrate context builder into agent function workflow
- [ ] Integrate sandbox manager into agent function for reuse logic
- [ ] Update agent function to use contextual prompts

### 5.2 Agent Integration Logic
- [ ] Add project ID extraction from message data
- [ ] Implement message history retrieval in agent function
- [ ] Add context building step before agent execution
- [ ] Update sandbox creation/reuse logic in agent workflow

### 5.3 Error Handling and Fallbacks
- [ ] Add error handling for context building failures
- [ ] Implement graceful fallback when sandbox operations fail
- [ ] Add error handling for message history retrieval failures
- [ ] Ensure agent can still work without context (backward compatibility)

---

## Phase 6: Database Integration Updates

### 6.1 Update Project Procedures
- [ ] Verify existing `messages.create` procedure works with new context system
- [ ] Add sandbox cleanup utilities to project procedures if needed
- [ ] Update project deletion to include sandbox cleanup
- [ ] Add proper transaction handling for message creation + sandbox updates

### 6.2 Prisma Query Optimization
- [ ] Optimize message history queries with proper includes
- [ ] Add database indexes for performance if needed
- [ ] Implement query result caching where appropriate
- [ ] Add proper error handling for database operations

---

## Phase 7: Development Environment Setup

### 7.1 Local Development Preparation
- [ ] Add appropriate logging for sandbox management operations
- [ ] Add logging for context building operations
- [ ] Implement development-friendly error messages
- [ ] Add console logging for debugging context flow

### 7.2 Deployment Preparation
- [ ] Create database migration script for production
- [ ] Verify all environment variables are properly configured
- [ ] Test deployment process in staging environment (if available)
- [ ] Update `CLAUDE.md` with new iterative development capabilities

---

## **🛑 MANUAL TESTING CHECKPOINT**

**The following tasks require manual testing and user validation before proceeding:**

### Phase 8: Manual Testing & Validation ⚠️ **REQUIRES USER INTERVENTION**

#### 8.1 Functionality Testing
- [ ] **USER TASK:** Test single message project creation (verify existing functionality still works)
- [ ] **USER TASK:** Test iterative development workflow manually (create project, then add features)
- [ ] **USER TASK:** Verify sandbox reuse works across multiple messages
- [ ] **USER TASK:** Test context preservation across user interactions
- [ ] **USER TASK:** Verify AI agent receives proper context from previous messages

#### 8.2 Edge Case Testing
- [ ] **USER TASK:** Test behavior when sandbox becomes unavailable/expired
- [ ] **USER TASK:** Test performance with projects that have many messages
- [ ] **USER TASK:** Test projects without previous context (new projects)
- [ ] **USER TASK:** Verify backward compatibility with existing projects

#### 8.3 Performance Validation
- [ ] **USER TASK:** Monitor message history query performance during testing
- [ ] **USER TASK:** Check response times for sandbox creation vs reuse
- [ ] **USER TASK:** Validate context building performance with various message sizes
- [ ] **USER TASK:** Report any performance issues discovered

---

## **Phase 9: Post-Testing Tasks** ⚠️ **CAN ONLY START AFTER PHASE 8 COMPLETION**

### 9.1 Issue Resolution (Based on Testing Results)
- [ ] Fix any bugs discovered during manual testing
- [ ] Optimize performance bottlenecks identified
- [ ] Improve error handling based on edge cases found
- [ ] Refine user experience based on testing feedback

### 9.2 Production Readiness
- [ ] Address any deployment issues found during testing
- [ ] Finalize logging and monitoring configuration
- [ ] Complete documentation updates based on final implementation
- [ ] Prepare release notes and deployment instructions

### 9.3 Final Quality Assurance
- [ ] Verify all reported issues have been resolved
- [ ] Confirm system stability under normal usage
- [ ] Validate final performance meets requirements
- [ ] Ensure documentation is complete and accurate

---

## Implementation Notes

### Development Approach
- Follow existing project patterns and conventions
- Use existing tools and libraries (Prisma, tRPC, Inngest)
- Maintain backward compatibility throughout
- Implement phases 1-7 can be done independently
- **Phases 8-9 require user involvement and cannot proceed automatically**

### Key Files to Modify
- `prisma/schema.prisma` - Add new Project fields
- `src/inngest/functions.ts` - Enhanced code agent function
- `src/prompt.ts` - Dynamic prompt generation
- `src/inngest/sandbox-manager.ts` - New sandbox utilities
- `src/inngest/context-builder.ts` - New context system
- `src/inngest/utils.ts` - Additional utilities

### Success Criteria for Phases 1-7
- [ ] All code compiles without errors
- [ ] Database migration runs successfully
- [ ] No runtime errors in development environment
- [ ] All new modules and functions are properly implemented
- [ ] Existing functionality remains unbroken at code level

### Success Criteria for Phases 8-9 (User-Dependent)
- [ ] Users can iteratively improve projects through conversation
- [ ] Sandbox resources are reused efficiently
- [ ] AI agent maintains context consistency across messages
- [ ] No regression in existing user-facing functionality
- [ ] Performance remains acceptable for user workflows

---

## Development Workflow

1. **Complete Phases 1-7** - These can be implemented independently
2. **Request User Testing** - User needs to manually test the implementation
3. **Wait for Testing Results** - Cannot proceed until user validates functionality
4. **Complete Phase 9** - Fix issues and finalize based on testing feedback

This structure ensures clear separation between what can be automated vs what requires human validation.