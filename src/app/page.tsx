import { ChatInterface } from "@/components/chat/ChatInterface";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { Header } from "@/components/Header";

export default function Home() {
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-3 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 grid grid-cols-[1fr_1fr] gap-4 min-h-0 overflow-hidden">
          {/* Dashboard Section - Left */}
          <div className="overflow-y-auto pr-2 max-h-full">
            <Dashboard />
          </div>

          {/* Chat Section - Right */}
          <div className="flex flex-col h-full min-h-0 overflow-hidden">
            <ChatInterface />
          </div>
        </div>
      </main>
    </div>
  );
}
