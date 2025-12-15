import { Suspense } from "react";
import { Header } from "@/components/Header";
import { DossierPage } from "@/components/dossiers/DossierPage";

function DossierPageWrapper() {
    return <DossierPage />;
}

export default function Dossiers() {
    return (
        <div className="min-h-screen bg-background flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1">
                <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                    <DossierPageWrapper />
                </Suspense>
            </main>
        </div>
    );
}






