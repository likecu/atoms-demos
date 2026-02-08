"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface ClientReactPreviewProps {
    code: string;
    files?: Record<string, string>;
    className?: string;
}

/**
 * Client-side React Preview Component
 * 
 * Uses an iframe with Babel Standalone and Import Maps to compile and run React code 
 * entirely within the browser, bypassing the need for external bundlers like Sandpack.
 */
export default function ClientReactPreview({ code, files, className }: ClientReactPreviewProps) {
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [key, setKey] = useState(0); // For forcing re-render

    // Combine code prop and files prop
    const mainCode = code || (files && files['/App.js']) || (files && files['/App.tsx']) || '';

    useEffect(() => {
        setIsLoading(true);
        setError(null);

        // Generate the HTML for the iframe
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        border: "hsl(var(--border))",
                        input: "hsl(var(--input))",
                        ring: "hsl(var(--ring))",
                        background: "hsl(var(--background))",
                        foreground: "hsl(var(--foreground))",
                        primary: {
                            DEFAULT: "hsl(var(--primary))",
                            foreground: "hsl(var(--primary-foreground))",
                        },
                        secondary: {
                            DEFAULT: "hsl(var(--secondary))",
                            foreground: "hsl(var(--secondary-foreground))",
                        },
                        destructive: {
                            DEFAULT: "hsl(var(--destructive))",
                            foreground: "hsl(var(--destructive-foreground))",
                        },
                        muted: {
                            DEFAULT: "hsl(var(--muted))",
                            foreground: "hsl(var(--muted-foreground))",
                        },
                        accent: {
                            DEFAULT: "hsl(var(--accent))",
                            foreground: "hsl(var(--accent-foreground))",
                        },
                        popover: {
                            DEFAULT: "hsl(var(--popover))",
                            foreground: "hsl(var(--popover-foreground))",
                        },
                        card: {
                            DEFAULT: "hsl(var(--card))",
                            foreground: "hsl(var(--card-foreground))",
                        },
                    },
                    borderRadius: {
                        lg: "var(--radius)",
                        md: "calc(var(--radius) - 2px)",
                        sm: "calc(var(--radius) - 4px)",
                    },
                },
            },
        }
    </script>
    <style>
        :root {
            --background: 0 0% 100%;
            --foreground: 222.2 84% 4.9%;
            --card: 0 0% 100%;
            --card-foreground: 222.2 84% 4.9%;
            --popover: 0 0% 100%;
            --popover-foreground: 222.2 84% 4.9%;
            --primary: 222.2 47.4% 11.2%;
            --primary-foreground: 210 40% 98%;
            --secondary: 210 40% 96.1%;
            --secondary-foreground: 222.2 47.4% 11.2%;
            --muted: 210 40% 96.1%;
            --muted-foreground: 215.4 16.3% 46.9%;
            --accent: 210 40% 96.1%;
            --accent-foreground: 222.2 47.4% 11.2%;
            --destructive: 0 84.2% 60.2%;
            --destructive-foreground: 210 40% 98%;
            --border: 214.3 31.8% 91.4%;
            --input: 214.3 31.8% 91.4%;
            --ring: 222.2 84% 4.9%;
            --radius: 0.5rem;
        }
        .dark {
            --background: 222.2 84% 4.9%;
            --foreground: 210 40% 98%;
            --card: 222.2 84% 4.9%;
            --card-foreground: 210 40% 98%;
            --popover: 222.2 84% 4.9%;
            --popover-foreground: 210 40% 98%;
            --primary: 210 40% 98%;
            --primary-foreground: 222.2 47.4% 11.2%;
            --secondary: 217.2 32.6% 17.5%;
            --secondary-foreground: 210 40% 98%;
            --muted: 217.2 32.6% 17.5%;
            --muted-foreground: 215 20.2% 65.1%;
            --accent: 217.2 32.6% 17.5%;
            --accent-foreground: 210 40% 98%;
            --destructive: 0 62.8% 30.6%;
            --destructive-foreground: 210 40% 98%;
            --border: 217.2 32.6% 17.5%;
            --input: 217.2 32.6% 17.5%;
            --ring: 212.7 26.8% 83.9%;
        }
        body {
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: transparent;
            color: hsl(var(--foreground));
        }
        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background-color: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background-color: rgba(156, 163, 175, 0.5);
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background-color: rgba(107, 114, 128, 0.8);
        }
    </style>
    <!-- Import Map for dependencies -->
    <script type="importmap">
    {
        "imports": {
            "react": "https://esm.sh/react@18.2.0",
            "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
            "lucide-react": "https://esm.sh/lucide-react@0.263.1",
            "recharts": "https://esm.sh/recharts@2.12.0",
            "framer-motion": "https://esm.sh/framer-motion@10.16.4",
            "clsx": "https://esm.sh/clsx@2.0.0",
            "tailwind-merge": "https://esm.sh/tailwind-merge@1.14.0",
            "@radix-ui/react-slot": "https://esm.sh/@radix-ui/react-slot@1.0.2",
            "@radix-ui/react-icons": "https://esm.sh/@radix-ui/react-icons@1.3.0"
        }
    }
    </script>
    <!-- Babel Standalone for compiling JSX -->
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel" data-type="module">
        import React, { StrictMode } from "react";
        import { createRoot } from "react-dom/client";

        // Error Boundary Component
        class ErrorBoundary extends React.Component {
            constructor(props) {
                super(props);
                this.state = { hasError: false, error: null };
            }

            static getDerivedStateFromError(error) {
                return { hasError: true, error };
            }

            componentDidCatch(error, errorInfo) {
                console.error("Preview Error:", error, errorInfo);
                window.parent.postMessage({ type: 'PREVIEW_ERROR', message: error.message }, '*');
            }

            render() {
                if (this.state.hasError) {
                    return (
                        <div className="p-4 text-red-500 bg-red-50 rounded-md border border-red-200 m-4">
                            <h3 className="font-bold text-lg mb-2">Runtime Error</h3>
                            <pre className="text-sm whitespace-pre-wrap font-mono">{this.state.error?.message}</pre>
                        </div>
                    );
                }
                return this.props.children;
            }
        }

        // Handle console errors
        const originalConsoleError = console.error;
        console.error = (...args) => {
            originalConsoleError(...args);
            // Don't post message for every console error to avoid loops, 
            // but you could add logic here if needed
        };

        // User Code
        const userCode = \`${mainCode.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`;

        // Wrapper to execute user code
        async function run() {
            try {
                // We need to transform the user code first to handle imports/exports if not using data-type="module" completely
                // But since we are using type="text/babel" data-type="module", Babel should handle it?
                // Actually, inline modules with Babel standalone can be tricky.
                // A better approach often is to create a blob URL for the module, but let's try direct inline first.
                
                // For simplicity in this inline script, we'll try to use a Data URL for the user module import
                // Transpile user code locally first to check for syntax errors? 
                // No, Babel Standalone handles the script tag transformation.
                
                // Wait for Babel to be ready? It runs synchronously on scripts with text/babel
            } catch (err) {
                console.error("Setup Error:", err);
            }
        }
        
        // Since we can't easily "import" from a string in the same file without data URLs,
        // We will transform the user code to be a component variable instead of an export default.
        // OR we use a Blob URL for the user module.
        
        const blob = new Blob([userCode], { type: 'text/tsx' });
        const url = URL.createObjectURL(blob);
        
        // We need to use the Babel transform API to make it runnable if it has JSX
        // But we can just import it if we set up the iframe correctly? 
        // No, browsers don't natively understand JSX.
        
        // Strategy: 
        // 1. Transform user code using Babel.transform
        // 2. Create a Blob URL from the transformed code
        // 3. Import that Blob URL
        
        try {
            const output = Babel.transform(userCode, {
                presets: ['react'],
                filename: 'App.tsx',
            });
            
            // We need to handle 'import' statements in the user code.
            // Imports from 'react', 'lucide-react' etc are handled by importmap.
            // But 'export default' needs to be handled to get the component.
            
            const transiledCode = output.code;
            const blobUrl = URL.createObjectURL(new Blob([transiledCode], { type: 'application/javascript' }));
            
            import(blobUrl).then(module => {
                const App = module.default;
                if (!App) {
                    throw new Error("No default export found in the component code.");
                }
                
                const root = createRoot(document.getElementById("root"));
                root.render(
                    <StrictMode>
                        <ErrorBoundary>
                            <App />
                        </ErrorBoundary>
                    </StrictMode>
                );
            }).catch(err => {
                console.error("Module Import Error:", err);
                window.parent.postMessage({ type: 'PREVIEW_ERROR', message: err.message }, '*');
            });
            
        } catch (err) {
            console.error("Transpilation Error:", err);
            window.parent.postMessage({ type: 'PREVIEW_ERROR', message: err.message }, '*');
        }
    </script>
</body>
</html>
        `;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setIframeUrl(url);

        // Listen for messages from iframe
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'PREVIEW_ERROR') {
                setError(event.data.message);
                setIsLoading(false);
            }
        };
        window.addEventListener('message', handleMessage);

        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500); // Allow some time for loading

        return () => {
            URL.revokeObjectURL(url);
            window.removeEventListener('message', handleMessage);
            clearTimeout(timer);
        };
    }, [mainCode, key]);

    const handleRefresh = () => {
        setKey(prev => prev + 1);
    };

    return (
        <div className={className || "h-full w-full relative bg-white"}>
            {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                        <span className="text-xs text-zinc-500">Rendering...</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 z-20 p-6 bg-white/95 backdrop-blur-sm">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-red-800">Preview Error</h3>
                                <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap font-mono overflow-auto max-h-60">
                                    {error}
                                </pre>
                            </div>
                        </div>
                        <button
                            onClick={handleRefresh}
                            className="mt-4 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium rounded-md transition-colors flex items-center gap-2"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {iframeUrl && (
                <iframe
                    src={iframeUrl}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-downloads allow-pointer-lock"
                    title="Client React Preview"
                />
            )}
        </div>
    );
}
