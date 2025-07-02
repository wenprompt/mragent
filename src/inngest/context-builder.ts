import { prisma } from "@/lib/db";

export interface ProjectContext {
  conversationHistory: string;
  currentFiles: Record<string, string>;
  projectSummary: string;
  developmentHistory: string;
  hasContext: boolean;
}

export interface MessageWithFragment {
  id: string;
  content: string;
  role: "USER" | "ASSISTANT";
  type: "RESULT" | "ERROR";
  createdAt: Date;
  fragment?: {
    id: string;
    sandboxUrl: string;
    title: string;
    files: Record<string, string>;
    createdAt: Date;
  } | null;
}

export async function getProjectMessageHistory(projectId: string, limit: number = 20): Promise<MessageWithFragment[]> {
  const messages = await prisma.message.findMany({
    where: {
      projectId: projectId
    },
    include: {
      fragment: true
    },
    orderBy: {
      createdAt: "asc"
    },
    take: limit
  });

  return messages.map(msg => ({
    ...msg,
    fragment: msg.fragment ? {
      id: msg.fragment.id,
      sandboxUrl: msg.fragment.sandboxUrl,
      title: msg.fragment.title,
      files: msg.fragment.files as Record<string, string>,
      createdAt: msg.fragment.createdAt
    } : null
  }));
}

export function buildProjectContext(messages: MessageWithFragment[]): ProjectContext {
  if (messages.length <= 1) {
    return {
      conversationHistory: "",
      currentFiles: {},
      projectSummary: "",
      developmentHistory: "",
      hasContext: false
    };
  }

  const conversationHistory = messages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n\n');
  
  const latestFiles = getLatestProjectFiles(messages);
  const projectSummary = extractProjectSummary(messages);
  const developmentHistory = extractDevelopmentSteps(messages);
  
  return {
    conversationHistory,
    currentFiles: latestFiles,
    projectSummary,
    developmentHistory,
    hasContext: true
  };
}

export function getLatestProjectFiles(messages: MessageWithFragment[]): Record<string, string> {
  const messagesWithFragments = messages.filter(msg => 
    msg.fragment && 
    msg.role === "ASSISTANT" && 
    msg.type === "RESULT"
  );

  if (messagesWithFragments.length === 0) {
    return {};
  }

  const latestMessage = messagesWithFragments[messagesWithFragments.length - 1];
  const files = latestMessage.fragment?.files as Record<string, string> || {};
  
  return files;
}

export function extractProjectSummary(messages: MessageWithFragment[]): string {
  const userMessages = messages.filter(msg => msg.role === "USER");
  
  if (userMessages.length === 0) {
    return "No project description available.";
  }

  const firstRequest = userMessages[0].content;
  const projectType = inferProjectType(firstRequest);
  const features = extractFeatures(messages);
  
  return `Project Type: ${projectType}\nInitial Request: ${firstRequest}\nFeatures Added: ${features.join(", ")}`;
}

export function extractDevelopmentSteps(messages: MessageWithFragment[]): string {
  const steps: string[] = [];
  
  messages.forEach((msg, index) => {
    if (msg.role === "USER") {
      steps.push(`Step ${Math.floor(index / 2) + 1}: User requested - ${msg.content.substring(0, 100)}${msg.content.length > 100 ? "..." : ""}`);
    } else if (msg.role === "ASSISTANT" && msg.type === "RESULT" && msg.fragment) {
      const fileCount = Object.keys(msg.fragment.files as Record<string, string> || {}).length;
      steps.push(`  - AI generated ${fileCount} files with working code`);
    }
  });
  
  return steps.join('\n');
}

export function formatFilesForPrompt(files: Record<string, string>): string {
  if (Object.keys(files).length === 0) {
    return "No existing files in the project.";
  }

  const fileList = Object.keys(files)
    .map(path => `- ${path}`)
    .join('\n');
  
  return `Current project files:\n${fileList}\n\nTotal files: ${Object.keys(files).length}`;
}

function inferProjectType(firstRequest: string): string {
  const request = firstRequest.toLowerCase();
  
  if (request.includes("netflix") || request.includes("movie") || request.includes("streaming")) {
    return "Streaming/Media Application";
  } else if (request.includes("dashboard") || request.includes("admin")) {
    return "Admin Dashboard";
  } else if (request.includes("kanban") || request.includes("todo") || request.includes("task")) {
    return "Task Management Application";
  } else if (request.includes("blog") || request.includes("cms")) {
    return "Content Management System";
  } else if (request.includes("ecommerce") || request.includes("shop") || request.includes("store")) {
    return "E-commerce Application";
  } else if (request.includes("chat") || request.includes("messaging")) {
    return "Communication Application";
  } else if (request.includes("portfolio") || request.includes("landing")) {
    return "Portfolio/Landing Page";
  } else {
    return "Web Application";
  }
}

function extractFeatures(messages: MessageWithFragment[]): string[] {
  const features: string[] = [];
  
  messages.forEach(msg => {
    if (msg.role === "USER") {
      const content = msg.content.toLowerCase();
      
      if (content.includes("add") || content.includes("create")) {
        if (content.includes("page")) features.push("New Page");
        if (content.includes("component")) features.push("New Component");
        if (content.includes("feature")) features.push("New Feature");
        if (content.includes("login") || content.includes("auth")) features.push("Authentication");
        if (content.includes("database") || content.includes("api")) features.push("Backend/API");
        if (content.includes("style") || content.includes("theme")) features.push("Styling/Theme");
      }
    }
  });
  
  return features.length > 0 ? features : ["Initial Implementation"];
}