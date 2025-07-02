# MRAgent - AI-Powered Code Generator

## Project Overview

MRAgent is a full-stack Next.js application that serves as an AI-powered code generation platform. Users can describe what they want to build, and the system generates working code using AI agents in sandboxed environments. The application combines modern web technologies with AI capabilities to create a comprehensive development assistant.

### Business Context

- **Purpose**: Enable users to generate functional code projects through natural language descriptions
- **Target Users**: Developers, prototypers, and anyone looking to quickly generate code scaffolding
- **Core Value**: Transforms text descriptions into working, deployable code fragments

### Key Features

- **Template-Driven Generation**: Pre-built prompts for common applications (Netflix clone, admin dashboard, kanban board, etc.)
- **Live Sandbox Preview**: Generated code runs in isolated E2B sandboxes with real-time preview URLs
- **Conversation History**: Full chat-like interface tracking user requests and AI responses
- **File Tree Visualization**: Generated projects displayed with expandable file structure

## Tech Stack

### Frontend

- **Framework**: Next.js 15.3.4 with App Router
- **React**: 19.0.0 with TypeScript
- **Styling**: Tailwind CSS 4.0 with custom design system
- **UI Components**: Radix UI primitives with shadcn/ui components
- **Theming**: next-themes for dark/light mode support
- **Icons**: Lucide React
- **Fonts**: Geist Sans & Geist Mono

### Backend & API

- **API Layer**: tRPC 11.4.2 for type-safe client-server communication
- **Database**: PostgreSQL with Prisma ORM 6.10.1
- **Background Jobs**: Inngest 3.39.2 for workflow orchestration
- **AI Integration**: @inngest/agent-kit 0.8.3 with OpenAI GPT-4.1
- **Code Execution**: E2B Code Interpreter 1.5.1 for sandboxed environments

### Development Tools

- **Language**: TypeScript 5.x with strict mode
- **Linting**: ESLint 9 with Next.js config
- **Package Manager**: npm with lock file
- **Build Tool**: Next.js with Turbopack for development

### External Services

- **Sandbox Provider**: E2B for isolated code execution
- **AI Model**: OpenAI GPT-4.1 via Inngest Agent Kit
- **Database**: PostgreSQL (connection via DATABASE_URL env var)

## Database Schema

The application uses a simple but effective schema designed around conversation-based code generation:

### Core Models

```typescript
// src/generated/prisma/schema.prisma
model Project {
  id        String   @id @default(uuid())
  name      String   // Auto-generated kebab-case name
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  messages Message[]
}

model Message {
  id        String      @id @default(uuid())
  content   String      // User prompt or AI response
  role      MessageRole // USER | ASSISTANT
  type      MessageType // RESULT | ERROR
  createdAt DateTime    @default(now())
  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  fragment  Fragment?   // Optional: only for successful AI responses
}

model Fragment {
  id         String  @id @default(uuid())
  messageId  String  @unique
  sandboxUrl String  // Live preview URL from E2B
  title      String  // Generated title
  files      Json    // Complete file structure as JSON
  createdAt  DateTime @default(now())
}
```

### Key Design Decisions

- **Cascade Deletes**: Removing a project cleans up all related messages and fragments
- **Optional Fragments**: Only successful AI responses generate code fragments
- **JSON File Storage**: Complete file trees stored as JSON for flexible querying
- **Enum-Driven Types**: Strong typing for message roles and types

## Project Architecture

### Directory Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── (home)/         # Home page group
│   ├── api/            # API routes (tRPC, Inngest)
│   └── projects/       # Project detail pages
├── components/         # Reusable UI components
│   ├── ui/            # shadcn/ui components
│   └── code-view/     # Code syntax highlighting
├── modules/           # Feature-based modules
│   ├── home/          # Project creation & listing
│   ├── projects/      # Project management
│   └── messages/      # Message handling
├── trpc/             # tRPC configuration
├── inngest/          # Background job functions
├── lib/              # Shared utilities
└── hooks/            # Custom React hooks
```

### Module Organization

Our codebase follows a feature-first approach with clear separation of concerns:

- **Feature-based structure**: Each module contains its own components, server procedures, and UI
- **Separation of concerns**: Clear boundaries between client/server code
- **Modular routing**: tRPC routers organized by feature domain

#### Example: Projects Module Structure

```
src/modules/projects/
├── components/          # Reusable UI components
│   ├── fragment-web.tsx    # Renders live sandbox preview
│   ├── message-card.tsx    # Individual chat message display
│   ├── message-form.tsx    # User input form
│   └── messages-container.tsx  # Chat message list
├── server/
│   └── procedures.ts       # tRPC API procedures
└── ui/views/
    └── project-view.tsx    # Main project page layout
