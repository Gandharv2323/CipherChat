import Header from "@/app/components/layout/Header";
import ChatClient from "@/app/components/chat/ChatClient";

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      <main className="flex-1 overflow-hidden">
        <ChatClient />
      </main>
    </div>
  );
}
