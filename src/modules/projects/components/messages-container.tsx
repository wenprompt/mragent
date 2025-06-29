import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { MessageCard } from "@/modules/projects/components/message-card";
import { MessageForm } from "./message-form";
import { useEffect, useRef } from "react";

interface Props {
  projectId: string;
}

export const MessagesContainer = ({ projectId }: Props) => {
  //for messages to scroll down to bottom
  const bottomRef = useRef<HTMLDivElement>(null);

  const trpc = useTRPC();

  //rename data to messages
  const { data: messages } = useSuspenseQuery(
    trpc.messages.getMany.queryOptions({ projectId: projectId })
  );

  useEffect(() => {
    const lastAssistantMessage = messages.findLast(
      (message) => message.role === "ASSISTANT"
    );

    if (lastAssistantMessage) {
      // Set active fragment
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [messages.length]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="pt-2 pr-1">
          {messages.map((message) => (
            <MessageCard
              key={message.id}
              content={message.content}
              role={message.role}
              fragment={message.fragment}
              createdAt={message.createdAt}
              isActiveFragment={false}
              onFragmentClick={() => {}}
              type={message.type}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="relative p-3 pt-1">
        {/* create a small white shadow */}
        <div className="absolute -top-6 left-0 right-0 h-6 bg-gradiant-to-b from-transparent to-background/70 pointer-events-none " />
        <MessageForm projectId={projectId} />
      </div>
    </div>
  );
};