```

#### Key Implementation Pattern

- **tRPC Procedures**: Located in `modules/[feature]/server/procedures.ts`
- **Auto-Generated Names**: Projects use `generateSlug(2, { format: "kebab" })`
- **Nested Data Creation**: Messages created with projects using Prisma relations
- **Background Job Triggers**: Inngest events sent after successful mutations

## Coding Standards & Conventions

### File Naming

- **Components**: PascalCase for React components (`ProjectForm.tsx`)
- **Files**: kebab-case for non-component files (`project-view.tsx`)
- **Directories**: kebab-case consistently

### Import Organization

1. External libraries (React, Next.js, third-party)
2. Internal utilities and shared code
3. Relative imports (components, types)
4. Separated by blank lines

### Component Patterns

Our components follow consistent patterns with real-world examples:

- **Client Components**: Explicitly marked with `"use client"`
- **Server Components**: Default, no directive needed
- **Form Handling**: React Hook Form + Zod validation
- **State Management**: React Query for server state, React hooks for local state
- **Error Handling**: tRPC error boundaries with toast notifications

#### Form Implementation Standards

- **React Hook Form + Zod**: All forms use `zodResolver` for validation
- **tRPC Mutations**: Use `mutationOptions` with `onSuccess`/`onError` handlers
- **Keyboard Shortcuts**: Cmd/Ctrl+Enter for form submission
- **Loading States**: Always provide visual feedback during async operations
- **Toast Notifications**: Use Sonner for user feedback on errors/success

### TypeScript Usage

- **Strict mode**: Enabled with comprehensive type checking
- **Schema Validation**: Zod schemas for all data validation
- **Type Safety**: Full end-to-end type safety via tRPC
- **No any**: Avoid any types, prefer proper typing

### Styling Conventions

- **Tailwind-first**: Utility classes for styling
- **Component Variants**: class-variance-authority for component APIs
- **Design System**: Consistent spacing, colors, and typography
- **Responsive Design**: Mobile-first approach

## Custom Utility Patterns

### Core Utilities

Key utility functions that power the application:

- **`convertFilesToTreeItems`** (`src/lib/utils.ts`): Converts flat file records to nested tree structure for UI display
- **`lastAssistantTextMessageContent`** (`src/inngest/utils.ts`): Extracts completion markers from AI agent responses
- **`createTRPCContext`** (`src/trpc/init.ts`): Cached context creation using React cache
- **`cn`** (`src/lib/utils.ts`): Standard Tailwind class merging utility

## Development Workflow

### Available Commands

```bash
# Development
npm run dev          # Start dev server with Turbopack
npx inngest-cli@latest dev  # Start Inngest dev server (port 8288)

# Production
npm run build        # Build for production
npm run start        # Start production server

