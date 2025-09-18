"use client";

import { useCryptoChat } from "@/hooks/use-crypto-chat";
import { KeyManagementPanel } from "@/app/components/chat/KeyManagementPanel";
import { ChatWindow } from "@/app/components/chat/ChatWindow";
import { Card, CardContent } from "@/components/ui/card";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

export default function ChatClient() {
  const {
    users,
    messages,
    cryptoLogs,
    activeUser,
    handleGenerateKeys,
    handleKeyExchange,
    handleSendMessage,
    switchUser,
  } = useCryptoChat();

  return (
    <Card className="h-full border-0 md:border rounded-none md:rounded-lg m-0 md:m-4 shadow-none md:shadow-lg">
      <CardContent className="p-0 h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={60} minSize={40}>
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              activeUser={activeUser}
              onSwitchUser={switchUser}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={40} minSize={30}>
            <KeyManagementPanel
              users={users}
              logs={cryptoLogs}
              onGenerateKeys={handleGenerateKeys}
              onKeyExchange={handleKeyExchange}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </CardContent>
    </Card>
  );
}
