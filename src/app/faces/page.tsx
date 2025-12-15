import { Header } from "@/components/Header";
import { FaceViewPage } from "@/components/faces/FaceViewPage";

export default function Faces() {
    return (
        <div className="min-h-screen bg-background flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto">
                <FaceViewPage />
            </main>
        </div>
    );
}