# Quality
npm run lint         # Run ESLint
```

### Environment Setup

1. **Database**: Ensure PostgreSQL connection via `DATABASE_URL`
2. **Inngest**: Local development server required for background jobs
3. **E2B**: API key needed for sandbox creation
4. **OpenAI**: API key required for AI agent functionality

### Development Flow

1. **Database Changes**: Modify `prisma/schema.prisma` → run migrations
2. **API Changes**: Update tRPC procedures in `modules/*/server/procedures.ts`
3. **UI Changes**: Components in `modules/*/ui/` or `components/`
4. **Background Jobs**: Inngest functions in `src/inngest/functions.ts`

## Integration Points

### tRPC API Structure

```typescript
// Main router combining feature routers
appRouter = {
  projects: projectsRouter, // CRUD operations for projects
  messages: messagesRouter, // Message handling
};
```

### Background Job Flow

AI code generation workflow (`src/inngest/functions.ts`):

1. **Sandbox Creation**: E2B sandbox with Next.js template
2. **Agent Configuration**: GPT-4.1 with terminal, file read/write tools
3. **Code Generation**: Agent executes up to 15 iterations until completion
4. **Live Preview**: Sandbox serves app on port 3000
5. **Database Storage**: Files and preview URL saved as Fragment

#### Key Components

- **Agent Tools**: `terminal`, `createOrUpdateFiles`, `readFiles`
- **Completion Detection**: Looks for `<task_summary>` in AI responses
- **Error Handling**: Creates ERROR type messages on failure
- **Network Routing**: Continues until summary is generated or max iterations

### External Dependencies

- **E2B Sandbox**: Isolated code execution environment
- **Inngest**: Reliable background job processing
- **OpenAI**: AI model for code generation
- **Prisma**: Type-safe database operations

## Performance Guidelines

### Client-Side Optimization

- **Code Splitting**: Automatic via Next.js App Router
- **React Query**: Efficient server state management with caching
- **Component Lazy Loading**: Dynamic imports where appropriate
- **Image Optimization**: Next.js Image component

### Server-Side Optimization

- **tRPC Batching**: Automatic request batching
- **Database Queries**: Optimized Prisma queries with proper indexing
- **Caching**: React cache for context creation
- **Background Processing**: Async job handling via Inngest

## Security Guidelines

### Data Protection

- **Input Validation**: Zod schemas for all user inputs
- **SQL Injection**: Prisma ORM prevents direct SQL injection
- **XSS Prevention**: React's built-in escaping + proper sanitization
- **CSRF**: Next.js built-in protection

### Sandbox Security

- **Isolated Execution**: E2B provides containerized environments
- **Limited Scope**: Code execution contained within sandboxes
- **No Direct System Access**: All operations through controlled APIs

### Authentication Ready

- **Context Structure**: tRPC context prepared for user authentication
- **Database Schema**: Ready for user relationships (currently using placeholder)

## Unique Architectural Decisions

### 1. Prisma Client Generation to src/generated/

Unlike typical setups, our Prisma client generates to `src/generated/prisma` for better monorepo compatibility:

```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}
```

### 2. Feature-Based Module Organization

Each feature is self-contained with clear boundaries:

- `modules/[feature]/server/` - tRPC procedures
- `modules/[feature]/ui/` - Page layouts and views
- `modules/[feature]/components/` - Reusable components

### 3. Template-Driven Code Generation

Pre-built prompts in `src/modules/home/constants.ts` with 8 popular app types (Netflix, admin dashboard, kanban board, file manager, etc.)

### 4. Cached tRPC Context

Uses React's `cache()` for efficient context creation, ready for auth integration

### 5. JSON File Storage Strategy

Complete file trees stored as JSON in database, converted to tree structure for UI display

## AI Agent Configuration

### Agent Tools

Three specialized tools for E2B sandbox interaction:

- **`terminal`**: Execute shell commands with stdout/stderr capture
- **`createOrUpdateFiles`**: Write files to sandbox and track in network state
- **`readFiles`**: Read existing files from sandbox filesystem

### Agent State Management

- **Completion Detection**: Monitors for `<task_summary>` markers in responses
- **File Tracking**: Maintains file tree in network state across iterations
- **Error Handling**: Captures and returns command failures with context

## Project-Specific Best Practices

### Development Patterns

- **Error Handling**: Always use `onError` in mutations with toast notifications
- **Form Validation**: Share Zod schemas between client/server for consistency
- **Component Structure**: Compose focused components rather than monolithic ones
- **Loading States**: Provide visual feedback for all async operations
- **Keyboard UX**: Implement Cmd/Ctrl+Enter for form submissions

### Code Organization

- **File Display**: Use `CodeView` component for syntax highlighting
- **Tree Conversion**: Use `convertFilesToTreeItems` for file structure display
- **Template System**: Leverage `PROJECT_TEMPLATES` for user onboarding
- **Database Operations**: Use Prisma nested operations for related data
- **Background Jobs**: Trigger Inngest events after successful mutations

### Key File References

- **Forms**: `src/modules/home/ui/components/project-form.tsx`
- **Code Display**: `src/components/code-view/index.tsx`
- **Templates**: `src/modules/home/constants.ts`
- **Agent Logic**: `src/inngest/functions.ts`
- **AI Prompt**: `src/prompt.ts`

### 🔌 MCP Server Usage

#### Context7 MCP Server

- always use Context7 MCP to find updated documentation and examples for the relevant libraries and packages before coding. Do not start coding without this context

#### Neon MCP Server

- the database for this project is currently on Project ID: `shiny-wind-21173832`. Please use this MCP to access the database if there is a need to do any sql queries to create new features or do any tests

### 🔄 Project Awareness & Context

- **Always read `PLANNING.md`** at the start of a new conversation to understand the requirements of the feature that we are building
- **Check `TASK.md`** before starting a new task.
- **Use consistent naming conventions, file structure, and architecture patterns** as the main project structure as defined in this file.

### ✅ Task Completion

- **Mark completed tasks in `TASK.md`** immediately after finishing them.

### 📚 Documentation & Explainability

- **Update `README.md`** when new features are added, dependencies change, or setup steps are modified.
- **Comment non-obvious code** and ensure everything is understandable to a mid-level developer.
- When writing complex logic, **add an inline `# Reason:` comment** explaining the why, not just the what.

### 🧠 AI Behavior Rules

- **Never assume missing context. Ask questions if uncertain.**
- **Never hallucinate libraries or functions** – only use known, verified Python packages.
- **Always confirm file paths and module names** exist before referencing them in code or tests.
- **Never delete or overwrite existing code** unless explicitly instructed to or if part of a task from `TASK.md`.
