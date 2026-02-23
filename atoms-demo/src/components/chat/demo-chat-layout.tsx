'use client'

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Sparkles, Loader2, Play, Code, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEMO_SCRIPT, DEMO_CODE } from '@/lib/demo-data';

export default function DemoChatLayout() {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [demoStage, setDemoStage] = useState(0); // 0: initial, 1: typing, 2: thinking, 3: coding, 4: done
    const [activeStep, setActiveStep] = useState(0);
    const [codeContent, setCodeContent] = useState('');
    const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isGenerating]);

    // Handle Demo Playback
    const startDemo = () => {
        if (demoStage > 0) return;

        setDemoStage(1);

        // 1. Simulate typing the user message
        const userMsg = DEMO_SCRIPT[0].content;
        let i = 0;
        const typingInterval = setInterval(() => {
            setInputValue(userMsg.substring(0, i + 1));
            i++;
            if (i >= userMsg.length) {
                clearInterval(typingInterval);

                // 2. Simulate sending
                setTimeout(() => {
                    setInputValue('');
                    setMessages([{ role: 'user', content: userMsg }]);
                    setIsGenerating(true);
                    setDemoStage(2);

                    // 3. Simulate AI initial response
                    setTimeout(() => {
                        setMessages([
                            { role: 'user', content: userMsg },
                            { role: 'assistant', content: DEMO_SCRIPT[1].content }
                        ]);

                        // 4. Start internal agent steps
                        simulateAgentWorkflow();
                    }, 1000);
                }, 800);
            }
        }, 50); // Typing speed
    };

    const simulateAgentWorkflow = () => {
        const steps = [
            { id: 1, name: 'Product Manager (GPT-4o)', desc: 'Analyzing requirements...', duration: 2000 },
            { id: 2, name: 'UI Designer (Claude 3.5 Sonnet)', desc: 'Creating design system...', duration: 2500 },
            { id: 3, name: 'Frontend Eng (DeepSeek V3)', desc: 'Writing Tailwind & HTML...', duration: 4000 }
        ];

        let currentStep = 0;

        const nextStep = () => {
            if (currentStep < steps.length) {
                setActiveStep(steps[currentStep].id);
                setTimeout(nextStep, steps[currentStep].duration);
                currentStep++;
            } else {
                // Done
                setActiveStep(0);
                setIsGenerating(false);
                setDemoStage(4);
                setCodeContent(DEMO_CODE);
            }
        };

        nextStep();
    };



    return (
        <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-900">
            {/* Sidebar: Chat */}
            <div className="w-[400px] flex-shrink-0 border-r border-slate-200 bg-white flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
                <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                            <ArrowLeft size={18} />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Sparkles className="text-white w-4 h-4" />
                            </div>
                            <span className="font-semibold tracking-tight">Atoms Demo</span>
                        </div>
                    </div>

                    {demoStage === 0 && (
                        <Button onClick={startDemo} size="sm" className="bg-green-500 hover:bg-green-600 text-white shadow-md">
                            <Play className="w-4 h-4 mr-1" />
                            开始演示
                        </Button>
                    )}
                </div>

                {/* Message Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                    {messages.length === 0 && demoStage === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-slate-300" />
                            </div>
                            <p>点击上方“开始演示”按钮体验</p>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 mt-1">
                                    <Sparkles size={16} className="text-violet-600" />
                                </div>
                            )}
                            <div className={`px-5 py-3.5 rounded-2xl max-w-[85%] shadow-sm ${msg.role === 'user'
                                ? 'bg-slate-900 text-white rounded-tr-sm'
                                : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                                }`}>
                                <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</p>
                            </div>
                        </div>
                    ))}

                    {isGenerating && (
                        <div className="flex gap-4 p-2">
                            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 animate-pulse">
                                <Loader2 size={16} className="text-violet-600 animate-spin" />
                            </div>
                            <div className="flex flex-col gap-2 w-full max-w-[85%]">
                                <div className="px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 rounded-tl-sm text-slate-600">
                                    <p className="text-[14px] font-medium mb-3 flex items-center">
                                        <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
                                        多智能体协作中...
                                    </p>

                                    {/* Status track */}
                                    <div className="space-y-3">
                                        {[
                                            { id: 1, name: 'Product Manager', detail: '拆解需求与功能点', badge: 'GPT-4o' },
                                            { id: 2, name: 'UI Designer', detail: '寻找最佳交互范式', badge: 'Claude 3.5' },
                                            { id: 3, name: 'Frontend Eng', detail: '编写响应式代码', badge: 'DeepSeek' }
                                        ].map(step => (
                                            <div key={step.id} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300 ${activeStep === step.id ? 'bg-white border-violet-200 shadow-sm' :
                                                activeStep > step.id ? 'bg-slate-50 border-slate-100' : 'bg-transparent border-transparent opacity-40'
                                                }`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${activeStep === step.id ? 'bg-violet-600 text-white animate-pulse' :
                                                        activeStep > step.id ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
                                                        }`}>
                                                        {activeStep > step.id ? '✓' : step.id}
                                                    </div>
                                                    <div>
                                                        <div className={`text-sm font-semibold ${activeStep === step.id ? 'text-violet-700' : 'text-slate-700'}`}>
                                                            {step.name}
                                                        </div>
                                                        <div className="text-xs text-slate-500">{step.detail}</div>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-medium px-2 py-1 bg-slate-100 text-slate-500 rounded-md">
                                                    {step.badge}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                </div>
                            </div >
                        </div >
                    )
                    }
                    <div ref={messagesEndRef} className="h-4" />
                </div >

                {/* Input Area */}
                < div className="p-4 bg-white border-t border-slate-100" >
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500 transition-all flex items-end">
                        <textarea
                            className="w-full bg-transparent resize-none outline-none py-2 px-3 text-slate-700 placeholder:text-slate-400 min-h-[44px] max-h-[120px]"
                            placeholder="描述你想构建的网站..."
                            value={inputValue}
                            readOnly
                            rows={1}
                        />
                        <button
                            disabled={true}
                            className={`p-3 rounded-xl ml-2 flex-shrink-0 transition-colors ${inputValue.length > 0 && !isGenerating
                                ? 'bg-slate-900 text-white hover:bg-slate-800'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            <Send size={18} />
                        </button>
                    </div >
                    <div className="text-center mt-3">
                        <span className="text-[11px] text-slate-400">Atoms Demo 演示模式 • AI 生成的内容可能不准确</span>
                    </div>
                </div >
            </div >

            {/* Main Area: Preview */}
            < div className="flex-1 bg-slate-100 flex flex-col relative inner-shadow" >
                {/* Topbar for Preview */}
                < div className="h-16 flex items-center justify-between px-6 bg-white/50 backdrop-blur-sm border-b border-slate-200" >
                    <div className="flex space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="flex bg-slate-200/50 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-all ${viewMode === 'preview' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Eye size={14} />
                            Preview
                        </button>
                        <button
                            onClick={() => setViewMode('code')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-all ${viewMode === 'code' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Code size={14} />
                            Code
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        {demoStage === 4 && (
                            <Button variant="outline" size="sm" className="hidden sm:flex border-slate-200 text-slate-600" asChild>
                                <Link href="/">立即注册体验真实功能</Link>
                            </Button>
                        )}
                    </div>
                </div >

                {/* Content Area */}
                <div className="flex-1 p-4 lg:p-8 overflow-hidden flex items-center justify-center" >
                    {
                        codeContent ? (
                            viewMode === 'preview' ? (
                                <div className="w-full h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative fade-in" >
                                    <iframe
                                        className="w-full h-full border-0"
                                        title="Demo Preview"
                                        sandbox="allow-scripts allow-forms"
                                        srcDoc={codeContent}
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-full bg-slate-900 rounded-2xl shadow-sm border border-slate-700 overflow-hidden relative fade-in flex flex-col">
                                    {/* Code 视图顶栏 */}
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700">
                                        <div className="flex items-center gap-2">
                                            <Code size={14} className="text-emerald-400" />
                                            <span className="text-sm text-slate-300 font-mono">index.html</span>
                                        </div>
                                        <span className="text-xs text-slate-500 font-mono">{codeContent.split('\n').length} lines</span>
                                    </div>
                                    {/* 代码内容 */}
                                    <div className="flex-1 overflow-auto">
                                        <pre className="p-4 text-sm leading-relaxed font-mono">
                                            <code>
                                                {codeContent.split('\n').map((line, i) => (
                                                    <div key={i} className="flex hover:bg-slate-800/50 -mx-4 px-4">
                                                        <span className="inline-block w-10 text-right mr-4 text-slate-600 select-none flex-shrink-0">{i + 1}</span>
                                                        <span className="text-slate-300 whitespace-pre">{line}</span>
                                                    </div>
                                                ))}
                                            </code>
                                        </pre>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400 animate-pulse-slow">
                                <div className="w-24 h-24 mb-6 rounded-3xl bg-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-slate-300" />
                                </div>
                                {demoStage === 0 && <p className="text-lg">等待大模型指令...</p>}
                                {demoStage > 0 && demoStage < 4 && <p className="text-lg">AI 正在构思页面结构...</p>}
                            </div>
                        )}
                </div >
            </div >

            <style>
                {`
        .inner-shadow { box-shadow: inset 0 2px 10px rgba(0,0,0,0.02); }
        .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        `}
            </style>
        </div>
    );
}
