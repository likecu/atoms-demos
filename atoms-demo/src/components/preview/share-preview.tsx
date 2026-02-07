"use client";

import {
    SandpackProvider,
    SandpackLayout,
    SandpackPreview as SandpackPreviewPanel,
} from "@codesandbox/sandpack-react";

interface SharePreviewProps {
    code: string;
}

export default function SharePreview({ code }: SharePreviewProps) {
    const files = {
        "/App.js": code,
    };

    return (
        <div className="h-screen w-screen bg-white">
            <SandpackProvider
                template="react"
                files={files}
                theme="light"
                customSetup={{
                    dependencies: {
                        "lucide-react": "latest",
                        "@radix-ui/react-icons": "latest",
                        "recharts": "latest",
                        "framer-motion": "latest",
                        "clsx": "latest",
                        "tailwind-merge": "latest",
                    },
                }}
            >
                <SandpackLayout className="h-full">
                    <SandpackPreviewPanel
                        showOpenInCodeSandbox={false}
                        showRefreshButton={false}
                        style={{ height: "100vh", width: "100%" }}
                    />
                </SandpackLayout>
            </SandpackProvider>
        </div>
    );
}
